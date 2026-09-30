/** Utilidades de tempo puras e tipadas. */

/** "HH:MM" -> minutos desde 00:00 (ou null se inválido) */
export function toMin(hhmm: string): number | null {
  if (!hhmm) return null;
  const parts = hhmm.split(":").map(Number);
  const [h, m] = parts;
  if (parts.length < 2 || Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

/** minutos -> "Xh YYmin" (aceita negativo) */
export function fmtDur(min: number): string {
  const sign = min < 0 ? "-" : "";
  const abs = Math.abs(Math.round(min));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}h${m.toString().padStart(2, "0")}`;
}

/** minutos desde 00:00 -> "HH:MM" */
export function minToHHMM(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/** ISO YYYY-MM-DD -> DD/MM/YYYY */
export function fmtDataBR(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
