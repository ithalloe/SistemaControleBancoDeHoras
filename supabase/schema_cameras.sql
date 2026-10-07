-- ============================================================
-- Módulo Câmeras — mapeamento das câmeras do ambiente escolar
-- Aplicar no Supabase: Dashboard > SQL Editor > cole e execute.
--
-- Cada câmera pertence a um usuário (RLS por user_id) e registra
-- nome, região/local, tipo, status e a área de cobertura.
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

-- ---------- CÂMERAS ----------
create table if not exists public.cameras (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  nome        text not null,
  regiao      text not null default '',
  tipo        text not null default 'interna'
               check (tipo in ('interna','externa')),
  status      text not null default 'ativa'
               check (status in ('ativa','inativa','manutencao','defeito')),
  cobertura   text not null default '',
  obs         text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- Índices ----------
create index if not exists idx_cameras_user on public.cameras (user_id, regiao, nome);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.cameras enable row level security;

drop policy if exists "cameras_select_own" on public.cameras;
create policy "cameras_select_own" on public.cameras
  for select using (auth.uid() = user_id);
drop policy if exists "cameras_insert_own" on public.cameras;
create policy "cameras_insert_own" on public.cameras
  for insert with check (auth.uid() = user_id);
drop policy if exists "cameras_update_own" on public.cameras;
create policy "cameras_update_own" on public.cameras
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "cameras_delete_own" on public.cameras;
create policy "cameras_delete_own" on public.cameras
  for delete using (auth.uid() = user_id);

-- ============================================================
-- Trigger updated_at
-- ============================================================
drop trigger if exists trg_cameras_updated on public.cameras;
create trigger trg_cameras_updated before update on public.cameras
  for each row execute function public.set_updated_at();
