import { useState } from "react";
import type { AppState, Config } from "../types";
import { minToHHMM, toMin, hoje } from "../lib/tempo";

interface Props {
  config: Config;
  state: AppState;
  onSalvar: (c: Config) => void | Promise<void>;
}

export function ConfigView({ config, state, onSalvar }: Props) {
  const [meta, setMeta] = useState<string>(minToHHMM(config.metaMin));
  const [maxExtra, setMaxExtra] = useState<number>(config.maxExtraMin);
  const [inter, setInter] = useState<number>(config.interjornadaH);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    const metaMin = toMin(meta);
    const nova: Config = {
      metaMin: metaMin ?? config.metaMin,
      maxExtraMin: Number.isNaN(maxExtra) ? config.maxExtraMin : maxExtra,
      interjornadaH: Number.isNaN(inter) ? config.interjornadaH : inter,
    };
    setSalvando(true);
    try {
      await onSalvar(nova);
      alert("Configuração salva.");
    } catch {
      alert("Não foi possível salvar a configuração.");
    } finally {
      setSalvando(false);
    }
  }

  function exportar() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-jornada-${hoje()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="view">
      <div className="card">
        <h2>Configuração da jornada</h2>
        <div className="row">
          <div className="field">
            <label>Meta diária (h:min)</label>
            <input type="time" value={meta} onChange={(e) => setMeta(e.target.value)} />
          </div>
          <div className="field">
            <label>Máx. hora extra/dia (min)</label>
            <input
              type="number"
              min={0}
              step={10}
              value={maxExtra}
              onChange={(e) => setMaxExtra(parseInt(e.target.value, 10))}
            />
          </div>
          <div className="field">
            <label>Descanso mínimo (h)</label>
            <input
              type="number"
              min={0}
              step={1}
              value={inter}
              onChange={(e) => setInter(parseInt(e.target.value, 10))}
            />
          </div>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar configuração"}
          </button>
        </div>
        <p className="muted small">
          Padrão CLT: máx. 2h extras/dia e 11h de descanso entre jornadas. A meta 08:48 corresponde
          a 44h semanais (entrada 07:30, saída 17:18, 1h de almoço).
        </p>
      </div>

      <div className="card">
        <h2>Backup</h2>
        <p className="muted">
          Seus dados ficam salvos na sua conta (nuvem) e sincronizam entre dispositivos. Você pode
          baixar uma cópia local a qualquer momento.
        </p>
        <div className="actions">
          <button className="btn ghost" onClick={exportar}>
            Exportar backup (JSON)
          </button>
        </div>
      </div>
    </section>
  );
}
