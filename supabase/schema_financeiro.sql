-- ============================================================
-- Módulo Financeiro (verba mensal + compras) e Estoque
-- Com suporte a múltiplas UNIDADES (CNPJs: Fundamental, Médio, etc.)
-- Aplicar no Supabase: Dashboard > SQL Editor > cole e execute.
--
-- Verba, compras e estoque são separados por unidade. Cada linha
-- pertence a um usuário (RLS) e a uma unidade (unidade_id).
--
-- Pré-requisito: a função public.set_updated_at() já existe (criada no
-- schema.sql principal). É recriada abaixo de forma idempotente.
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

-- ---------- UNIDADES (cada CNPJ: Fundamental, Médio...) ----------
create table if not exists public.unidades (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  nome        text not null,
  cnpj        text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- ITENS DE ESTOQUE (por unidade) ----------
create table if not exists public.itens_estoque (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  unidade_id    uuid not null references public.unidades (id) on delete cascade,
  nome          text not null,
  categoria     text not null default '',
  unidade       text not null default 'un',
  quantidade    integer not null default 0,
  estoque_min   integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------- ORÇAMENTOS (verba por unidade por mês) ----------
-- competencia: primeiro dia do mês de referência (ex.: 2026-02-01).
create table if not exists public.orcamentos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  unidade_id  uuid not null references public.unidades (id) on delete cascade,
  competencia date not null,
  valor       numeric(14, 2) not null default 0,
  obs         text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- uma verba por unidade por mês
  unique (unidade_id, competencia)
);

-- ---------- COMPRAS (por unidade) ----------
create table if not exists public.compras (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  unidade_id    uuid not null references public.unidades (id) on delete cascade,
  data          date not null,
  descricao     text not null,
  fornecedor    text not null default '',
  categoria     text not null default '',
  valor         numeric(14, 2) not null default 0,
  quantidade    integer not null default 1,
  nota_fiscal   text not null default '',
  status        text not null default 'comprada'
                 check (status in ('solicitada','comprada','recebida','cancelada')),
  item_estoque_id uuid references public.itens_estoque (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------- MOVIMENTAÇÕES DE ESTOQUE ----------
-- A unidade é herdada do item (item_id). quantidade sempre > 0.
create table if not exists public.movimentacoes_estoque (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  item_id       uuid not null references public.itens_estoque (id) on delete cascade,
  tipo          text not null check (tipo in ('entrada','saida')),
  quantidade    integer not null check (quantidade > 0),
  motivo        text not null default '',
  data          date not null,
  created_at    timestamptz not null default now()
);

-- ---------- Config adicional (dia de corte da janela de compra) ----------
alter table public.config
  add column if not exists dia_corte_compra integer not null default 24;

-- ---------- Índices ----------
create index if not exists idx_unidades_user on public.unidades (user_id, nome);
create index if not exists idx_orcamentos_unidade on public.orcamentos (unidade_id, competencia desc);
create index if not exists idx_compras_unidade on public.compras (unidade_id, data desc);
create index if not exists idx_itens_estoque_unidade on public.itens_estoque (unidade_id, nome);
create index if not exists idx_mov_estoque_user on public.movimentacoes_estoque (user_id, data desc);
create index if not exists idx_mov_estoque_item on public.movimentacoes_estoque (item_id);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.unidades enable row level security;
alter table public.orcamentos enable row level security;
alter table public.itens_estoque enable row level security;
alter table public.compras enable row level security;
alter table public.movimentacoes_estoque enable row level security;

-- UNIDADES
drop policy if exists "unidades_select_own" on public.unidades;
create policy "unidades_select_own" on public.unidades
  for select using (auth.uid() = user_id);
drop policy if exists "unidades_insert_own" on public.unidades;
create policy "unidades_insert_own" on public.unidades
  for insert with check (auth.uid() = user_id);
drop policy if exists "unidades_update_own" on public.unidades;
create policy "unidades_update_own" on public.unidades
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "unidades_delete_own" on public.unidades;
create policy "unidades_delete_own" on public.unidades
  for delete using (auth.uid() = user_id);

-- ORÇAMENTOS
drop policy if exists "orcamentos_select_own" on public.orcamentos;
create policy "orcamentos_select_own" on public.orcamentos
  for select using (auth.uid() = user_id);
drop policy if exists "orcamentos_insert_own" on public.orcamentos;
create policy "orcamentos_insert_own" on public.orcamentos
  for insert with check (auth.uid() = user_id);
drop policy if exists "orcamentos_update_own" on public.orcamentos;
create policy "orcamentos_update_own" on public.orcamentos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "orcamentos_delete_own" on public.orcamentos;
create policy "orcamentos_delete_own" on public.orcamentos
  for delete using (auth.uid() = user_id);

-- ITENS DE ESTOQUE
drop policy if exists "itens_select_own" on public.itens_estoque;
create policy "itens_select_own" on public.itens_estoque
  for select using (auth.uid() = user_id);
drop policy if exists "itens_insert_own" on public.itens_estoque;
create policy "itens_insert_own" on public.itens_estoque
  for insert with check (auth.uid() = user_id);
drop policy if exists "itens_update_own" on public.itens_estoque;
create policy "itens_update_own" on public.itens_estoque
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "itens_delete_own" on public.itens_estoque;
create policy "itens_delete_own" on public.itens_estoque
  for delete using (auth.uid() = user_id);

-- COMPRAS
drop policy if exists "compras_select_own" on public.compras;
create policy "compras_select_own" on public.compras
  for select using (auth.uid() = user_id);
drop policy if exists "compras_insert_own" on public.compras;
create policy "compras_insert_own" on public.compras
  for insert with check (auth.uid() = user_id);
drop policy if exists "compras_update_own" on public.compras;
create policy "compras_update_own" on public.compras
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "compras_delete_own" on public.compras;
create policy "compras_delete_own" on public.compras
  for delete using (auth.uid() = user_id);

-- MOVIMENTAÇÕES DE ESTOQUE
drop policy if exists "mov_select_own" on public.movimentacoes_estoque;
create policy "mov_select_own" on public.movimentacoes_estoque
  for select using (auth.uid() = user_id);
drop policy if exists "mov_insert_own" on public.movimentacoes_estoque;
create policy "mov_insert_own" on public.movimentacoes_estoque
  for insert with check (auth.uid() = user_id);
drop policy if exists "mov_delete_own" on public.movimentacoes_estoque;
create policy "mov_delete_own" on public.movimentacoes_estoque
  for delete using (auth.uid() = user_id);

-- ============================================================
-- Triggers updated_at
-- ============================================================
drop trigger if exists trg_unidades_updated on public.unidades;
create trigger trg_unidades_updated before update on public.unidades
  for each row execute function public.set_updated_at();

drop trigger if exists trg_orcamentos_updated on public.orcamentos;
create trigger trg_orcamentos_updated before update on public.orcamentos
  for each row execute function public.set_updated_at();

drop trigger if exists trg_itens_estoque_updated on public.itens_estoque;
create trigger trg_itens_estoque_updated before update on public.itens_estoque
  for each row execute function public.set_updated_at();

drop trigger if exists trg_compras_updated on public.compras;
create trigger trg_compras_updated before update on public.compras
  for each row execute function public.set_updated_at();

-- ============================================================
-- Dados iniciais: cria as duas unidades padrão para o usuário logado,
-- caso ainda não existam. (Execute logado; usa auth.uid().)
-- ============================================================
insert into public.unidades (user_id, nome)
select auth.uid(), 'Fundamental'
where auth.uid() is not null
  and not exists (
    select 1 from public.unidades where user_id = auth.uid() and nome = 'Fundamental'
  );

insert into public.unidades (user_id, nome)
select auth.uid(), 'Médio'
where auth.uid() is not null
  and not exists (
    select 1 from public.unidades where user_id = auth.uid() and nome = 'Médio'
  );
