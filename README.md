# FinanceOS Private

Aplicação web privada para organização financeira pessoal/profissional, criada com Next.js App Router, TypeScript, Tailwind CSS e uma camada de dados preparada para Supabase.

## O que esta versão entrega

- Login privado com modo local e estrutura pronta para Supabase Auth.
- Dashboard por grupo ou carteira individual.
- CRUD básico de entradas e gastos com validação, edição e exclusão.
- Registro de autoria: quem criou, editou ou excluiu cada movimentação.
- Filtros por tipo, moeda, categoria, descrição e carteira.
- Indicador de quanto guardar com base em entradas, despesas e sobra mensal.
- Calculadora por Hora com cálculo por valor recebido ou por valor/hora.
- Aba Horas trabalhadas com calendário, ponto manual e fechamento automático às 20:00 no horário da Bélgica.
- Tema escuro/claro, layout responsivo e visual SaaS premium.

## Usuários e grupos

No modo local, use qualquer senha com 6 ou mais caracteres. A tela de login já traz atalhos com a senha `financeos123`.

- `admin@financeos.local` — Usuário master — Grupo A
- `eduarda@financeos.local` — Eduarda Bonalume — Grupo A
- `pedro@financeos.local` — Pedro Cabral do Roscão — Grupo B
- `gabrielle@financeos.local` — Gabrielle — Grupo B

Cada grupo compartilha as movimentações do próprio grupo. Cada transação também pertence a uma carteira individual, permitindo análise separada por usuário.

## Estrutura

```txt
src/app
  login
  (private)/dashboard
  (private)/expenses
  (private)/income
  (private)/transactions
  (private)/hourly-calculator
  (private)/work-hours
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
  users.ts
supabase/schema.sql
```

## Instalação

```bash
pnpm install
```

Também é possível usar `npm install`, mas o projeto inclui `pnpm-lock.yaml`.

## Rodar localmente

```bash
pnpm run dev
```

Depois acesse `http://localhost:3000`.

No modo local, os dados ficam no `localStorage` do navegador e são separados por grupo.

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

Use `.env.production.example` como referência para configurar as variáveis na Vercel.

Não coloque `service_role` no front-end. Use apenas a anon key pública com Row Level Security ativo.

## Conectar Supabase

1. Crie um projeto no Supabase.
2. Ative Email/Password em Authentication.
3. Execute `supabase/schema.sql` no SQL Editor.
4. Crie os usuários em Authentication.
5. Configure as variáveis na Vercel e no `.env.local`.
6. Altere `NEXT_PUBLIC_AUTH_PROVIDER` e `NEXT_PUBLIC_DATA_SOURCE` para `supabase`.

O arquivo `supabase/USERS.md` contém os logins sugeridos e os metadados de grupo/carteira para cada pessoa.

Para emails diferentes dos exemplos locais, preencha os metadados do usuário no Supabase:

```json
{
  "app_user_id": "eduarda-bonalume",
  "name": "Eduarda Bonalume",
  "group_id": "group-a",
  "group_name": "Grupo A",
  "role": "member"
}
```

Use `group-a` para Usuário master + Eduarda Bonalume e `group-b` para Pedro Cabral do Roscão + Gabrielle.

## Banco de dados

- `finance_groups`: grupos financeiros.
- `profiles`: perfil do usuário autenticado.
- `transactions`: entradas e gastos com grupo, carteira e autoria.
- `categories`: categorias por grupo.
- `audit_entries`: histórico de criação, edição e exclusão.
- `time_entries`: registros de horas trabalhadas por usuário.

As policies RLS restringem leitura e escrita ao grupo do usuário autenticado.

## Deploy na Vercel

1. Envie o projeto para o GitHub.
2. Importe o repositório na Vercel.
3. Configure as variáveis de ambiente.
4. Use o build padrão do Next.js.

Com modo local, a aplicação funciona sem banco, mas os dados ficam restritos ao navegador de cada pessoa. Para várias pessoas compartilharem dados reais, use Supabase.

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
- Permissões avançadas por papel de usuário.
