import type { AppState, Config, Demanda, Ponto, Prioridade, StatusDemanda } from "../types";
import { defaultConfig } from "../types";
import { supabase } from "./supabase";

/* ------------------------------------------------------------------ *
 * Mapeamento entre o formato do banco (snake_case) e o do app (camelCase).
 * As linhas do banco vêm do Supabase; como RLS garante o escopo por
 * usuário, ainda assim normalizamos os tipos ao ler.
 * ------------------------------------------------------------------ */

interface PontoRow {
  id: string;
  data: string;
  entrada: string;
  saida: string;
  almoco_min: number;
  obs: string;
  trabalhado_min: number;
  extra_min: number;
  saldo_min: number;
  entrada_min: number;
  saida_min: number;
}

interface DemandaRow {
  id: string;
  titulo: string;
  origem: string;
  prioridade: string;
  prazo: string;
  descricao: string;
  status: string;
  criado_em: string;
}

interface ConfigRow {
  meta_min: number;
  max_extra_min: number;
  interjornada_h: number;
}

const PRIORIDADES: Prioridade[] = ["alta", "media", "baixa"];
const STATUS: StatusDemanda[] = ["afazer", "fazendo", "feito"];

function rowToPonto(r: PontoRow): Ponto {
  return {
    id: r.id,
    data: r.data,
    entrada: r.entrada,
    saida: r.saida,
    almocoMin: r.almoco_min,
    obs: r.obs,
    trabalhadoMin: r.trabalhado_min,
    extraMin: r.extra_min,
    saldoMin: r.saldo_min,
    entradaMin: r.entrada_min,
    saidaMin: r.saida_min,
  };
}

function rowToDemanda(r: DemandaRow): Demanda {
  return {
    id: r.id,
    titulo: r.titulo,
    origem: r.origem,
    prioridade: PRIORIDADES.includes(r.prioridade as Prioridade)
      ? (r.prioridade as Prioridade)
      : "media",
    prazo: r.prazo,
    desc: r.descricao,
    status: STATUS.includes(r.status as StatusDemanda) ? (r.status as StatusDemanda) : "afazer",
    criadoEm: r.criado_em,
  };
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sessão inválida.");
  return data.user.id;
}

/* ------------------------------------------------------------------ *
 * Leitura completa do estado do usuário autenticado
 * ------------------------------------------------------------------ */
export async function carregarEstadoRemoto(): Promise<AppState> {
  const [pontosRes, demandasRes, configRes] = await Promise.all([
    supabase.from("pontos").select("*").order("data", { ascending: false }),
    supabase.from("demandas").select("*"),
    supabase.from("config").select("*").maybeSingle(),
  ]);

  if (pontosRes.error) throw pontosRes.error;
  if (demandasRes.error) throw demandasRes.error;
  if (configRes.error) throw configRes.error;

  const configRow = configRes.data as ConfigRow | null;
  const config: Config = configRow
    ? {
        metaMin: configRow.meta_min,
        maxExtraMin: configRow.max_extra_min,
        interjornadaH: configRow.interjornada_h,
      }
    : { ...defaultConfig };

  return {
    config,
    pontos: (pontosRes.data as PontoRow[]).map(rowToPonto),
    demandas: (demandasRes.data as DemandaRow[]).map(rowToDemanda),
  };
}

/* ------------------------------------------------------------------ *
 * Pontos
 * ------------------------------------------------------------------ */
export async function upsertPontoRemoto(p: Ponto): Promise<Ponto> {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from("pontos")
    .upsert(
      {
        user_id,
        data: p.data,
        entrada: p.entrada,
        saida: p.saida,
        almoco_min: p.almocoMin,
        obs: p.obs,
        trabalhado_min: p.trabalhadoMin,
        extra_min: p.extraMin,
        saldo_min: p.saldoMin,
        entrada_min: p.entradaMin,
        saida_min: p.saidaMin,
      },
      { onConflict: "user_id,data" }
    )
    .select("*")
    .single();
  if (error) throw error;
  return rowToPonto(data as PontoRow);
}

export async function removerPontoRemoto(id: string): Promise<void> {
  const { error } = await supabase.from("pontos").delete().eq("id", id);
  if (error) throw error;
}

/** Recalcula saldo/extra de todos os pontos após mudança de meta. */
export async function recalcularPontosRemoto(pontos: Ponto[], metaMin: number): Promise<Ponto[]> {
  const user_id = await requireUserId();
  const atualizados = pontos.map((p) => {
    const saldoMin = p.trabalhadoMin - metaMin;
    return { ...p, saldoMin, extraMin: Math.max(0, saldoMin) };
  });
  if (atualizados.length === 0) return atualizados;

  const rows = atualizados.map((p) => ({
    user_id,
    data: p.data,
    entrada: p.entrada,
    saida: p.saida,
    almoco_min: p.almocoMin,
    obs: p.obs,
    trabalhado_min: p.trabalhadoMin,
    extra_min: p.extraMin,
    saldo_min: p.saldoMin,
    entrada_min: p.entradaMin,
    saida_min: p.saidaMin,
  }));
  const { error } = await supabase.from("pontos").upsert(rows, { onConflict: "user_id,data" });
  if (error) throw error;
  return atualizados;
}

/* ------------------------------------------------------------------ *
 * Demandas
 * ------------------------------------------------------------------ */
export async function addDemandaRemoto(d: Demanda): Promise<Demanda> {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from("demandas")
    .insert({
      user_id,
      titulo: d.titulo,
      origem: d.origem,
      prioridade: d.prioridade,
      prazo: d.prazo,
      descricao: d.desc,
      status: d.status,
      criado_em: d.criadoEm,
    })
    .select("*")
    .single();
  if (error) throw error;
  return rowToDemanda(data as DemandaRow);
}

export async function moverDemandaRemoto(id: string, status: StatusDemanda): Promise<void> {
  const { error } = await supabase.from("demandas").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function removerDemandaRemoto(id: string): Promise<void> {
  const { error } = await supabase.from("demandas").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------------------------------------------------ *
 * Config
 * ------------------------------------------------------------------ */
export async function salvarConfigRemoto(config: Config): Promise<void> {
  const user_id = await requireUserId();
  const { error } = await supabase.from("config").upsert(
    {
      user_id,
      meta_min: config.metaMin,
      max_extra_min: config.maxExtraMin,
      interjornada_h: config.interjornadaH,
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}
