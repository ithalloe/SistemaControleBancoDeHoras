# Controle de Jornada e Demandas

App web (React + TypeScript + Vite) para controle de jornada com banco de horas,
validações da CLT (limite de 2h extras/dia e 11h de interjornada) e um quadro de
demandas. Autenticação com Supabase (e-mail/senha) e dados na nuvem (Postgres),
sincronizados entre dispositivos.

## Requisitos

- Node.js 20+ (recomendado 22/24)
- Uma conta no [Supabase](https://supabase.com) (tier gratuito atende)

## 1. Configurar o Supabase

1. Crie um projeto novo no Supabase.
2. Em **SQL Editor**, cole e execute o conteúdo de [`supabase/schema.sql`](supabase/schema.sql).
   Isso cria as tabelas `pontos`, `demandas` e `config` com **Row Level Security**
   (cada usuário só acessa os próprios dados).
3. Em **Authentication > Providers**, mantenha o provedor de e-mail ativo.
   - Para uso pessoal, você pode desligar a confirmação de e-mail em
     **Authentication > Sign In / Providers > Email** para entrar direto.
4. Em **Project Settings > API**, copie a **Project URL** e a **anon public key**.

> **Sistema pessoal (só você):** após criar sua conta, feche o cadastro em
> **Authentication > Sign In / Providers > Email**, desativando
> **"Allow new users to sign up"**. Assim ninguém mais consegue se registrar.

## 2. Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-publica
```

> A `anon key` é pública por design (vai para o frontend). A segurança dos dados
> vem do RLS no banco, não de esconder essa chave. **Nunca** use a `service_role`
> key no frontend.

## 3. Rodar localmente

```
npm install
npm run dev
```

Acesse o endereço mostrado (geralmente http://localhost:5173).

### Primeiro acesso

1. Crie a conta (e-mail + senha).
2. Nos próximos logins, entre com e-mail e senha.

## Scripts

| Script                 | O que faz                                  |
| ---------------------- | ------------------------------------------ |
| `npm run dev`          | Servidor de desenvolvimento                |
| `npm run build`        | Type-check + build de produção (`dist/`)   |
| `npm run preview`      | Servir o build de produção localmente      |
| `npm run typecheck`    | Checagem de tipos                          |
| `npm run lint`         | ESLint (falha em qualquer warning)         |
| `npm run format`       | Formatar com Prettier                      |
| `npm run format:check` | Conferir formatação                        |

## 4. Publicar (deploy)

O app é estático (SPA). Recomendado: **Vercel** ou **Netlify**.

1. Suba o repositório para o GitHub (o `.env` **não** é versionado).
2. Importe o projeto na Vercel/Netlify.
3. Configure as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no
   painel da hospedagem.
4. Build command: `npm run build` — Output: `dist`.
5. No Supabase, em **Authentication > URL Configuration**, adicione a URL do
   site publicado em **Site URL** e **Redirect URLs**.

Os arquivos [`vercel.json`](vercel.json) e [`netlify.toml`](netlify.toml) já
incluem o rewrite de SPA e cabeçalhos de segurança.

## Segurança

- **RLS** em todas as tabelas: cada linha pertence a `auth.uid()` e as políticas
  impedem acesso a dados de outros usuários.
- Autenticação por e-mail/senha. Para uso pessoal, feche o cadastro no painel
  (ver acima) para que só a sua conta exista.
- **CSP** restritiva injetada no build de produção; cabeçalhos de segurança
  (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) no deploy.
- Dados externos (respostas do banco) são normalizados por tipo antes de uso.

## Regras de jornada (padrão)

- Meta diária: **08:48** (44h semanais; entrada 07:30, saída 17:18, 1h de almoço).
- Limite de horas extras: **2h/dia** (alerta ao ultrapassar).
- Interjornada mínima: **11h** entre a saída e a entrada seguinte (alerta ao violar).

Tudo isso é ajustável na aba **Config**.
