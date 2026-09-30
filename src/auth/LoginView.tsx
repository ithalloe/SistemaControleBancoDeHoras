import { useState } from "react";
import { useAuth } from "./context";

export function LoginView() {
  const { signIn, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    setCarregando(true);
    try {
      await signIn(email.trim(), senha);
    } catch {
      // erro já tratado no contexto
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="logo">&#9202;</span>
          <h1>Controle de Jornada</h1>
        </div>
        <p className="muted small">Entre com sua conta.</p>

        <form onSubmit={enviar}>
          <div className="field">
            <label>E-mail</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Senha</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>

          {error && <div className="alert err">{error}</div>}

          <button className="btn primary block" type="submit" disabled={carregando}>
            {carregando ? "Aguarde..." : "Entrar"}
          </button>
        </form>

        <p className="small muted auth-note">
          Seus dados ficam salvos na sua conta e sincronizam entre dispositivos.
        </p>
      </div>
    </div>
  );
}
