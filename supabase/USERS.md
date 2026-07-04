# Usuários para produção

Crie os usuários em **Supabase > Authentication > Users > Add user**.

## Logins sugeridos

Defina uma senha temporária forte para cada pessoa e marque o email como confirmado, se quiser liberar acesso imediato.

| Pessoa | Email sugerido | Grupo | Papel | App user id |
| --- | --- | --- | --- | --- |
| Usuário master | `admin@financeos.local` | Grupo A | `master` | `master-user` |
| Eduarda Bonalume | `eduarda@financeos.local` | Grupo A | `member` | `eduarda-bonalume` |
| Pedro Cabral do Roscão | `pedro@financeos.local` | Grupo B | `member` | `pedro-cabral-roscao` |
| Gabrielle | `gabrielle@financeos.local` | Grupo B | `member` | `gabrielle` |

Se preferir usar emails reais, mantenha os metadados abaixo para o sistema saber o grupo e a carteira.

## Metadata por usuário

### Eduarda Bonalume

```json
{
  "app_user_id": "eduarda-bonalume",
  "name": "Eduarda Bonalume",
  "group_id": "group-a",
  "group_name": "Grupo A",
  "role": "member"
}
```

### Pedro Cabral do Roscão

```json
{
  "app_user_id": "pedro-cabral-roscao",
  "name": "Pedro Cabral do Roscão",
  "group_id": "group-b",
  "group_name": "Grupo B",
  "role": "member"
}
```

### Gabrielle

```json
{
  "app_user_id": "gabrielle",
  "name": "Gabrielle",
  "group_id": "group-b",
  "group_name": "Grupo B",
  "role": "member"
}
```

### Usuário master

```json
{
  "app_user_id": "master-user",
  "name": "Usuário master",
  "group_id": "group-a",
  "group_name": "Grupo A",
  "role": "master"
}
```

## Variáveis na Vercel

Em **Vercel > Project > Settings > Environment Variables**, configure:

```env
NEXT_PUBLIC_AUTH_PROVIDER=supabase
NEXT_PUBLIC_DATA_SOURCE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_ANON_KEY
```

Depois faça um novo deploy.
