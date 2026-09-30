import type { Alerta } from "../types";

interface Props {
  alertas: Alerta[];
}

export function Alertas({ alertas }: Props) {
  if (alertas.length === 0) {
    return (
      <div className="alerts">
        <div className="alert ok">&#10003; Dentro dos limites legais.</div>
      </div>
    );
  }
  return (
    <div className="alerts">
      {alertas.map((a, i) => (
        <div key={i} className={`alert ${a.tipo === "err" ? "err" : "warn"}`}>
          {a.tipo === "err" ? "\u26A0 " : "\u2139 "}
          {a.msg}
        </div>
      ))}
    </div>
  );
}
