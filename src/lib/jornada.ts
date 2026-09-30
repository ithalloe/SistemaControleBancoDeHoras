import type { Alerta, CalcPonto, Config, Ponto } from "../types";
import { fmtDataBR, fmtDur, toMin } from "./tempo";

/** Calcula tempo trabalhado, extra e saldo de um ponto. */
export function calcularPonto(
  entrada: string,
  saida: string,
  almocoMin: number,
  config: Config
): CalcPonto | null {
  const e = toMin(entrada);
  let s = toMin(saida);
  if (e === null || s === null) return null;

  let virouDia = false;
  if (s < e) {
    s += 24 * 60; // saída após a meia-noite
    virouDia = true;
  }

  const brutoMin = s - e;
  const trabalhadoMin = Math.max(0, brutoMin - (almocoMin || 0));
  const saldoMin = trabalhadoMin - config.metaMin;
  const extraMin = Math.max(0, saldoMin);

  return { trabalhadoMin, extraMin, saldoMin, entradaMin: e, saidaMin: s, virouDia };
}

/** Minutos de descanso entre a saída de um dia e a entrada de outro. */
export function descansoEntre(
  diaSaidaISO: string,
  saidaMin: number,
  diaEntradaISO: string,
  entradaMin: number
): number {
  const baseSaida = new Date(diaSaidaISO + "T00:00:00").getTime();
  const baseEntrada = new Date(diaEntradaISO + "T00:00:00").getTime();
  const instanteSaida = baseSaida + saidaMin * 60000;
  const instanteEntrada = baseEntrada + entradaMin * 60000;
  return (instanteEntrada - instanteSaida) / 60000;
}

/** Menor horário de entrada permitido dado a saída do dia anterior. */
export function horaMinimaEntrada(
  diaSaidaISO: string,
  saidaMin: number,
  interjornadaH: number
): string {
  const base = new Date(diaSaidaISO + "T00:00:00").getTime();
  const permitido = new Date(base + (saidaMin + interjornadaH * 60) * 60000);
  const hh = permitido.getHours().toString().padStart(2, "0");
  const mm = permitido.getMinutes().toString().padStart(2, "0");
  const mesmoDia = permitido.toISOString().slice(0, 10) === diaSaidaISO;
  return `${hh}:${mm}${mesmoDia ? "" : " (dia seguinte)"}`;
}

/**
 * Valida limites legais (CLT):
 * - máximo de horas extras por dia
 * - interjornada mínima (descanso entre jornadas)
 */
export function validarLegal(
  dataISO: string,
  calc: Pick<CalcPonto, "extraMin" | "entradaMin" | "saidaMin">,
  config: Config,
  pontos: Ponto[],
  ignorarId: string | null = null
): Alerta[] {
  const alertas: Alerta[] = [];

  // 1) Limite de horas extras por dia
  if (calc.extraMin > config.maxExtraMin) {
    const excedente = calc.extraMin - config.maxExtraMin;
    alertas.push({
      tipo: "err",
      msg:
        `Limite legal de horas extras excedido: ${fmtDur(calc.extraMin)} de extra ` +
        `(máximo ${fmtDur(config.maxExtraMin)}/dia). Excedeu ${fmtDur(excedente)}.`,
    });
  } else if (calc.extraMin > 0 && calc.extraMin >= config.maxExtraMin - 30) {
    alertas.push({
      tipo: "warn",
      msg: `Atenção: perto do limite de extras (${fmtDur(calc.extraMin)} de ${fmtDur(config.maxExtraMin)}).`,
    });
  }

  // 2) Interjornada mínima
  const minDescanso = config.interjornadaH * 60;
  const outros = pontos
    .filter((p) => p.id !== ignorarId)
    .slice()
    .sort((a, b) => a.data.localeCompare(b.data));

  const anterior = [...outros].reverse().find((p) => p.data < dataISO);
  if (anterior && anterior.saidaMin != null) {
    const descanso = descansoEntre(anterior.data, anterior.saidaMin, dataISO, calc.entradaMin);
    if (descanso < minDescanso) {
      alertas.push({
        tipo: "err",
        msg:
          `Interjornada insuficiente: só ${fmtDur(descanso)} de descanso desde a saída de ` +
          `${fmtDataBR(anterior.data)}. Mínimo: ${config.interjornadaH}h. ` +
          `Só poderia entrar a partir de ${horaMinimaEntrada(anterior.data, anterior.saidaMin, config.interjornadaH)}.`,
      });
    }
  }

  const seguinte = outros.find((p) => p.data > dataISO);
  if (seguinte && seguinte.entradaMin != null) {
    const descanso = descansoEntre(dataISO, calc.saidaMin, seguinte.data, seguinte.entradaMin);
    if (descanso < minDescanso) {
      alertas.push({
        tipo: "err",
        msg:
          `Interjornada insuficiente para o dia seguinte (${fmtDataBR(seguinte.data)}): ` +
          `só ${fmtDur(descanso)} de descanso. Mínimo: ${config.interjornadaH}h.`,
      });
    }
  }

  return alertas;
}

export function statusPonto(
  p: Ponto,
  config: Config,
  pontos: Ponto[]
): { cls: "ok" | "warn" | "err"; txt: string } {
  const alertas = validarLegal(
    p.data,
    { extraMin: p.extraMin, entradaMin: p.entradaMin, saidaMin: p.saidaMin },
    config,
    pontos,
    p.id
  );
  if (alertas.some((a) => a.tipo === "err")) return { cls: "err", txt: "Irregular" };
  if (alertas.some((a) => a.tipo === "warn")) return { cls: "warn", txt: "Atenção" };
  return { cls: "ok", txt: "OK" };
}
