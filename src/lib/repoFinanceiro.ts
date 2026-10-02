import type {
  Compra,
  FinanceiroState,
  ItemEstoque,
  Movimentacao,
  Orcamento,
  StatusCompra,
  TipoMovimentacao,
  Unidade,
} from "../types";
import { supabase } from "./supabase";

/* ------------------------------------------------------------------ *
 * Linhas do banco (snake_case)
 * ------------------------------------------------------------------ */
interface UnidadeRow {
  id: string;
  nome: string;
  cnpj: string;
}
interface OrcamentoRow {
  id: string;
  unidade_id: string;
  competencia: string;
  valor: number | string;
  obs: string;
}
interface CompraRow {
  id: string;
  unidade_id: string;
  data: string;
  descricao: string;
  fornecedor: string;
  categoria: string;
  valor: number | string;
  quantidade: number;
  nota_fiscal: string;
  status: string;
  item_estoque_id: string | null;
}
interface ItemRow {
  id: string;
  unidade_id: string;
  nome: string;
  categoria: string;
  unidade: string;
  quantidade: number;
  estoque_min: number;
}
interface MovRow {
  id: string;
  item_id: string;
  tipo: string;
  quantidade: number;
  motivo: string;
  data: string;
}

const STATUS_COMPRA: StatusCompra[] = ["solicitada", "comprada", "recebida", "cancelada"];
const TIPOS_MOV: TipoMovimentacao[] = ["entrada", "saida"];

/** Converte texto/numérico do Postgres (numeric vem como string) em number. */
function toNum(v: number | string): number {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

function rowToUnidade(r: UnidadeRow): Unidade {
  return { id: r.id, nome: r.nome, cnpj: r.cnpj };
}
function rowToOrcamento(r: OrcamentoRow): Orcamento {
  return {
    id: r.id,
    unidadeId: r.unidade_id,
    competencia: r.competencia,
    valor: toNum(r.valor),
    obs: r.obs,
  };
}
function rowToCompra(r: CompraRow): Compra {
  return {
    id: r.id,
    unidadeId: r.unidade_id,
    data: r.data,
    descricao: r.descricao,
    fornecedor: r.fornecedor,
    categoria: r.categoria,
    valor: toNum(r.valor),
    quantidade: r.quantidade,
    notaFiscal: r.nota_fiscal,
    status: STATUS_COMPRA.includes(r.status as StatusCompra)
      ? (r.status as StatusCompra)
      : "comprada",
    itemEstoqueId: r.item_estoque_id,
  };
}
function rowToItem(r: ItemRow): ItemEstoque {
  return {
    id: r.id,
    unidadeId: r.unidade_id,
    nome: r.nome,
    categoria: r.categoria,
    unidade: r.unidade,
    quantidade: r.quantidade,
    estoqueMin: r.estoque_min,
  };
}
function rowToMov(r: MovRow): Movimentacao {
  return {
    id: r.id,
    itemId: r.item_id,
    tipo: TIPOS_MOV.includes(r.tipo as TipoMovimentacao) ? (r.tipo as TipoMovimentacao) : "entrada",
    quantidade: r.quantidade,
    motivo: r.motivo,
    data: r.data,
  };
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sessão inválida.");
  return data.user.id;
}

/* ------------------------------------------------------------------ *
 * Carregar tudo do módulo financeiro/estoque
 * ------------------------------------------------------------------ */
export async function carregarFinanceiro(): Promise<FinanceiroState> {
  const [uniRes, orcRes, compRes, itensRes, movRes] = await Promise.all([
    supabase.from("unidades").select("*").order("nome", { ascending: true }),
    supabase.from("orcamentos").select("*").order("competencia", { ascending: false }),
    supabase.from("compras").select("*").order("data", { ascending: false }),
    supabase.from("itens_estoque").select("*").order("nome", { ascending: true }),
    supabase.from("movimentacoes_estoque").select("*").order("data", { ascending: false }),
  ]);

  if (uniRes.error) throw uniRes.error;
  if (orcRes.error) throw orcRes.error;
  if (compRes.error) throw compRes.error;
  if (itensRes.error) throw itensRes.error;
  if (movRes.error) throw movRes.error;

  return {
    unidades: (uniRes.data as UnidadeRow[]).map(rowToUnidade),
    orcamentos: (orcRes.data as OrcamentoRow[]).map(rowToOrcamento),
    compras: (compRes.data as CompraRow[]).map(rowToCompra),
    itens: (itensRes.data as ItemRow[]).map(rowToItem),
    movimentacoes: (movRes.data as MovRow[]).map(rowToMov),
  };
}

/* ------------------------------------------------------------------ *
 * Unidades (CNPJs)
 * ------------------------------------------------------------------ */
export async function adicionarUnidade(nome: string, cnpj: string): Promise<Unidade> {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from("unidades")
    .insert({ user_id, nome, cnpj })
    .select("*")
    .single();
  if (error) throw error;
  return rowToUnidade(data as UnidadeRow);
}

export async function removerUnidade(id: string): Promise<void> {
  const { error } = await supabase.from("unidades").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------------------------------------------------ *
 * Orçamentos (verba mensal) — upsert por competência
 * ------------------------------------------------------------------ */
export async function salvarOrcamento(o: Omit<Orcamento, "id">): Promise<Orcamento> {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from("orcamentos")
    .upsert(
      {
        user_id,
        unidade_id: o.unidadeId,
        competencia: o.competencia,
        valor: o.valor,
        obs: o.obs,
      },
      { onConflict: "unidade_id,competencia" }
    )
    .select("*")
    .single();
  if (error) throw error;
  return rowToOrcamento(data as OrcamentoRow);
}

/* ------------------------------------------------------------------ *
 * Compras
 * ------------------------------------------------------------------ */
export async function adicionarCompra(c: Omit<Compra, "id">): Promise<Compra> {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from("compras")
    .insert({
      user_id,
      unidade_id: c.unidadeId,
      data: c.data,
      descricao: c.descricao,
      fornecedor: c.fornecedor,
      categoria: c.categoria,
      valor: c.valor,
      quantidade: c.quantidade,
      nota_fiscal: c.notaFiscal,
      status: c.status,
      item_estoque_id: c.itemEstoqueId,
    })
    .select("*")
    .single();
  if (error) throw error;
  return rowToCompra(data as CompraRow);
}

export async function atualizarStatusCompra(id: string, status: StatusCompra): Promise<void> {
  const { error } = await supabase.from("compras").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function removerCompra(id: string): Promise<void> {
  const { error } = await supabase.from("compras").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------------------------------------------------ *
 * Itens de estoque
 * ------------------------------------------------------------------ */
export async function adicionarItem(i: Omit<ItemEstoque, "id">): Promise<ItemEstoque> {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from("itens_estoque")
    .insert({
      user_id,
      unidade_id: i.unidadeId,
      nome: i.nome,
      categoria: i.categoria,
      unidade: i.unidade,
      quantidade: i.quantidade,
      estoque_min: i.estoqueMin,
    })
    .select("*")
    .single();
  if (error) throw error;
  return rowToItem(data as ItemRow);
}

export async function removerItem(id: string): Promise<void> {
  const { error } = await supabase.from("itens_estoque").delete().eq("id", id);
  if (error) throw error;
}

async function atualizarQuantidadeItem(id: string, novaQuantidade: number): Promise<void> {
  const { error } = await supabase
    .from("itens_estoque")
    .update({ quantidade: Math.max(0, novaQuantidade) })
    .eq("id", id);
  if (error) throw error;
}

/* ------------------------------------------------------------------ *
 * Movimentações de estoque
 * Registra a movimentação e ajusta a quantidade do item.
 * Retorna a movimentação criada e a nova quantidade do item.
 * ------------------------------------------------------------------ */
export async function registrarMovimentacao(
  mov: Omit<Movimentacao, "id">,
  quantidadeAtual: number
): Promise<{ movimentacao: Movimentacao; novaQuantidade: number }> {
  const user_id = await requireUserId();

  const delta = mov.tipo === "entrada" ? mov.quantidade : -mov.quantidade;
  const novaQuantidade = Math.max(0, quantidadeAtual + delta);

  const { data, error } = await supabase
    .from("movimentacoes_estoque")
    .insert({
      user_id,
      item_id: mov.itemId,
      tipo: mov.tipo,
      quantidade: mov.quantidade,
      motivo: mov.motivo,
      data: mov.data,
    })
    .select("*")
    .single();
  if (error) throw error;

  await atualizarQuantidadeItem(mov.itemId, novaQuantidade);

  return { movimentacao: rowToMov(data as MovRow), novaQuantidade };
}
