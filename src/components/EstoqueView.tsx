import { useMemo, useState } from "react";
import type { ItemEstoque, Movimentacao } from "../types";
import { alertasEstoque, estoqueBaixo } from "../lib/financeiro";
import { fmtDataBR, hoje } from "../lib/tempo";
import { Alertas } from "./Alertas";

interface Props {
  unidadeId: string;
  itens: ItemEstoque[];
  movimentacoes: Movimentacao[];
  onNovoItem: (i: Omit<ItemEstoque, "id">) => Promise<ItemEstoque>;
  onExcluirItem: (id: string) => void | Promise<void>;
  onMovimentar: (mov: Omit<Movimentacao, "id">) => void | Promise<void>;
}

export function EstoqueView({
  unidadeId,
  itens,
  movimentacoes,
  onNovoItem,
  onExcluirItem,
  onMovimentar,
}: Props) {
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [unidade, setUnidade] = useState("un");
  const [quantidade, setQuantidade] = useState(0);
  const [estoqueMin, setEstoqueMin] = useState(0);
  const [salvando, setSalvando] = useState(false);

  const alertas = useMemo(() => alertasEstoque(itens), [itens]);

  async function adicionarItem() {
    if (!nome.trim()) {
      alert("Informe o nome do item.");
      return;
    }
    setSalvando(true);
    try {
      await onNovoItem({
        unidadeId,
        nome: nome.trim(),
        categoria: categoria.trim(),
        unidade: unidade.trim() || "un",
        quantidade,
        estoqueMin,
      });
      setNome("");
      setCategoria("");
      setUnidade("un");
      setQuantidade(0);
      setEstoqueMin(0);
    } catch {
      alert("Não foi possível adicionar o item.");
    } finally {
      setSalvando(false);
    }
  }

  async function mover(item: ItemEstoque, tipo: "entrada" | "saida") {
    const txt = tipo === "entrada" ? "entrada" : "saída";
    const resp = window.prompt(`Quantidade de ${txt} para "${item.nome}":`, "1");
    if (resp === null) return;
    const qtd = parseInt(resp, 10);
    if (Number.isNaN(qtd) || qtd <= 0) {
      alert("Quantidade inválida.");
      return;
    }
    if (tipo === "saida" && qtd > item.quantidade) {
      alert(`Saída maior que o disponível (${item.quantidade}).`);
      return;
    }
    const motivo = window.prompt("Motivo (opcional):", "") ?? "";
    try {
      await onMovimentar({ itemId: item.id, tipo, quantidade: qtd, motivo, data: hoje() });
    } catch {
      alert("Não foi possível registrar a movimentação.");
    }
  }

  const nomePorId = useMemo(() => {
    const m = new Map<string, string>();
    itens.forEach((i) => m.set(i.id, i.nome));
    return m;
  }, [itens]);

  const movsOrdenadas = useMemo(
    () =>
      movimentacoes
        .slice()
        .sort((a, b) => b.data.localeCompare(a.data))
        .slice(0, 50),
    [movimentacoes]
  );

  return (
    <section className="view">
      <Alertas alertas={alertas} />

      <div className="card">
        <h2>Novo item</h2>
        <div className="row">
          <div className="field grow">
            <label>Nome</label>
            <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="field">
            <label>Categoria</label>
            <input type="text" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
          </div>
          <div className="field">
            <label>Unidade</label>
            <input
              type="text"
              value={unidade}
              placeholder="un, cx, m..."
              onChange={(e) => setUnidade(e.target.value)}
            />
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label>Quantidade inicial</label>
            <input
              type="number"
              min={0}
              value={quantidade}
              onChange={(e) => setQuantidade(parseInt(e.target.value, 10) || 0)}
            />
          </div>
          <div className="field">
            <label>Estoque mínimo</label>
            <input
              type="number"
              min={0}
              value={estoqueMin}
              onChange={(e) => setEstoqueMin(parseInt(e.target.value, 10) || 0)}
            />
          </div>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={adicionarItem} disabled={salvando}>
            {salvando ? "Adicionando..." : "Adicionar item"}
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Itens em estoque</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Categoria</th>
              <th>Quantidade</th>
              <th>Mínimo</th>
              <th>Movimentar</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  Nenhum item cadastrado.
                </td>
              </tr>
            ) : (
              itens.map((i) => (
                <tr key={i.id} className={estoqueBaixo(i) ? "linha-alerta" : ""}>
                  <td>
                    {i.nome}
                    {estoqueBaixo(i) && <span className="badge warn"> baixo</span>}
                  </td>
                  <td>{i.categoria || "-"}</td>
                  <td>
                    {i.quantidade} {i.unidade}
                  </td>
                  <td>{i.estoqueMin}</td>
                  <td>
                    <button className="btn ghost small" onClick={() => mover(i, "entrada")}>
                      + Entrada
                    </button>{" "}
                    <button className="btn ghost small" onClick={() => mover(i, "saida")}>
                      − Saída
                    </button>
                  </td>
                  <td>
                    <button className="btn danger small" onClick={() => onExcluirItem(i.id)}>
                      Excluir
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Últimas movimentações</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Item</th>
              <th>Tipo</th>
              <th>Qtd</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {movsOrdenadas.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  Sem movimentações.
                </td>
              </tr>
            ) : (
              movsOrdenadas.map((m) => (
                <tr key={m.id}>
                  <td>{fmtDataBR(m.data)}</td>
                  <td>{nomePorId.get(m.itemId) ?? "(removido)"}</td>
                  <td className={m.tipo === "entrada" ? "pos" : "neg"}>
                    {m.tipo === "entrada" ? "Entrada" : "Saída"}
                  </td>
                  <td>{m.quantidade}</td>
                  <td>{m.motivo || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
