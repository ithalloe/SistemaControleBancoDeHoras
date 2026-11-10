import { useCallback, useEffect, useState } from "react";
import type { Camera, StatusCamera } from "../types";
import {
  adicionarCamera,
  atualizarCamera,
  atualizarStatusCamera,
  carregarCameras,
  removerCamera,
} from "../lib/repoCameras";

/**
 * Estado do módulo de Câmeras, persistido no Supabase.
 * Cada ação escreve no banco e atualiza o estado local com o retorno.
 */
export function useCameras() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCameras(await carregarCameras());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar as câmeras.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const criar = useCallback(async (c: Omit<Camera, "id" | "criadoEm">) => {
    const salva = await adicionarCamera(c);
    setCameras((prev) =>
      [...prev, salva].sort(
        (a, b) =>
          a.dvr.localeCompare(b.dvr) ||
          a.regiao.localeCompare(b.regiao) ||
          a.nome.localeCompare(b.nome)
      )
    );
    return salva;
  }, []);

  const editar = useCallback(async (c: Camera) => {
    const salva = await atualizarCamera(c);
    setCameras((prev) =>
      prev
        .map((x) => (x.id === salva.id ? salva : x))
        .sort(
          (a, b) =>
            a.dvr.localeCompare(b.dvr) ||
            a.regiao.localeCompare(b.regiao) ||
            a.nome.localeCompare(b.nome)
        )
    );
    return salva;
  }, []);

  const mudarStatus = useCallback(async (id: string, status: StatusCamera) => {
    await atualizarStatusCamera(id, status);
    setCameras((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
  }, []);

  const excluir = useCallback(async (id: string) => {
    await removerCamera(id);
    setCameras((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { cameras, loading, error, recarregar, criar, editar, mudarStatus, excluir };
}
