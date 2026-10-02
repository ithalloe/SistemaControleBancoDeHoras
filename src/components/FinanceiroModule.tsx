import { useState } from "react";
import { useFinanceiro } from "../hooks/useFinanceiro";
import { FinanceiroView } from "./FinanceiroView";
import { ComprasView } from "./ComprasView";
import { EstoqueView } from "./EstoqueView";
import { hoje } from "../lib/tempo";

type SubView = "verba" | "compras" | "estoque";

const SUBABAS: { view: SubView; label: string }[] = [
  { view: "verba", label: "Verba" },
  { view: "compras", label: "Compras" },
  { view: "estoque", label: "Estoque" },
];

interface Props {
  /** Dia de corte da janela de compra (vem da config do usuário). */
  diaCorte: number;
}

export function FinanceiroModule({ diaCorte }: Props) {
  const [sub, setSub] = useState<SubView>("verba");
  const [mesAtual, setMesAtual] = useState<string>(hoje().slice(0, 7));
  const {
    state,
    loading,
    error,
    recarregar,
    definirOrcamento,
    novaCompra,
    mudarStatusCompra,
    excluirCompra,
    novoItem,
    excluirItem,
    movimentar,
  } = useFinanceiro();

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

  return (
    <>
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

      {sub === "verba" && (
        <FinanceiroView
          orcamentos={state.orcamentos}
          compras={state.compras}
          mesAtual={mesAtual}
          onMudarMes={setMesAtual}
          onDefinirVerba={definirOrcamento}
        />
      )}
      {sub === "compras" && (
        <ComprasView
          compras={state.compras}
          itens={state.itens}
          diaCorte={diaCorte}
          onNovaCompra={novaCompra}
          onMudarStatus={mudarStatusCompra}
          onExcluir={excluirCompra}
          onMovimentar={movimentar}
        />
      )}
      {sub === "estoque" && (
        <EstoqueView
          itens={state.itens}
          movimentacoes={state.movimentacoes}
          onNovoItem={novoItem}
          onExcluirItem={excluirItem}
          onMovimentar={movimentar}
        />
      )}
    </>
  );
}
