import { useMemo, useState } from "react";
import type { Demanda, Prioridade, StatusDemanda } from "../types";
import { fmtDataBR, hoje, uid } from "../lib/tempo";

interface Props {
  demandas: Demanda[];
  onAdd: (d: Demanda) => void | Promise<void>;
  onMover: (id: string, status: StatusDemanda) => void | Promise<void>;
  onRemover: (id: string) => void | Promise<void>;
}

const COLUNAS: { status: StatusDemanda; titulo: string }[] = [
  { status: "afazer", titulo: "A fazer" },
  { status: "fazendo", titulo: "Fazendo" },
  { status: "feito", titulo: "Feito" },
];

const ORDEM_PRIORIDADE: Record<Prioridade, number> = { alta: 0, media: 1, baixa: 2 };

export function DemandasView({ demandas, onAdd, onMover, onRemover }: Props) {
  const [titulo, setTitulo] = useState("");
  const [origem, setOrigem] = useState("");
  const [prioridade, setPrioridade] = useState<Prioridade>("media");
  const [prazo, setPrazo] = useState("");
  const [desc, setDesc] = useState("");

  const ordenadas = useMemo(() => {
    return demandas.slice().sort((a, b) => {
      if (ORDEM_PRIORIDADE[a.prioridade] !== ORDEM_PRIORIDADE[b.prioridade]) {
        return ORDEM_PRIORIDADE[a.prioridade] - ORDEM_PRIORIDADE[b.prioridade];
      }
      return (a.prazo || "9999").localeCompare(b.prazo || "9999");
    });
  }, [demandas]);

  const [salvando, setSalvando] = useState(false);

  async function adicionar() {
    if (!titulo.trim()) {
      alert("Informe o título da demanda.");
      return;
    }
    const nova: Demanda = {
      id: uid(),
      titulo: titulo.trim(),
      origem: origem.trim(),
      prioridade,
      prazo,
      desc: desc.trim(),
      status: "afazer",
      criadoEm: hoje(),
    };
    setSalvando(true);
    try {
      await onAdd(nova);
      setTitulo("");
      setOrigem("");
      setPrazo("");
      setDesc("");
      setPrioridade("media");
    } catch {
      alert("Não foi possível adicionar a demanda.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="view">
      <div className="card">
        <h2>Nova demanda</h2>
        <div className="row">
          <div className="field grow">
            <label>Título</label>
            <input
              type="text"
              value={titulo}
              placeholder="O que precisa ser feito"
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Origem</label>
            <input
              type="text"
              value={origem}
              placeholder="Quem pediu"
              onChange={(e) => setOrigem(e.target.value)}
            />
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label>Prioridade</label>
            <select
              value={prioridade}
              onChange={(e) => setPrioridade(e.target.value as Prioridade)}
            >
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
          </div>
          <div className="field">
            <label>Prazo</label>
            <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
          </div>
          <div className="field grow">
            <label>Descrição</label>
            <input
              type="text"
              value={desc}
              placeholder="opcional"
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={adicionar} disabled={salvando}>
            {salvando ? "Adicionando..." : "Adicionar demanda"}
          </button>
        </div>
      </div>

      <div className="board">
        {COLUNAS.map((col) => {
          const itens = ordenadas.filter((d) => d.status === col.status);
          return (
            <div className="column" key={col.status}>
              <h3>
                {col.titulo} <span className="count">{itens.length}</span>
              </h3>
              <div className="column-body">
                {itens.length === 0 ? (
                  <p className="muted small">Vazio</p>
                ) : (
                  itens.map((d) => (
                    <CardDemanda key={d.id} demanda={d} onMover={onMover} onRemover={onRemover} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CardDemanda({
  demanda,
  onMover,
  onRemover,
}: {
  demanda: Demanda;
  onMover: (id: string, status: StatusDemanda) => void | Promise<void>;
  onRemover: (id: string) => void | Promise<void>;
}) {
  const atrasada = demanda.prazo !== "" && demanda.status !== "feito" && demanda.prazo < hoje();
  return (
    <div className={`task ${demanda.prioridade}`}>
      <div className="t-title">{demanda.titulo}</div>
      <div className="t-meta">
        {demanda.origem && <>De: {demanda.origem} &middot; </>}
        Prioridade: {demanda.prioridade} &middot;{" "}
        {demanda.prazo ? (
          <span className={atrasada ? "overdue" : ""}>
            Prazo: {fmtDataBR(demanda.prazo)}
            {atrasada ? " (atrasada)" : ""}
          </span>
        ) : (
          "sem prazo"
        )}
        {demanda.desc && (
          <>
            <br />
            {demanda.desc}
          </>
        )}
      </div>
      <div className="t-actions">
        {demanda.status !== "afazer" && (
          <button className="btn ghost small" onClick={() => onMover(demanda.id, "afazer")}>
            &#8592; A fazer
          </button>
        )}
        {demanda.status !== "fazendo" && (
          <button className="btn ghost small" onClick={() => onMover(demanda.id, "fazendo")}>
            Fazendo
          </button>
        )}
        {demanda.status !== "feito" && (
          <button className="btn ghost small" onClick={() => onMover(demanda.id, "feito")}>
            Feito &#10003;
          </button>
        )}
        <button className="btn danger small" onClick={() => onRemover(demanda.id)}>
          Excluir
        </button>
      </div>
    </div>
  );
}
