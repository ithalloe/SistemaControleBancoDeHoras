import type { Camera, StatusCamera, TipoCamera } from "../types";
import { supabase } from "./supabase";

/* ------------------------------------------------------------------ *
 * Linha do banco (snake_case) <-> objeto do app (camelCase)
 * RLS garante o escopo por usuário; ainda assim normalizamos os tipos.
 * ------------------------------------------------------------------ */
interface CameraRow {
  id: string;
  nome: string;
  regiao: string;
  tipo: string;
  status: string;
  cobertura: string;
  obs: string;
  created_at: string;
}

const TIPOS: TipoCamera[] = ["interna", "externa"];
const STATUS: StatusCamera[] = ["ativa", "inativa", "manutencao", "defeito"];

function rowToCamera(r: CameraRow): Camera {
  return {
    id: r.id,
    nome: r.nome,
    regiao: r.regiao,
    tipo: TIPOS.includes(r.tipo as TipoCamera) ? (r.tipo as TipoCamera) : "interna",
    status: STATUS.includes(r.status as StatusCamera) ? (r.status as StatusCamera) : "ativa",
    cobertura: r.cobertura,
    obs: r.obs,
    criadoEm: (r.created_at ?? "").slice(0, 10),
  };
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sessão inválida.");
  return data.user.id;
}

/* ------------------------------------------------------------------ *
 * Carregar todas as câmeras do usuário
 * ------------------------------------------------------------------ */
export async function carregarCameras(): Promise<Camera[]> {
  const { data, error } = await supabase
    .from("cameras")
    .select("*")
    .order("regiao", { ascending: true })
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data as CameraRow[]).map(rowToCamera);
}

/* ------------------------------------------------------------------ *
 * Criar câmera
 * ------------------------------------------------------------------ */
export async function adicionarCamera(c: Omit<Camera, "id" | "criadoEm">): Promise<Camera> {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from("cameras")
    .insert({
      user_id,
      nome: c.nome,
      regiao: c.regiao,
      tipo: c.tipo,
      status: c.status,
      cobertura: c.cobertura,
      obs: c.obs,
    })
    .select("*")
    .single();
  if (error) throw error;
  return rowToCamera(data as CameraRow);
}

/* ------------------------------------------------------------------ *
 * Atualizar câmera
 * ------------------------------------------------------------------ */
export async function atualizarCamera(c: Camera): Promise<Camera> {
  const { data, error } = await supabase
    .from("cameras")
    .update({
      nome: c.nome,
      regiao: c.regiao,
      tipo: c.tipo,
      status: c.status,
      cobertura: c.cobertura,
      obs: c.obs,
    })
    .eq("id", c.id)
    .select("*")
    .single();
  if (error) throw error;
  return rowToCamera(data as CameraRow);
}

/* ------------------------------------------------------------------ *
 * Mudar apenas o status
 * ------------------------------------------------------------------ */
export async function atualizarStatusCamera(id: string, status: StatusCamera): Promise<void> {
  const { error } = await supabase.from("cameras").update({ status }).eq("id", id);
  if (error) throw error;
}

/* ------------------------------------------------------------------ *
 * Remover câmera
 * ------------------------------------------------------------------ */
export async function removerCamera(id: string): Promise<void> {
  const { error } = await supabase.from("cameras").delete().eq("id", id);
  if (error) throw error;
}
