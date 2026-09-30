import { useMemo } from "react";
import type { Config, Ponto } from "../types";
import { fmtDataBR, fmtDur } from "../lib/tempo";

interface Props {
  config: Config;
  pontos: Ponto[];
}

export function BancoView({ config, pontos }: Props) {
  const { linhas, acumulado, totalExtra } = useMemo(() => {
    const ordenados = pontos.slice().sort((a, b) => a.data.localeCompare(b.data));
    let acc = 0;
    let extra = 0;
    const rows = ordenados.map((p) => {
      acc += p.saldoMin;
      extra += p.extraMin;
      return { ...p, acumulado: acc };
    });
    return { linhas: rows, acumulado: acc, totalExtra: extra };
  }, [pontos]);

  return (
    <section className="view">
      <div className="grid-3">
        <div className="card stat">
          <p className="stat-label">Saldo do banco de horas</p>
          <p className={`stat-value ${acumulado >= 0 ? "pos" : "neg"}`}>{fmtDur(acumulado)}</p>
        </div>
        <div className="card stat">
          <p className="stat-label">Total de horas extras</p>
          <p className="stat-value">{fmtDur(totalExtra)}</p>
        </div>
        <div className="card stat">
          <p className="stat-label">Dias registrados</p>
          <p className="stat-value">{pontos.length}</p>
        </div>
      </div>

      <div className="card">
        <h2>Histórico e saldo acumulado</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Trabalhado</th>
              <th>Meta</th>
              <th>Saldo do dia</th>
              <th>Saldo acumulado</th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  Sem registros.
                </td>
              </tr>
            ) : (
              linhas.map((l) => (
                <tr key={l.id}>
                  <td>{fmtDataBR(l.data)}</td>
                  <td>{fmtDur(l.trabalhadoMin)}</td>
                  <td>{fmtDur(config.metaMin)}</td>
                  <td className={l.saldoMin >= 0 ? "pos" : "neg"}>{fmtDur(l.saldoMin)}</td>
                  <td className={l.acumulado >= 0 ? "pos" : "neg"}>{fmtDur(l.acumulado)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
