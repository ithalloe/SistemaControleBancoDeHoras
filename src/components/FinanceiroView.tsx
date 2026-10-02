import { useMemo, useState } from "react";
import type { Compra, Orcamento } from "../types";
import {
  competenciaParaISO,
  fmtBRL,
  resumoVerbaDoMes,
  rotuloCompetencia,
  validarVerba,
} from "../lib/financeiro";
import { Alertas } from "./Alertas";

interface Props {
  unidadeId: string;
  orcamentos: Orcamento[];
  compras: Compra[];
  mesAtual: string; // YYYY-MM
  onMudarMes: (ym: string) => void;
  onDefinirVerba: (o: Omit<Orcamento, "id">) => void | Promise<void>;
}

export function FinanceiroView({
  unidadeId,
  orcamentos,
  compras,
  mesAtual,
  onMudarMes,
  onDefinirVerba,
}: Props) {
  const orcMes = orcamentos.find((o) => o.competencia.slice(0, 7) === mesAtual);
  const [valor, setValor] = useState<string>(orcMes ? String(orcMes.valor) : "");
  const [salvando, setSalvando] = useState(false);

  const resumo = useMemo(
    () => resumoVerbaDoMes(mesAtual, orcamentos, compras),
    [mesAtual, orcamentos, compras]
  );
  const alertas = useMemo(() => validarVerba(resumo), [resumo]);

  async function salvarVerba() {
    const n = parseFloat(valor.replace(",", "."));
    if (Number.isNaN(n) || n < 0) {
      alert("Informe um valor de verba válido.");
      return;
    }
    setSalvando(true);
    try {
      await onDefinirVerba({
        unidadeId,
        competencia: competenciaParaISO(mesAtual),
        valor: n,
        obs: "",
      });
    } catch {
      alert("Não foi possível salvar a verba.");
    } finally {
      setSalvando(false);
    }
  }

  const pct = Math.min(100, Math.round(resumo.percentUsado));

  return (
    <section className="view">
      <div className="card">
        <h2>Verba do mês</h2>
        <div className="row">
          <div className="field">
            <label>Mês</label>
            <input type="month" value={mesAtual} onChange={(e) => onMudarMes(e.target.value)} />
          </div>
          <div className="field">
            <label>Verba destinada (R$)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={valor}
              placeholder="0,00"
              onChange={(e) => setValor(e.target.value)}
            />
          </div>
          <div className="field" style={{ justifyContent: "flex-end" }}>
            <button className="btn primary" onClick={salvarVerba} disabled={salvando}>
              {salvando ? "Salvando..." : orcMes ? "Atualizar verba" : "Definir verba"}
            </button>
          </div>
        </div>
        <Alertas alertas={alertas} />
      </div>

      <div className="grid-3">
        <div className="card stat">
          <p className="stat-label">Verba ({rotuloCompetencia(mesAtual)})</p>
          <p className="stat-value">{fmtBRL(resumo.verba)}</p>
        </div>
        <div className="card stat">
          <p className="stat-label">Gasto</p>
          <p className="stat-value">{fmtBRL(resumo.gasto)}</p>
        </div>
        <div className="card stat">
          <p className="stat-label">Saldo</p>
          <p className={`stat-value ${resumo.saldo >= 0 ? "pos" : "neg"}`}>
            {fmtBRL(resumo.saldo)}
          </p>
        </div>
      </div>

      <div className="card">
        <h2>Uso da verba</h2>
        <div className="progress">
          <div
            className={`progress-bar ${resumo.saldo < 0 ? "over" : ""}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="small muted">
          {resumo.percentUsado.toFixed(0)}% usado
          {resumo.verba > 0 ? ` de ${fmtBRL(resumo.verba)}` : ""}
        </p>
      </div>
    </section>
  );
}
