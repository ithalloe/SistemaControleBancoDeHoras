import type { Camera, StatusCamera } from "../types";
import { fmtDataBR } from "./tempo";

const LABEL_STATUS: Record<StatusCamera, string> = {
  ativa: "Ativa",
  inativa: "Inativa",
  manutencao: "Em manutenção",
  defeito: "Com defeito",
};

const LABEL_TIPO: Record<Camera["tipo"], string> = {
  interna: "Interna",
  externa: "Externa",
};

/** Escapa texto para injeção segura no HTML do relatório. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Agrupa câmeras por DVR (nível 1) e, dentro de cada DVR, por região (nível 2).
 * Mantém ordem alfabética em ambos os níveis.
 */
function agruparPorDvr(cameras: Camera[]): Map<string, Map<string, Camera[]>> {
  const grupos = new Map<string, Map<string, Camera[]>>();
  const ordenadas = cameras
    .slice()
    .sort(
      (a, b) =>
        a.dvr.localeCompare(b.dvr) ||
        a.regiao.localeCompare(b.regiao) ||
        a.nome.localeCompare(b.nome)
    );
  for (const c of ordenadas) {
    const chaveDvr = c.dvr.trim() || "(Sem DVR)";
    const chaveRegiao = c.regiao.trim() || "(Sem região)";
    if (!grupos.has(chaveDvr)) grupos.set(chaveDvr, new Map());
    const regioes = grupos.get(chaveDvr)!;
    const lista = regioes.get(chaveRegiao) ?? [];
    lista.push(c);
    regioes.set(chaveRegiao, lista);
  }
  return grupos;
}

/** Conta câmeras por status. */
function contarPorStatus(cameras: Camera[]): Record<StatusCamera, number> {
  const base: Record<StatusCamera, number> = {
    ativa: 0,
    inativa: 0,
    manutencao: 0,
    defeito: 0,
  };
  for (const c of cameras) base[c.status]++;
  return base;
}

function montarHtml(cameras: Camera[]): string {
  const total = cameras.length;
  const contagem = contarPorStatus(cameras);
  const grupos = agruparPorDvr(cameras);
  const geradoEm = fmtDataBR(new Date().toISOString().slice(0, 10));

  const resumo = `
    <div class="resumo">
      <div class="box"><span class="num">${total}</span><span class="rot">Total</span></div>
      <div class="box ok"><span class="num">${contagem.ativa}</span><span class="rot">Ativas</span></div>
      <div class="box warn"><span class="num">${contagem.manutencao}</span><span class="rot">Em manutenção</span></div>
      <div class="box err"><span class="num">${contagem.defeito}</span><span class="rot">Com defeito</span></div>
      <div class="box"><span class="num">${contagem.inativa}</span><span class="rot">Inativas</span></div>
    </div>`;

  let secoes = "";

  if (total === 0) {
    secoes = `<p class="vazio">Nenhuma câmera cadastrada.</p>`;
  } else {
    for (const [dvrNome, regioes] of grupos) {
      // Conta total do DVR
      let totalDvr = 0;
      for (const lista of regioes.values()) totalDvr += lista.length;

      secoes += `<h2 class="dvr-titulo">${esc(dvrNome)} <span class="cnt">(${totalDvr} câmera${totalDvr !== 1 ? "s" : ""})</span></h2>`;

      for (const [regiao, lista] of regioes) {
        const linhas = lista
          .map(
            (c) => `
            <tr class="st-${c.status}">
              <td>${esc(c.nome)}</td>
              <td>${LABEL_TIPO[c.tipo]}</td>
              <td>${LABEL_STATUS[c.status]}</td>
              <td>${esc(c.cobertura) || "-"}</td>
              <td>${esc(c.obs) || "-"}</td>
            </tr>`
          )
          .join("");

        secoes += `
          <h3>${esc(regiao)} <span class="cnt">(${lista.length})</span></h3>
          <table>
            <thead>
              <tr><th>Câmera</th><th>Tipo</th><th>Status</th><th>Cobertura</th><th>Observações</th></tr>
            </thead>
            <tbody>${linhas}</tbody>
          </table>`;
      }
    }
  }

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Relatório de Câmeras</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; margin: 32px; }
  header { border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 20px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .sub { color: #666; font-size: 12px; }
  .resumo { display: flex; gap: 10px; margin: 18px 0 24px; flex-wrap: wrap; }
  .box { flex: 1; min-width: 90px; border: 1px solid #ddd; border-radius: 8px;
         padding: 10px 12px; text-align: center; }
  .box .num { display: block; font-size: 22px; font-weight: 700; }
  .box .rot { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: .5px; }
  .box.ok { border-color: #1a7f37; } .box.ok .num { color: #1a7f37; }
  .box.warn { border-color: #b26a00; } .box.warn .num { color: #b26a00; }
  .box.err { border-color: #c62828; } .box.err .num { color: #c62828; }
  h2.dvr-titulo {
    font-size: 15px; margin: 28px 0 6px;
    border-left: 5px solid #333; padding: 4px 0 4px 10px;
    background: #f7f7f7; page-break-after: avoid;
  }
  h3 { font-size: 13px; margin: 14px 0 6px; border-left: 3px solid #999; padding-left: 8px; }
  h2 .cnt, h3 .cnt { color: #888; font-weight: normal; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 10px; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f3f3f3; }
  tr.st-defeito td { background: #fdecea; }
  tr.st-manutencao td { background: #fff6e5; }
  tr.st-inativa td { color: #888; }
  .vazio { color: #888; }
  footer { margin-top: 28px; font-size: 10px; color: #999; text-align: center; }
  @media print { body { margin: 12mm; } }
</style>
</head>
<body>
  <header>
    <h1>Relatório de Câmeras — Ambiente Escolar</h1>
    <div class="sub">Gerado em ${geradoEm} &middot; ${total} câmera(s) cadastrada(s)</div>
  </header>
  ${resumo}
  ${secoes}
  <footer>Documento gerado automaticamente pelo Sistema de Controle.</footer>
</body>
</html>`;
}

/**
 * Abre uma janela com o relatório formatado e dispara a impressão,
 * permitindo ao usuário "Salvar como PDF" pelo diálogo do navegador.
 */
export function gerarRelatorioPdf(cameras: Camera[]): void {
  const html = montarHtml(cameras);
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    alert("Não foi possível abrir a janela do relatório. Verifique o bloqueador de pop-ups.");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  win.onload = () => {
    win.print();
  };
}
