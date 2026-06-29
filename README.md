# FinanceOS Private

Aplicação web privada para organização financeira pessoal/profissional, criada com Next.js App Router, TypeScript, Tailwind CSS e camada de dados preparada para Supabase.

## O que esta versão entrega

- Login privado com modo local e estrutura para Supabase Auth.
- Dashboard com saldo, entradas, gastos, resultado mensal e gastos por categoria.
- CRUD básico de entradas e gastos com validação, edição e exclusão.
- Tela geral de transações com busca, filtros, ordenação e totalizadores.
- Calculadora por Hora com resultado por hora, dia, semana e mês.
- Configurações de nome, moeda principal e tema.
- Layout responsivo com sidebar, dark mode padrão e estética SaaS premium.

## Estrutura

```txt
src/app
  login
  (private)/dashboard
  (private)/expenses
  (private)/income
  (private)/transactions
  (private)/hourly-calculator
  (private)/settings
src/components
  finance
  layout
  providers
  ui
src/lib
  data
  supabase
  finance.ts
  types.ts
supabase/schema.sql
```

## Instalação

```bash
pnpm install
```

Também é possível usar `npm install` se preferir npm, mas o projeto inclui `pnpm-lock.yaml`.

## Rodar localmente

```bash
pnpm run dev
```

Depois acesse `http://localhost:3000`.

No modo local, use qualquer email válido e uma senha com pelo menos 6 caracteres. Os dados ficam salvos no `localStorage` do navegador.

## Variáveis de ambiente

Crie um arquivo `.env.local` baseado em `.env.example`.

```env
NEXT_PUBLIC_APP_NAME="FinanceOS Private"
NEXT_PUBLIC_AUTH_PROVIDER=local
NEXT_PUBLIC_DATA_SOURCE=local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Para ativar Supabase:

```env
NEXT_PUBLIC_AUTH_PROVIDER=supabase
NEXT_PUBLIC_DATA_SOURCE=supabase
NEXT_PUBLIC_SUPABASE_URL="https://seu-projeto.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sua-chave-anon"
```

Não coloque `service_role` no front-end. Use apenas a anon key pública com Row Level Security ativo.

## Conectar Supabase

1. Crie um projeto no Supabase.
2. Ative Email/Password em Authentication.
3. Execute o conteúdo de `supabase/schema.sql` no SQL Editor.
4. Crie usuários em Authentication ou via fluxo próprio futuro.
5. Configure as variáveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
6. Altere `NEXT_PUBLIC_AUTH_PROVIDER` e `NEXT_PUBLIC_DATA_SOURCE` para `supabase`.

As tabelas principais são:

- `profiles`: perfil privado do usuário.
- `transactions`: entradas e gastos.
- `categories`: categorias por usuário.

As policies RLS garantem que cada usuário acesse apenas linhas com o próprio `auth.uid()`.

## Deploy na Vercel

1. Envie o projeto para um repositório Git.
2. Importe o repositório na Vercel.
3. Configure as mesmas variáveis de ambiente usadas localmente.
4. Use o build padrão do Next.js.

Com modo local, a aplicação funciona sem banco, mas os dados ficam restritos ao navegador. Para produção real, use Supabase.

## Scripts

```bash
pnpm run dev
pnpm run build
pnpm run start
pnpm run typecheck
```

## Próximos módulos possíveis

- Categorias editáveis pela interface.
- Relatórios mensais e exportação CSV.
- Conversão cambial manual ou com taxa fixa.
- Metas financeiras e recorrências.
- Middleware Supabase com cookies server-side para proteção mais rígida em produção.
