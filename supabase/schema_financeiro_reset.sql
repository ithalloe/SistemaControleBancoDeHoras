-- ============================================================
-- RESET do módulo Financeiro + Estoque (com unidades)
-- Use este script se você JÁ rodou uma versão anterior do schema
-- financeiro (sem unidade_id) e recebeu o erro:
--   column "unidade_id" does not exist
--
-- O que faz: APAGA e recria as tabelas do módulo financeiro já com
-- suporte a múltiplas unidades (CNPJs). NÃO toca em pontos/demandas/config.
--
-- ATENÇÃO: isto apaga os dados existentes de verba/compras/estoque.
-- Como o módulo ainda não estava em uso, isso é esperado. Se houver
-- dados a preservar, NÃO rode este arquivo (peça a migração ALTER TABLE).
-- Aplicar no Supabase: SQL Editor > cole e execute.
-- ============================================================

-- Remove as tabelas do financeiro na ordem de dependência (cascade cuida
-- de policies, triggers, índices e FKs).
drop table if exists public.movimentacoes_estoque cascade;
drop table if exists public.compras cascade;
drop table if exists public.orcamentos cascade;
drop table if exists public.itens_estoque cascade;
drop table if exists public.unidades cascade;

-- Garante a função de updated_at.
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
create table public.unidades (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  nome        text not null,
  cnpj        text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- ITENS DE ESTOQUE (por unidade) ----------
create table public.itens_estoque (
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
create table public.orcamentos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  unidade_id  uuid not null references public.unidades (id) on delete cascade,
  competencia date not null,
  valor       numeric(14, 2) not null default 0,
  obs         text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (unidade_id, competencia)
);

-- ---------- COMPRAS (por unidade) ----------
create table public.compras (
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
create table public.movimentacoes_estoque (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  item_id       uuid not null references public.itens_estoque (id) on delete cascade,
  tipo          text not null check (tipo in ('entrada','saida')),
  quantidade    integer not null check (quantidade > 0),
  motivo        text not null default '',
  data          date not null,
  created_at    timestamptz not null default now()
);

-- ---------- Config: dia de corte da janela de compra ----------
alter table public.config
  add column if not exists dia_corte_compra integer not null default 24;

-- ---------- Índices ----------
create index idx_unidades_user on public.unidades (user_id, nome);
create index idx_orcamentos_unidade on public.orcamentos (unidade_id, competencia desc);
create index idx_compras_unidade on public.compras (unidade_id, data desc);
create index idx_itens_estoque_unidade on public.itens_estoque (unidade_id, nome);
create index idx_mov_estoque_user on public.movimentacoes_estoque (user_id, data desc);
create index idx_mov_estoque_item on public.movimentacoes_estoque (item_id);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.unidades enable row level security;
alter table public.orcamentos enable row level security;
alter table public.itens_estoque enable row level security;
alter table public.compras enable row level security;
alter table public.movimentacoes_estoque enable row level security;

-- UNIDADES
create policy "unidades_select_own" on public.unidades
  for select using (auth.uid() = user_id);
create policy "unidades_insert_own" on public.unidades
  for insert with check (auth.uid() = user_id);
create policy "unidades_update_own" on public.unidades
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "unidades_delete_own" on public.unidades
  for delete using (auth.uid() = user_id);

-- ORÇAMENTOS
create policy "orcamentos_select_own" on public.orcamentos
  for select using (auth.uid() = user_id);
create policy "orcamentos_insert_own" on public.orcamentos
  for insert with check (auth.uid() = user_id);
create policy "orcamentos_update_own" on public.orcamentos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "orcamentos_delete_own" on public.orcamentos
  for delete using (auth.uid() = user_id);

-- ITENS DE ESTOQUE
create policy "itens_select_own" on public.itens_estoque
  for select using (auth.uid() = user_id);
create policy "itens_insert_own" on public.itens_estoque
  for insert with check (auth.uid() = user_id);
create policy "itens_update_own" on public.itens_estoque
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "itens_delete_own" on public.itens_estoque
  for delete using (auth.uid() = user_id);

-- COMPRAS
create policy "compras_select_own" on public.compras
  for select using (auth.uid() = user_id);
create policy "compras_insert_own" on public.compras
  for insert with check (auth.uid() = user_id);
create policy "compras_update_own" on public.compras
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "compras_delete_own" on public.compras
  for delete using (auth.uid() = user_id);

-- MOVIMENTAÇÕES DE ESTOQUE
create policy "mov_select_own" on public.movimentacoes_estoque
  for select using (auth.uid() = user_id);
create policy "mov_insert_own" on public.movimentacoes_estoque
  for insert with check (auth.uid() = user_id);
create policy "mov_delete_own" on public.movimentacoes_estoque
  for delete using (auth.uid() = user_id);

-- ============================================================
-- Triggers updated_at
-- ============================================================
create trigger trg_unidades_updated before update on public.unidades
  for each row execute function public.set_updated_at();
create trigger trg_orcamentos_updated before update on public.orcamentos
  for each row execute function public.set_updated_at();
create trigger trg_itens_estoque_updated before update on public.itens_estoque
  for each row execute function public.set_updated_at();
create trigger trg_compras_updated before update on public.compras
  for each row execute function public.set_updated_at();

-- ============================================================
-- Cria as unidades padrão para o usuário logado
-- ============================================================
insert into public.unidades (user_id, nome)
select auth.uid(), 'Fundamental'
where auth.uid() is not null;

insert into public.unidades (user_id, nome)
select auth.uid(), 'Médio'
where auth.uid() is not null;
