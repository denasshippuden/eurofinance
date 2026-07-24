import { NextResponse, type NextRequest } from "next/server";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { createClient } from "@supabase/supabase-js";
import { AUTH_COOKIE, AUTH_USER_COOKIE, type AuthUser } from "@/lib/auth";
import { aiFinancialAnalysisSchema, aiFinancialSummarySchema } from "@/lib/ai-financial-analysis";
import { resolveAppUser } from "@/lib/users";

export const runtime = "nodejs";

const defaultModel = "gpt-5.1";
const authProviderEnvKey = ["NEXT", "PUBLIC", "AUTH", "PROVIDER"].join("_");
const supabaseUrlEnvKey = ["NEXT", "PUBLIC", "SUPABASE", "URL"].join("_");
const supabaseAnonKeyEnvKey = ["NEXT", "PUBLIC", "SUPABASE", "ANON", "KEY"].join("_");

const systemPrompt = `
Voce e um assistente financeiro educacional para o EuroFinance.
Responda sempre em portugues do Brasil.
Use somente os totais agregados recebidos. Nao solicite nem infira nomes, bancos, documentos, contas, cartoes ou historico de transacoes.
Produza conteudo educacional estruturado, sem prometer retorno, sem executar investimentos e sem recomendar acao, fundo, criptomoeda, corretora ou produto especifico.
Use apenas categorias genericas de organizacao financeira.
Se o saldo mensal for negativo, priorize equilibrar o orcamento antes de qualquer exemplo de alocacao.
Se a reserva de emergencia for insuficiente, priorize fortalecer a reserva.
Se houver dividas, destaque a organizacao e reducao de dividas antes de investimentos.
Nao invente taxas, rentabilidades atuais, indices, precos ou condicoes de mercado.
Os proximos passos devem ser curtos, aplicaveis e prudentes.
Inclua obrigatoriamente um disclaimer financeiro claro no campo disclaimer.
`.trim();

function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

function getStringMetadata(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getRoleMetadata(metadata: Record<string, unknown> | null | undefined) {
  const role = getStringMetadata(metadata, "role");
  return role === "master" || role === "member" ? role : undefined;
}

function decodeCookieValue(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

function getLocalAuthUser(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(AUTH_COOKIE)?.value);

  if (!hasSession) {
    return null;
  }

  const email = decodeCookieValue(request.cookies.get(AUTH_USER_COOKIE)?.value) ?? "admin@financeos.local";
  return resolveAppUser(email);
}

async function getSupabaseAuthUser(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : undefined;
  const supabaseUrl = process.env[supabaseUrlEnvKey];
  const supabaseAnonKey = process.env[supabaseAnonKeyEnvKey];

  if (!token || !supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user?.email) {
    return null;
  }

  const metadata = data.user.user_metadata as Record<string, unknown> | null | undefined;

  return resolveAppUser(data.user.email, getStringMetadata(metadata, "name"), {
    id: getStringMetadata(metadata, "app_user_id"),
    groupId: getStringMetadata(metadata, "group_id"),
    groupName: getStringMetadata(metadata, "group_name"),
    role: getRoleMetadata(metadata)
  });
}

async function getAuthenticatedUser(request: NextRequest): Promise<AuthUser | null> {
  if (process.env[authProviderEnvKey] === "supabase") {
    const supabaseUser = await getSupabaseAuthUser(request);

    if (supabaseUser || process.env.NODE_ENV === "production") {
      return supabaseUser;
    }

    return getLocalAuthUser(request);
  }

  return getLocalAuthUser(request);
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return jsonError(401, "Sessao invalida.");
  }

  if (user.role !== "master") {
    return jsonError(403, "Acesso nao autorizado.");
  }

  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return jsonError(400, "Solicitacao invalida.");
  }

  const body = aiFinancialSummarySchema.safeParse(rawBody);

  if (!body.success) {
    return jsonError(400, "Solicitacao invalida.");
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return jsonError(500, "Assistente indisponivel no momento.");
  }

  const openai = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL?.trim() || defaultModel;

  try {
    const response = await openai.responses.parse({
      model,
      instructions: systemPrompt,
      input: JSON.stringify({
        contexto: "Resumo financeiro agregado ja calculado pelo EuroFinance.",
        dados: body.data
      }),
      text: {
        format: zodTextFormat(aiFinancialAnalysisSchema, "financial_analysis")
      },
      store: false,
      reasoning: { effort: "low" },
      background: false,
      parallel_tool_calls: false,
      max_output_tokens: 1400
    });

    if (!response.output_parsed) {
      return jsonError(500, "Nao foi possivel gerar a analise.");
    }

    return NextResponse.json({ analysis: response.output_parsed });
  } catch (error) {
    console.error("AI financial analysis failed", error);
    return jsonError(500, "Nao foi possivel gerar a analise.");
  }
}
