-- ============================================================
-- Schema do Controle de Jornada + Demandas
-- Aplicar no Supabase: Dashboard > SQL Editor > cole e execute.
--
-- Segurança: todas as tabelas têm Row Level Security (RLS) ligado.
-- Cada linha pertence a um usuário (user_id = auth.uid()) e as políticas
-- só permitem que o dono leia/escreva os próprios registros.
-- ============================================================

-- ---------- PONTOS ----------
create table if not exists public.pontos (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  data           date not null,
  entrada        text not null default '',
  saida          text not null default '',
  almoco_min     integer not null default 0,
  obs            text not null default '',
  trabalhado_min integer not null default 0,
  extra_min      integer not null default 0,
  saldo_min      integer not null default 0,
  entrada_min    integer not null default 0,
  saida_min      integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- um registro de ponto por dia por usuário
  unique (user_id, data)
);

-- ---------- DEMANDAS ----------
create table if not exists public.demandas (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  titulo     text not null,
  origem     text not null default '',
  prioridade text not null default 'media' check (prioridade in ('alta','media','baixa')),
  prazo      text not null default '',
  descricao  text not null default '',
  status     text not null default 'afazer' check (status in ('afazer','fazendo','feito')),
  criado_em  text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- CONFIG (uma linha por usuário) ----------
create table if not exists public.config (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  meta_min       integer not null default 528,
  max_extra_min  integer not null default 120,
  interjornada_h integer not null default 11,
  updated_at     timestamptz not null default now()
);

-- ---------- Índices ----------
create index if not exists idx_pontos_user on public.pontos (user_id, data desc);
create index if not exists idx_demandas_user on public.demandas (user_id);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.pontos enable row level security;
alter table public.demandas enable row level security;
alter table public.config enable row level security;

-- PONTOS
drop policy if exists "pontos_select_own" on public.pontos;
create policy "pontos_select_own" on public.pontos
  for select using (auth.uid() = user_id);

drop policy if exists "pontos_insert_own" on public.pontos;
create policy "pontos_insert_own" on public.pontos
  for insert with check (auth.uid() = user_id);

drop policy if exists "pontos_update_own" on public.pontos;
create policy "pontos_update_own" on public.pontos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "pontos_delete_own" on public.pontos;
create policy "pontos_delete_own" on public.pontos
  for delete using (auth.uid() = user_id);

-- DEMANDAS
drop policy if exists "demandas_select_own" on public.demandas;
create policy "demandas_select_own" on public.demandas
  for select using (auth.uid() = user_id);

drop policy if exists "demandas_insert_own" on public.demandas;
create policy "demandas_insert_own" on public.demandas
  for insert with check (auth.uid() = user_id);

drop policy if exists "demandas_update_own" on public.demandas;
create policy "demandas_update_own" on public.demandas
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "demandas_delete_own" on public.demandas;
create policy "demandas_delete_own" on public.demandas
  for delete using (auth.uid() = user_id);

-- CONFIG
drop policy if exists "config_select_own" on public.config;
create policy "config_select_own" on public.config
  for select using (auth.uid() = user_id);

drop policy if exists "config_insert_own" on public.config;
create policy "config_insert_own" on public.config
  for insert with check (auth.uid() = user_id);

drop policy if exists "config_update_own" on public.config;
create policy "config_update_own" on public.config
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- Gatilho para manter updated_at
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_pontos_updated on public.pontos;
create trigger trg_pontos_updated before update on public.pontos
  for each row execute function public.set_updated_at();

drop trigger if exists trg_demandas_updated on public.demandas;
create trigger trg_demandas_updated before update on public.demandas
  for each row execute function public.set_updated_at();

drop trigger if exists trg_config_updated on public.config;
create trigger trg_config_updated before update on public.config
  for each row execute function public.set_updated_at();
