import { useCallback, useEffect, useState } from "react";
import type {
  Compra,
  FinanceiroState,
  ItemEstoque,
  Movimentacao,
  Orcamento,
  StatusCompra,
} from "../types";
import {
  adicionarCompra,
  adicionarItem,
  atualizarStatusCompra,
  carregarFinanceiro,
  registrarMovimentacao,
  removerCompra,
  removerItem,
  salvarOrcamento,
} from "../lib/repoFinanceiro";

const VAZIO: FinanceiroState = { orcamentos: [], compras: [], itens: [], movimentacoes: [] };

/**
 * Estado do módulo financeiro + estoque, persistido no Supabase.
 * Cada ação escreve no banco e atualiza o estado local com o retorno.
 */
export function useFinanceiro() {
  const [state, setState] = useState<FinanceiroState>(VAZIO);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setState(await carregarFinanceiro());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar dados financeiros.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  /* ----- Orçamento (verba do mês) ----- */
  const definirOrcamento = useCallback(async (o: Omit<Orcamento, "id">) => {
    const salvo = await salvarOrcamento(o);
    setState((prev) => {
      const existe = prev.orcamentos.some((x) => x.competencia === salvo.competencia);
      const orcamentos = existe
        ? prev.orcamentos.map((x) => (x.competencia === salvo.competencia ? salvo : x))
        : [...prev.orcamentos, salvo];
      return { ...prev, orcamentos };
    });
  }, []);

  /* ----- Compras ----- */
  const novaCompra = useCallback(async (c: Omit<Compra, "id">) => {
    const salva = await adicionarCompra(c);
    setState((prev) => ({ ...prev, compras: [salva, ...prev.compras] }));
    return salva;
  }, []);

  const mudarStatusCompra = useCallback(async (id: string, status: StatusCompra) => {
    await atualizarStatusCompra(id, status);
    setState((prev) => ({
      ...prev,
      compras: prev.compras.map((c) => (c.id === id ? { ...c, status } : c)),
    }));
  }, []);

  const excluirCompra = useCallback(async (id: string) => {
    await removerCompra(id);
    setState((prev) => ({ ...prev, compras: prev.compras.filter((c) => c.id !== id) }));
  }, []);

  /* ----- Itens de estoque ----- */
  const novoItem = useCallback(async (i: Omit<ItemEstoque, "id">) => {
    const salvo = await adicionarItem(i);
    setState((prev) => ({ ...prev, itens: [...prev.itens, salvo] }));
    return salvo;
  }, []);

  const excluirItem = useCallback(async (id: string) => {
    await removerItem(id);
    setState((prev) => ({
      ...prev,
      itens: prev.itens.filter((i) => i.id !== id),
      movimentacoes: prev.movimentacoes.filter((m) => m.itemId !== id),
    }));
  }, []);

  /* ----- Movimentações de estoque ----- */
  const movimentar = useCallback(
    async (mov: Omit<Movimentacao, "id">) => {
      const item = state.itens.find((i) => i.id === mov.itemId);
      if (!item) throw new Error("Item não encontrado.");
      const { movimentacao, novaQuantidade } = await registrarMovimentacao(mov, item.quantidade);
      setState((prev) => ({
        ...prev,
        itens: prev.itens.map((i) =>
          i.id === mov.itemId ? { ...i, quantidade: novaQuantidade } : i
        ),
        movimentacoes: [movimentacao, ...prev.movimentacoes],
      }));
    },
    [state.itens]
  );

  return {
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
  };
}
