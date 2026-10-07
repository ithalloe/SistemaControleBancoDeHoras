import { useMemo, useState } from "react";
import type { Camera, StatusCamera, TipoCamera } from "../types";
import { gerarRelatorioPdf } from "../lib/relatorioCameras";

const LABEL_STATUS: Record<StatusCamera, string> = {
  ativa: "Ativa",
  inativa: "Inativa",
  manutencao: "Em manutenção",
  defeito: "Com defeito",
};

const LABEL_TIPO: Record<TipoCamera, string> = {
  interna: "Interna",
  externa: "Externa",
};

const STATUS_OPCOES: StatusCamera[] = ["ativa", "inativa", "manutencao", "defeito"];

interface Props {
  cameras: Camera[];
  onCriar: (c: Omit<Camera, "id" | "criadoEm">) => Promise<Camera>;
  onEditar: (c: Camera) => Promise<Camera>;
  onMudarStatus: (id: string, status: StatusCamera) => void | Promise<void>;
  onExcluir: (id: string) => void | Promise<void>;
}

export function CamerasView({ cameras, onCriar, onEditar, onMudarStatus, onExcluir }: Props) {
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [regiao, setRegiao] = useState("");
  const [tipo, setTipo] = useState<TipoCamera>("interna");
  const [status, setStatus] = useState<StatusCamera>("ativa");
  const [cobertura, setCobertura] = useState("");
  const [obs, setObs] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [filtroRegiao, setFiltroRegiao] = useState("");

  function limparForm() {
    setEditandoId(null);
    setNome("");
    setRegiao("");
    setTipo("interna");
    setStatus("ativa");
    setCobertura("");
    setObs("");
  }

  function iniciarEdicao(c: Camera) {
    setEditandoId(c.id);
    setNome(c.nome);
    setRegiao(c.regiao);
    setTipo(c.tipo);
    setStatus(c.status);
    setCobertura(c.cobertura);
    setObs(c.obs);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function salvar() {
    if (!nome.trim()) {
      alert("Informe o nome/identificação da câmera.");
      return;
    }
    setSalvando(true);
    try {
      const dados = {
        nome: nome.trim(),
        regiao: regiao.trim(),
        tipo,
        status,
        cobertura: cobertura.trim(),
        obs: obs.trim(),
      };
      if (editandoId) {
        await onEditar({ id: editandoId, criadoEm: "", ...dados });
      } else {
        await onCriar(dados);
      }
      limparForm();
    } catch {
      alert("Não foi possível salvar a câmera.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(c: Camera) {
    if (!confirm(`Excluir a câmera "${c.nome}"? Esta ação é irreversível.`)) return;
    if (editandoId === c.id) limparForm();
    await onExcluir(c.id);
  }

  const regioes = useMemo(() => {
    const set = new Set<string>();
    cameras.forEach((c) => c.regiao.trim() && set.add(c.regiao.trim()));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [cameras]);

  const listaFiltrada = useMemo(() => {
    const base = filtroRegiao ? cameras.filter((c) => c.regiao.trim() === filtroRegiao) : cameras;
    return base
      .slice()
      .sort((a, b) => a.regiao.localeCompare(b.regiao) || a.nome.localeCompare(b.nome));
  }, [cameras, filtroRegiao]);

  const contagem = useMemo(() => {
    const base = { ativa: 0, inativa: 0, manutencao: 0, defeito: 0 } as Record<
      StatusCamera,
      number
    >;
    cameras.forEach((c) => base[c.status]++);
    return base;
  }, [cameras]);

  return (
    <section className="view">
      <div className="card">
        <h2>{editandoId ? "Editar câmera" : "Nova câmera"}</h2>
        <div className="row">
          <div className="field grow">
            <label>Nome / Identificação</label>
            <input
              type="text"
              value={nome}
              placeholder="Ex.: CAM-01, Portaria"
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          <div className="field grow">
            <label>Região / Local</label>
            <input
              type="text"
              value={regiao}
              placeholder="Ex.: Pátio, Bloco A - Corredor"
              list="regioes-existentes"
              onChange={(e) => setRegiao(e.target.value)}
            />
            <datalist id="regioes-existentes">
              {regioes.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label>Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoCamera)}>
              <option value="interna">Interna</option>
              <option value="externa">Externa</option>
            </select>
          </div>
          <div className="field">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as StatusCamera)}>
              {STATUS_OPCOES.map((s) => (
                <option key={s} value={s}>
                  {LABEL_STATUS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="field grow">
            <label>Cobertura (o que a câmera enquadra)</label>
            <input
              type="text"
              value={cobertura}
              placeholder="Ex.: Entrada principal e recepção"
              onChange={(e) => setCobertura(e.target.value)}
            />
          </div>
        </div>
        <div className="row">
          <div className="field grow">
            <label>Observações</label>
            <input
              type="text"
              value={obs}
              placeholder="Opcional"
              onChange={(e) => setObs(e.target.value)}
            />
          </div>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Adicionar câmera"}
          </button>
          {editandoId && (
            <button className="btn ghost" onClick={limparForm} disabled={salvando}>
              Cancelar
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>Câmeras cadastradas</h2>
          <button
            className="btn primary"
            onClick={() => gerarRelatorioPdf(cameras)}
            disabled={cameras.length === 0}
          >
            Gerar relatório (PDF)
          </button>
        </div>

        <div className="resumo-cameras">
          <span className="badge">Total: {cameras.length}</span>
          <span className="badge ok">Ativas: {contagem.ativa}</span>
          <span className="badge warn">Manutenção: {contagem.manutencao}</span>
          <span className="badge err">Defeito: {contagem.defeito}</span>
          <span className="badge">Inativas: {contagem.inativa}</span>
        </div>

        {regioes.length > 0 && (
          <div className="row" style={{ marginTop: 12 }}>
            <div className="field">
              <label>Filtrar por região</label>
              <select value={filtroRegiao} onChange={(e) => setFiltroRegiao(e.target.value)}>
                <option value="">Todas</option>
                {regioes.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Câmera</th>
                <th>Região</th>
                <th>Tipo</th>
                <th>Status</th>
                <th>Cobertura</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
                    Nenhuma câmera cadastrada.
                  </td>
                </tr>
              ) : (
                listaFiltrada.map((c) => (
                  <tr
                    key={c.id}
                    className={
                      c.status === "defeito"
                        ? "linha-alerta"
                        : c.status === "manutencao"
                          ? "linha-aviso"
                          : ""
                    }
                  >
                    <td>
                      {c.nome}
                      {c.obs && <span className="muted small"> &middot; {c.obs}</span>}
                    </td>
                    <td>{c.regiao || "-"}</td>
                    <td>{LABEL_TIPO[c.tipo]}</td>
                    <td>
                      <select
                        value={c.status}
                        onChange={(e) =>
                          void onMudarStatus(c.id, e.target.value as StatusCamera)
                        }
                      >
                        {STATUS_OPCOES.map((s) => (
                          <option key={s} value={s}>
                            {LABEL_STATUS[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{c.cobertura || "-"}</td>
                    <td>
                      <button className="btn ghost small" onClick={() => iniciarEdicao(c)}>
                        Editar
                      </button>{" "}
                      <button className="btn danger small" onClick={() => excluir(c)}>
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
