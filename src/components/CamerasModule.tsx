import { useCameras } from "../hooks/useCameras";
import { CamerasView } from "./CamerasView";

/**
 * Encapsula o carregamento das câmeras (hook + estados de loading/erro)
 * e delega a UI para CamerasView — mesmo padrão do FinanceiroModule.
 */
export function CamerasModule() {
  const { cameras, loading, error, recarregar, criar, editar, mudarStatus, excluir } = useCameras();

  if (loading) return <p className="muted">Carregando câmeras...</p>;
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
    <CamerasView
      cameras={cameras}
      onCriar={criar}
      onEditar={editar}
      onMudarStatus={mudarStatus}
      onExcluir={excluir}
    />
  );
}
