import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Content-Security-Policy restritiva para PRODUÇÃO.
 * O app não carrega recursos externos, não faz requests de rede e não
 * usa scripts inline, então a política pode ser bastante fechada.
 * 'unsafe-inline' em style-src é necessário porque o app usa alguns
 * estilos inline (ex.: input de arquivo oculto) e o Vite pode emitir
 * estilos críticos inline.
 */
const PROD_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

/** Injeta a meta CSP no index.html apenas no build de produção. */
function cspProdPlugin(): Plugin {
  return {
    name: "csp-prod",
    apply: "build",
    transformIndexHtml(html) {
      return html.replace(
        "</title>",
        `</title>\n    <meta http-equiv="Content-Security-Policy" content="${PROD_CSP}" />`
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), cspProdPlugin()],
  server: {
    headers: {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
    },
  },
});
