import { useState } from "react";
import { useAppState } from "./hooks/useAppState";
import { PontoView } from "./components/PontoView";
import { BancoView } from "./components/BancoView";
import { DemandasView } from "./components/DemandasView";
import { ConfigView } from "./components/ConfigView";
import { FinanceiroModule } from "./components/FinanceiroModule";
import { useAuth } from "./auth/context";
import { LoginView } from "./auth/LoginView";

type View = "ponto" | "banco" | "demandas" | "financeiro" | "config";

const ABAS: { view: View; label: string }[] = [
  { view: "ponto", label: "Ponto do dia" },
  { view: "banco", label: "Banco de horas" },
  { view: "demandas", label: "Demandas" },
  { view: "financeiro", label: "Financeiro" },
  { view: "config", label: "Config" },
];

/** Decide qual tela mostrar conforme o estado de autenticação. */
export default function App() {
  const { status } = useAuth();

  if (status === "loading") {
    return <TelaCarregando texto="Carregando..." />;
  }
  if (status === "signedOut") return <LoginView />;

  return <AppAutenticado />;
}

function TelaCarregando({ texto }: { texto: string }) {
  return (
    <div className="auth-wrap">
      <p className="muted">{texto}</p>
    </div>
  );
}

function AppAutenticado() {
  const { email, signOut } = useAuth();
  const [view, setView] = useState<View>("ponto");
  const {
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
  } = useAppState();

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="logo">&#9202;</span>
          <div>
            <h1>Controle de Jornada</h1>
            <p className="subtitle">Banco de horas &middot; Limites CLT &middot; Demandas</p>
          </div>
        </div>
        <nav className="tabs">
          {ABAS.map((a) => (
            <button
              key={a.view}
              className={`tab ${view === a.view ? "active" : ""}`}
              onClick={() => setView(a.view)}
            >
              {a.label}
            </button>
          ))}
        </nav>
        <div className="user-area">
          {email && <span className="user-email">{email}</span>}
          <button className="btn ghost small" onClick={() => signOut()}>
            Sair
          </button>
        </div>
      </header>

      <main className="container">
        {loading ? (
          <p className="muted">Carregando seus dados...</p>
        ) : error ? (
          <div className="card">
            <div className="alert err">{error}</div>
            <div className="actions">
              <button className="btn primary" onClick={() => void recarregar()}>
                Tentar novamente
              </button>
            </div>
          </div>
        ) : (
          <>
            {view === "ponto" && (
              <PontoView
                config={state.config}
                pontos={state.pontos}
                onSalvar={upsertPonto}
                onRemover={removerPonto}
              />
            )}
            {view === "banco" && <BancoView config={state.config} pontos={state.pontos} />}
            {view === "demandas" && (
              <DemandasView
                demandas={state.demandas}
                onAdd={addDemanda}
                onMover={moverDemanda}
                onRemover={removerDemanda}
              />
            )}
            {view === "financeiro" && <FinanceiroModule diaCorte={state.config.diaCorteCompra} />}
            {view === "config" && (
              <ConfigView config={state.config} state={state} onSalvar={salvarConfig} />
            )}
          </>
        )}
      </main>
    </>
  );
}
