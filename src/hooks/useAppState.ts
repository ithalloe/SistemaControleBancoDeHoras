import { useCallback, useEffect, useState } from "react";
import type { AppState, Config, Demanda, Ponto } from "../types";
import { defaultConfig } from "../types";
import {
  addDemandaRemoto,
  carregarEstadoRemoto,
  moverDemandaRemoto,
  recalcularPontosRemoto,
  removerDemandaRemoto,
  removerPontoRemoto,
  salvarConfigRemoto,
  upsertPontoRemoto,
} from "../lib/repo";

const ESTADO_VAZIO: AppState = { config: { ...defaultConfig }, pontos: [], demandas: [] };

/**
 * Estado da aplicação persistido no Supabase (Postgres) do usuário logado.
 * As mutações escrevem no banco e, em sucesso, atualizam o estado local
 * com o registro retornado (garante ids reais do banco).
 */
export function useAppState() {
  const [state, setState] = useState<AppState>(ESTADO_VAZIO);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setState(await carregarEstadoRemoto());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar os dados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const upsertPonto = useCallback(async (ponto: Ponto) => {
    const salvo = await upsertPontoRemoto(ponto);
    setState((prev) => {
      const existe = prev.pontos.some((p) => p.data === salvo.data);
      const pontos = existe
        ? prev.pontos.map((p) => (p.data === salvo.data ? salvo : p))
        : [...prev.pontos, salvo];
      return { ...prev, pontos };
    });
  }, []);

  const removerPonto = useCallback(async (id: string) => {
    await removerPontoRemoto(id);
    setState((prev) => ({ ...prev, pontos: prev.pontos.filter((p) => p.id !== id) }));
  }, []);

  const addDemanda = useCallback(async (demanda: Demanda) => {
    const salva = await addDemandaRemoto(demanda);
    setState((prev) => ({ ...prev, demandas: [...prev.demandas, salva] }));
  }, []);

  const moverDemanda = useCallback(async (id: string, status: Demanda["status"]) => {
    await moverDemandaRemoto(id, status);
    setState((prev) => ({
      ...prev,
      demandas: prev.demandas.map((d) => (d.id === id ? { ...d, status } : d)),
    }));
  }, []);

  const removerDemanda = useCallback(async (id: string) => {
    await removerDemandaRemoto(id);
    setState((prev) => ({ ...prev, demandas: prev.demandas.filter((d) => d.id !== id) }));
  }, []);

  const salvarConfig = useCallback(
    async (config: Config) => {
      await salvarConfigRemoto(config);
      // recalcula e persiste os pontos com a nova meta, depois atualiza o estado
      const pontosAtualizados = await recalcularPontosRemoto(state.pontos, config.metaMin);
      setState((prev) => ({ ...prev, config, pontos: pontosAtualizados }));
    },
    [state.pontos]
  );

  return {
    state,
    loading,
    error,
    recarregar,
    upsertPonto,
    removerPonto,
    addDemanda,
    moverDemanda,
    removerDemanda,
    salvarConfig,
  };
}
