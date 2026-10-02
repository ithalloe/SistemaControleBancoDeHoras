export interface Config {
  /** Meta diária em minutos (ex.: 08:48 = 528) */
  metaMin: number;
  /** Máximo de horas extras por dia em minutos (CLT: 120) */
  maxExtraMin: number;
  /** Descanso mínimo entre jornadas em horas (CLT: 11) */
  interjornadaH: number;
  /** Dia do mês a partir do qual a compra é bloqueada (padrão 24).
   *  Ex.: 24 => compras permitidas do dia 1 ao 23. */
  diaCorteCompra: number;
}

export interface Ponto {
  id: string;
  /** Data no formato ISO YYYY-MM-DD */
  data: string;
  /** "HH:MM" */
  entrada: string;
  /** "HH:MM" */
  saida: string;
  almocoMin: number;
  obs: string;
  trabalhadoMin: number;
  extraMin: number;
  saldoMin: number;
  /** minutos desde 00:00 */
  entradaMin: number;
  /** minutos desde 00:00 (pode ser > 1440 se virou o dia) */
  saidaMin: number;
}

export type Prioridade = "alta" | "media" | "baixa";
export type StatusDemanda = "afazer" | "fazendo" | "feito";

export interface Demanda {
  id: string;
  titulo: string;
  origem: string;
  prioridade: Prioridade;
  /** ISO YYYY-MM-DD ou "" */
  prazo: string;
  desc: string;
  status: StatusDemanda;
  criadoEm: string;
}

export interface AppState {
  config: Config;
  pontos: Ponto[];
  demandas: Demanda[];
}

/* ===================== Financeiro + Estoque ===================== */

export interface Orcamento {
  id: string;
  /** Mês de competência, ISO YYYY-MM-DD (primeiro dia do mês) */
  competencia: string;
  valor: number;
  obs: string;
}

export type StatusCompra = "solicitada" | "comprada" | "recebida" | "cancelada";

export interface Compra {
  id: string;
  /** ISO YYYY-MM-DD */
  data: string;
  descricao: string;
  fornecedor: string;
  categoria: string;
  valor: number;
  quantidade: number;
  notaFiscal: string;
  status: StatusCompra;
  /** item de estoque abastecido por esta compra (ou null) */
  itemEstoqueId: string | null;
}

export interface ItemEstoque {
  id: string;
  nome: string;
  categoria: string;
  unidade: string;
  quantidade: number;
  estoqueMin: number;
}

export type TipoMovimentacao = "entrada" | "saida";

export interface Movimentacao {
  id: string;
  itemId: string;
  tipo: TipoMovimentacao;
  quantidade: number;
  motivo: string;
  /** ISO YYYY-MM-DD */
  data: string;
}

export interface FinanceiroState {
  orcamentos: Orcamento[];
  compras: Compra[];
  itens: ItemEstoque[];
  movimentacoes: Movimentacao[];
}

export type TipoAlerta = "err" | "warn" | "ok";

export interface Alerta {
  tipo: TipoAlerta;
  msg: string;
}

export interface CalcPonto {
  trabalhadoMin: number;
  extraMin: number;
  saldoMin: number;
  entradaMin: number;
  saidaMin: number;
  virouDia: boolean;
}

export const defaultConfig: Config = {
  metaMin: 8 * 60 + 48, // 08:48 -> 44h semanais
  maxExtraMin: 120, // 2h/dia
  interjornadaH: 11,
  diaCorteCompra: 24, // compras permitidas do dia 1 ao 23
};
