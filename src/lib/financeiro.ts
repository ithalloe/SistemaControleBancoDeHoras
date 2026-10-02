import type { Alerta, Compra, ItemEstoque, Orcamento } from "../types";

/* ------------------------------------------------------------------ *
 * Formatação
 * ------------------------------------------------------------------ */

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function fmtBRL(valor: number): string {
  return brl.format(Number.isFinite(valor) ? valor : 0);
}

/** ISO YYYY-MM-DD -> "YYYY-MM" (competência do mês) */
export function competenciaDe(dataISO: string): string {
  return dataISO.slice(0, 7);
}

/** "YYYY-MM" -> primeiro dia do mês em ISO (YYYY-MM-01) */
export function competenciaParaISO(ym: string): string {
  return `${ym}-01`;
}

/** Rótulo amigável do mês: "YYYY-MM" -> "fev/2026" */
export function rotuloCompetencia(ym: string): string {
  const meses = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ];
  const [ano, mes] = ym.split("-").map(Number);
  if (!ano || !mes) return ym;
  return `${meses[mes - 1]}/${ano}`;
}

/* ------------------------------------------------------------------ *
 * Verba / orçamento
 * ------------------------------------------------------------------ */

export interface ResumoVerba {
  competencia: string; // YYYY-MM
  verba: number;
  gasto: number;
  saldo: number;
  /** 0..100+ (pode passar de 100 se estourar) */
  percentUsado: number;
}

/**
 * Calcula o resumo de verba de um mês: verba definida, total gasto em
 * compras (exceto canceladas) e saldo. Compras contam pelo mês da sua data.
 */
export function resumoVerbaDoMes(
  competenciaYM: string,
  orcamentos: Orcamento[],
  compras: Compra[]
): ResumoVerba {
  const orc = orcamentos.find((o) => competenciaDe(o.competencia) === competenciaYM);
  const verba = orc?.valor ?? 0;

  const gasto = compras
    .filter((c) => c.status !== "cancelada" && competenciaDe(c.data) === competenciaYM)
    .reduce((soma, c) => soma + c.valor, 0);

  const saldo = verba - gasto;
  const percentUsado = verba > 0 ? (gasto / verba) * 100 : gasto > 0 ? 100 : 0;

  return { competencia: competenciaYM, verba, gasto, saldo, percentUsado };
}

/** Alertas sobre a verba de um mês (sem verba definida, perto do limite, estourou). */
export function validarVerba(resumo: ResumoVerba): Alerta[] {
  const alertas: Alerta[] = [];
  if (resumo.verba <= 0 && resumo.gasto > 0) {
    alertas.push({
      tipo: "warn",
      msg: "Nenhuma verba definida para este mês, mas já há compras registradas.",
    });
    return alertas;
  }
  if (resumo.saldo < 0) {
    alertas.push({
      tipo: "err",
      msg: `Verba estourada: gasto de ${fmtBRL(resumo.gasto)} excede a verba de ${fmtBRL(
        resumo.verba
      )} em ${fmtBRL(Math.abs(resumo.saldo))}.`,
    });
  } else if (resumo.percentUsado >= 90) {
    alertas.push({
      tipo: "warn",
      msg: `Atenção: ${resumo.percentUsado.toFixed(0)}% da verba já foi usada. Resta ${fmtBRL(
        resumo.saldo
      )}.`,
    });
  }
  return alertas;
}

/* ------------------------------------------------------------------ *
 * Janela de compra (regra do dia de corte)
 * ------------------------------------------------------------------ */

/** Extrai o dia do mês (1..31) de uma data ISO YYYY-MM-DD. */
export function diaDoMes(dataISO: string): number {
  const d = Number(dataISO.slice(8, 10));
  return Number.isFinite(d) ? d : 0;
}

/**
 * A janela de compra está FECHADA quando o dia é >= diaCorte.
 * Ex.: diaCorte=24 => compras permitidas do dia 1 ao 23; dia 24+ é "compra zero".
 */
export function janelaFechada(dataISO: string, diaCorte: number): boolean {
  const dia = diaDoMes(dataISO);
  return dia >= diaCorte;
}

/** Alerta da janela de compra para uma data. */
export function validarJanelaCompra(dataISO: string, diaCorte: number): Alerta[] {
  if (!dataISO) return [];
  if (janelaFechada(dataISO, diaCorte)) {
    return [
      {
        tipo: "err",
        msg:
          `Esta data (dia ${diaDoMes(dataISO)}) está na janela de compra zero. ` +
          `Compras são permitidas apenas do dia 1 ao ${diaCorte - 1}.`,
      },
    ];
  }
  // aviso quando está chegando perto do corte
  const dia = diaDoMes(dataISO);
  if (dia >= diaCorte - 2 && dia < diaCorte) {
    return [
      {
        tipo: "warn",
        msg: `A janela de compra fecha no dia ${diaCorte} (faltam ${diaCorte - dia} dia(s)).`,
      },
    ];
  }
  return [];
}

/* ------------------------------------------------------------------ *
 * Estoque
 * ------------------------------------------------------------------ */

/** Item está com estoque baixo quando a quantidade <= estoque mínimo (e min > 0). */
export function estoqueBaixo(item: ItemEstoque): boolean {
  return item.estoqueMin > 0 && item.quantidade <= item.estoqueMin;
}

/** Lista de alertas de itens com estoque baixo. */
export function alertasEstoque(itens: ItemEstoque[]): Alerta[] {
  return itens.filter(estoqueBaixo).map((item) => ({
    tipo: "warn" as const,
    msg: `Estoque baixo: "${item.nome}" com ${item.quantidade} ${item.unidade} (mínimo ${item.estoqueMin}).`,
  }));
}
