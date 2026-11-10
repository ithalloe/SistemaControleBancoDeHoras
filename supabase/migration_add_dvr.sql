-- =============================================================
-- Migração: adiciona campo dvr na tabela cameras
-- Execute este script no SQL Editor do Supabase
-- =============================================================

-- 1. Adiciona coluna dvr como texto livre (padrão vazio para registros existentes)
alter table public.cameras
  add column if not exists dvr text not null default '';

-- 2. Atualiza o índice para incluir dvr na ordenação
drop index if exists idx_cameras_user;
create index if not exists idx_cameras_user
  on public.cameras (user_id, dvr, regiao, nome);
