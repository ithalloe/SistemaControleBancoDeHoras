import { useMemo, useState } from "react";
import type { Config, Ponto } from "../types";
import { calcularPonto, statusPonto, validarLegal } from "../lib/jornada";
import { fmtDataBR, fmtDur, hoje, uid } from "../lib/tempo";
import { Alertas } from "./Alertas";

interface Props {
  config: Config;
  pontos: Ponto[];
  onSalvar: (p: Ponto) => void | Promise<void>;
  onRemover: (id: string) => void | Promise<void>;
}

export function PontoView({ config, pontos, onSalvar, onRemover }: Props) {
  const [data, setData] = useState<string>(hoje());
  const [entrada, setEntrada] = useState<string>("07:30");
  const [saida, setSaida] = useState<string>("17:18");
  const [almoco, setAlmoco] = useState<number>(60);
  const [obs, setObs] = useState<string>("");

  const calc = useMemo(
    () => calcularPonto(entrada, saida, almoco, config),
    [entrada, saida, almoco, config]
  );

  const alertas = useMemo(() => {
    if (!calc) return [];
    return validarLegal(
      data,
      { extraMin: calc.extraMin, entradaMin: calc.entradaMin, saidaMin: calc.saidaMin },
      config,
      pontos
    );
  }, [calc, data, config, pontos]);

  const pontosOrdenados = useMemo(
    () => pontos.slice().sort((a, b) => b.data.localeCompare(a.data)),
    [pontos]
  );

  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!calc) {
      alert("Preencha entrada e saída.");
      return;
    }
    const existente = pontos.find((p) => p.data === data);
    const registro: Ponto = {
      id: existente ? existente.id : uid(),
      data,
      entrada,
      saida,
      almocoMin: almoco,
      obs,
      trabalhadoMin: calc.trabalhadoMin,
      extraMin: calc.extraMin,
      saldoMin: calc.saldoMin,
      entradaMin: calc.entradaMin,
      saidaMin: calc.saidaMin,
    };
    setSalvando(true);
    try {
      await onSalvar(registro);
      setObs("");
    } catch {
      alert("Não foi possível salvar o registro. Verifique sua conexão e tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  async function remover(id: string) {
    try {
      await onRemover(id);
    } catch {
      alert("Não foi possível excluir o registro.");
    }
  }

  return (
    <section className="view">
      <div className="grid">
        <div className="card">
          <h2>Registrar ponto</h2>
          <div className="field">
            <label>Data</label>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="row">
            <div className="field">
              <label>Entrada</label>
              <input type="time" value={entrada} onChange={(e) => setEntrada(e.target.value)} />
            </div>
            <div className="field">
              <label>Saída</label>
              <input type="time" value={saida} onChange={(e) => setSaida(e.target.value)} />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label>Almoço (min)</label>
              <input
                type="number"
                min={0}
                step={5}
                value={almoco}
                onChange={(e) => setAlmoco(parseInt(e.target.value, 10) || 0)}
              />
            </div>
            <div className="field">
              <label>Observação</label>
              <input
                type="text"
                value={obs}
                placeholder="opcional"
                onChange={(e) => setObs(e.target.value)}
              />
            </div>
          </div>
          <Alertas alertas={alertas} />
          <div className="actions">
            <button className="btn primary" onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar registro"}
            </button>
          </div>
        </div>

        <div className="card">
          <h2>Resumo do dia</h2>
          {calc ? (
            <div className="resumo">
              <div className="line">
                <span>Tempo trabalhado</span>
                <span>{fmtDur(calc.trabalhadoMin)}</span>
              </div>
              <div className="line">
                <span>Meta do dia</span>
                <span>{fmtDur(config.metaMin)}</span>
              </div>
              <div className="line">
                <span>Horas extras</span>
                <span>{fmtDur(calc.extraMin)}</span>
              </div>
              <div className="line">
                <span>Saldo do dia</span>
                <span className={calc.saldoMin >= 0 ? "pos" : "neg"}>{fmtDur(calc.saldoMin)}</span>
              </div>
              {calc.virouDia && <p className="small muted">Jornada terminou após a meia-noite.</p>}
            </div>
          ) : (
            <p className="muted">Preencha os horários para ver o cálculo.</p>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Registros de ponto</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Entrada</th>
              <th>Saída</th>
              <th>Almoço</th>
              <th>Trabalhado</th>
              <th>Extra</th>
              <th>Saldo</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pontosOrdenados.length === 0 ? (
              <tr>
                <td colSpan={9} className="muted">
                  Nenhum registro ainda.
                </td>
              </tr>
            ) : (
              pontosOrdenados.map((p) => {
                const st = statusPonto(p, config, pontos);
                return (
                  <tr key={p.id}>
                    <td>{fmtDataBR(p.data)}</td>
                    <td>{p.entrada}</td>
                    <td>{p.saida}</td>
                    <td>{p.almocoMin}min</td>
                    <td>{fmtDur(p.trabalhadoMin)}</td>
                    <td>{fmtDur(p.extraMin)}</td>
                    <td className={p.saldoMin >= 0 ? "pos" : "neg"}>{fmtDur(p.saldoMin)}</td>
                    <td>
                      <span className={`badge ${st.cls}`}>{st.txt}</span>
                    </td>
                    <td>
                      <button className="btn danger small" onClick={() => remover(p.id)}>
                        Excluir
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
