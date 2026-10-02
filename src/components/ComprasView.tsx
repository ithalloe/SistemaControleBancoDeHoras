import { useMemo, useState } from "react";
import type { Compra, ItemEstoque, Movimentacao, StatusCompra } from "../types";
import { fmtBRL, validarJanelaCompra } from "../lib/financeiro";
import { fmtDataBR, hoje } from "../lib/tempo";
import { Alertas } from "./Alertas";

interface Props {
  unidadeId: string;
  compras: Compra[];
  itens: ItemEstoque[];
  diaCorte: number;
  onNovaCompra: (c: Omit<Compra, "id">) => Promise<Compra>;
  onMudarStatus: (id: string, status: StatusCompra) => void | Promise<void>;
  onExcluir: (id: string) => void | Promise<void>;
  onMovimentar: (mov: Omit<Movimentacao, "id">) => void | Promise<void>;
}

const STATUS_LABEL: Record<StatusCompra, string> = {
  solicitada: "Solicitada",
  comprada: "Comprada",
  recebida: "Recebida",
  cancelada: "Cancelada",
};

export function ComprasView({
  unidadeId,
  compras,
  itens,
  diaCorte,
  onNovaCompra,
  onMudarStatus,
  onExcluir,
  onMovimentar,
}: Props) {
  const [data, setData] = useState(hoje());
  const [descricao, setDescricao] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [categoria, setCategoria] = useState("");
  const [valor, setValor] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [notaFiscal, setNotaFiscal] = useState("");
  const [itemEstoqueId, setItemEstoqueId] = useState("");
  const [abastecer, setAbastecer] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const alertasJanela = useMemo(() => validarJanelaCompra(data, diaCorte), [data, diaCorte]);

  async function salvar() {
    const n = parseFloat(valor.replace(",", "."));
    if (!descricao.trim()) {
      alert("Informe a descrição da compra.");
      return;
    }
    if (Number.isNaN(n) || n < 0) {
      alert("Informe um valor válido.");
      return;
    }
    setSalvando(true);
    try {
      const compra = await onNovaCompra({
        unidadeId,
        data,
        descricao: descricao.trim(),
        fornecedor: fornecedor.trim(),
        categoria: categoria.trim(),
        valor: n,
        quantidade,
        notaFiscal: notaFiscal.trim(),
        status: "comprada",
        itemEstoqueId: itemEstoqueId || null,
      });
      // se vinculada a item e marcada para abastecer, dá entrada no estoque
      if (itemEstoqueId && abastecer) {
        await onMovimentar({
          itemId: itemEstoqueId,
          tipo: "entrada",
          quantidade,
          motivo: `Compra: ${compra.descricao}`,
          data,
        });
      }
      setDescricao("");
      setFornecedor("");
      setCategoria("");
      setValor("");
      setQuantidade(1);
      setNotaFiscal("");
      setItemEstoqueId("");
    } catch {
      alert("Não foi possível registrar a compra.");
    } finally {
      setSalvando(false);
    }
  }

  const comprasOrdenadas = useMemo(
    () => compras.slice().sort((a, b) => b.data.localeCompare(a.data)),
    [compras]
  );

  return (
    <section className="view">
      <div className="card">
        <h2>Nova compra</h2>
        <div className="row">
          <div className="field grow">
            <label>Descrição</label>
            <input
              type="text"
              value={descricao}
              placeholder="O que foi comprado"
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Data</label>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label>Valor total (R$)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={valor}
              placeholder="0,00"
              onChange={(e) => setValor(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Quantidade</label>
            <input
              type="number"
              min={1}
              step={1}
              value={quantidade}
              onChange={(e) => setQuantidade(parseInt(e.target.value, 10) || 1)}
            />
          </div>
          <div className="field">
            <label>Fornecedor</label>
            <input type="text" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} />
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label>Categoria</label>
            <input
              type="text"
              value={categoria}
              placeholder="hardware, licença..."
              onChange={(e) => setCategoria(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Nota fiscal</label>
            <input type="text" value={notaFiscal} onChange={(e) => setNotaFiscal(e.target.value)} />
          </div>
          <div className="field grow">
            <label>Vincular a item de estoque (opcional)</label>
            <select value={itemEstoqueId} onChange={(e) => setItemEstoqueId(e.target.value)}>
              <option value="">— nenhum —</option>
              {itens.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome} ({i.quantidade} {i.unidade})
                </option>
              ))}
            </select>
          </div>
        </div>
        {itemEstoqueId && (
          <label className="checkline">
            <input
              type="checkbox"
              checked={abastecer}
              onChange={(e) => setAbastecer(e.target.checked)}
            />
            Dar entrada de {quantidade} no estoque ao registrar
          </label>
        )}

        <Alertas alertas={alertasJanela} />

        <div className="actions">
          <button className="btn primary" onClick={salvar} disabled={salvando}>
            {salvando ? "Registrando..." : "Registrar compra"}
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Compras</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>Fornecedor</th>
              <th>Categoria</th>
              <th>Valor</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {comprasOrdenadas.length === 0 ? (
              <tr>
                <td colSpan={7} className="muted">
                  Nenhuma compra registrada.
                </td>
              </tr>
            ) : (
              comprasOrdenadas.map((c) => (
                <tr key={c.id} className={c.status === "cancelada" ? "muted" : ""}>
                  <td>{fmtDataBR(c.data)}</td>
                  <td>{c.descricao}</td>
                  <td>{c.fornecedor || "-"}</td>
                  <td>{c.categoria || "-"}</td>
                  <td>{fmtBRL(c.valor)}</td>
                  <td>
                    <select
                      className="status-select"
                      value={c.status}
                      onChange={(e) => onMudarStatus(c.id, e.target.value as StatusCompra)}
                    >
                      {(Object.keys(STATUS_LABEL) as StatusCompra[]).map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button className="btn danger small" onClick={() => onExcluir(c.id)}>
                      Excluir
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
