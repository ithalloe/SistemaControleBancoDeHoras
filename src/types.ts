export interface Config {
  /** Meta diária em minutos (ex.: 08:48 = 528) */
  metaMin: number;
  /** Máximo de horas extras por dia em minutos (CLT: 120) */
  maxExtraMin: number;
  /** Descanso mínimo entre jornadas em horas (CLT: 11) */
  interjornadaH: number;
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
};
