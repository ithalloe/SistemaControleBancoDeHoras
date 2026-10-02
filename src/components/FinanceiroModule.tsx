import { useEffect, useMemo, useState } from "react";
import type { Unidade } from "../types";
import { useFinanceiro } from "../hooks/useFinanceiro";
import { FinanceiroView } from "./FinanceiroView";
import { ComprasView } from "./ComprasView";
import { EstoqueView } from "./EstoqueView";
import { hoje } from "../lib/tempo";

type SubView = "verba" | "compras" | "estoque" | "unidades";

const SUBABAS: { view: SubView; label: string }[] = [
  { view: "verba", label: "Verba" },
  { view: "compras", label: "Compras" },
  { view: "estoque", label: "Estoque" },
  { view: "unidades", label: "Unidades" },
];

interface Props {
  /** Dia de corte da janela de compra (vem da config do usuário). */
  diaCorte: number;
}

export function FinanceiroModule({ diaCorte }: Props) {
  const [sub, setSub] = useState<SubView>("verba");
  const [mesAtual, setMesAtual] = useState<string>(hoje().slice(0, 7));
  const [unidadeAtiva, setUnidadeAtiva] = useState<string>("");
  const {
    state,
    loading,
    error,
    recarregar,
    criarUnidade,
    excluirUnidade,
    definirOrcamento,
    novaCompra,
    mudarStatusCompra,
    excluirCompra,
    novoItem,
    excluirItem,
    movimentar,
  } = useFinanceiro();

  // seleciona a primeira unidade assim que a lista carrega (ou se a ativa sumir)
  useEffect(() => {
    if (state.unidades.length === 0) {
      setUnidadeAtiva("");
      return;
    }
    const existe = state.unidades.some((u) => u.id === unidadeAtiva);
    if (!existe) setUnidadeAtiva(state.unidades[0].id);
  }, [state.unidades, unidadeAtiva]);

  // dados filtrados pela unidade ativa
  const dados = useMemo(() => {
    const itens = state.itens.filter((i) => i.unidadeId === unidadeAtiva);
    const idsItens = new Set(itens.map((i) => i.id));
    return {
      orcamentos: state.orcamentos.filter((o) => o.unidadeId === unidadeAtiva),
      compras: state.compras.filter((c) => c.unidadeId === unidadeAtiva),
      itens,
      movimentacoes: state.movimentacoes.filter((m) => idsItens.has(m.itemId)),
    };
  }, [state, unidadeAtiva]);

  if (loading) return <p className="muted">Carregando dados financeiros...</p>;
  if (error) {
    return (
      <div className="card">
        <div className="alert err">{error}</div>
        <div className="actions">
          <button className="btn primary" onClick={() => void recarregar()}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const semUnidade = state.unidades.length === 0;

  return (
    <>
      {/* Seletor de unidade (CNPJ) */}
      {!semUnidade && (
        <div className="unidade-bar">
          <span className="small muted">Unidade:</span>
          {state.unidades.map((u) => (
            <button
              key={u.id}
              className={`chip ${u.id === unidadeAtiva ? "active" : ""}`}
              onClick={() => setUnidadeAtiva(u.id)}
            >
              {u.nome}
            </button>
          ))}
        </div>
      )}

      <div className="subtabs">
        {SUBABAS.map((s) => (
          <button
            key={s.view}
            className={`tab ${sub === s.view ? "active" : ""}`}
            onClick={() => setSub(s.view)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {sub === "unidades" ? (
        <UnidadesView unidades={state.unidades} onCriar={criarUnidade} onExcluir={excluirUnidade} />
      ) : semUnidade ? (
        <div className="card">
          <p className="muted">
            Nenhuma unidade cadastrada. Vá em <strong>Unidades</strong> e cadastre a primeira (ex.:
            Fundamental, Médio).
          </p>
        </div>
      ) : (
        <>
          {sub === "verba" && (
            <FinanceiroView
              unidadeId={unidadeAtiva}
              orcamentos={dados.orcamentos}
              compras={dados.compras}
              mesAtual={mesAtual}
              onMudarMes={setMesAtual}
              onDefinirVerba={definirOrcamento}
            />
          )}
          {sub === "compras" && (
            <ComprasView
              unidadeId={unidadeAtiva}
              compras={dados.compras}
              itens={dados.itens}
              diaCorte={diaCorte}
              onNovaCompra={novaCompra}
              onMudarStatus={mudarStatusCompra}
              onExcluir={excluirCompra}
              onMovimentar={movimentar}
            />
          )}
          {sub === "estoque" && (
            <EstoqueView
              unidadeId={unidadeAtiva}
              itens={dados.itens}
              movimentacoes={dados.movimentacoes}
              onNovoItem={novoItem}
              onExcluirItem={excluirItem}
              onMovimentar={movimentar}
            />
          )}
        </>
      )}
    </>
  );
}

/* ----------------------- Gestão de unidades ----------------------- */

function UnidadesView({
  unidades,
  onCriar,
  onExcluir,
}: {
  unidades: Unidade[];
  onCriar: (nome: string, cnpj: string) => Promise<Unidade>;
  onExcluir: (id: string) => void | Promise<void>;
}) {
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function adicionar() {
    if (!nome.trim()) {
      alert("Informe o nome da unidade.");
      return;
    }
    setSalvando(true);
    try {
      await onCriar(nome.trim(), cnpj.trim());
      setNome("");
      setCnpj("");
    } catch {
      alert("Não foi possível criar a unidade.");
    } finally {
      setSalvando(false);
    }
  }

  async function remover(u: Unidade) {
    if (
      !confirm(
        `Excluir a unidade "${u.nome}"? Isso remove TODOS os orçamentos, compras e itens de estoque dela. Esta ação é irreversível.`
      )
    ) {
      return;
    }
    await onExcluir(u.id);
  }

  return (
    <section className="view">
      <div className="card">
        <h2>Nova unidade (CNPJ)</h2>
        <div className="row">
          <div className="field grow">
            <label>Nome</label>
            <input
              type="text"
              value={nome}
              placeholder="Ex.: Fundamental, Médio"
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          <div className="field">
            <label>CNPJ (opcional)</label>
            <input type="text" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
          </div>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={adicionar} disabled={salvando}>
            {salvando ? "Criando..." : "Adicionar unidade"}
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Unidades cadastradas</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>CNPJ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {unidades.length === 0 ? (
                <tr>
                  <td colSpan={3} className="muted">
                    Nenhuma unidade cadastrada.
                  </td>
                </tr>
              ) : (
                unidades.map((u) => (
                  <tr key={u.id}>
                    <td>{u.nome}</td>
                    <td>{u.cnpj || "-"}</td>
                    <td>
                      <button className="btn danger small" onClick={() => remover(u)}>
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
