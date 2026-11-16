import type { MemoriaDoCliente } from "../types/beatriz";

export interface PedidoParaMemoria {
  criadoEm: Date;
  itens: { nome: string; quantidade: number }[];
}

const MS_POR_DIA = 24 * 60 * 60 * 1000;

// Os produtos que o cliente mais pediu (pelas quantidades), do mais para o menos pedido. Empate: o mais recente.
export function favoritosDosPedidos(pedidosDoMaisNovoAoMaisAntigo: PedidoParaMemoria[], maximo = 3): string[] {
  const total = new Map<string, { quantidade: number; ordem: number }>();

  pedidosDoMaisNovoAoMaisAntigo.forEach((pedido, ordem) => {
    for (const item of pedido.itens) {
      const atual = total.get(item.nome);

      total.set(item.nome, { quantidade: (atual?.quantidade ?? 0) + item.quantidade, ordem: atual?.ordem ?? ordem });
    }
  });

  return [...total.entries()]
    .sort((a, b) => b[1].quantidade - a[1].quantidade || a[1].ordem - b[1].ordem)
    .slice(0, maximo)
    .map(([nome]) => nome);
}

export function ultimoPedidoParaMemoria(pedidosDoMaisNovoAoMaisAntigo: PedidoParaMemoria[], agora: Date): MemoriaDoCliente["ultimoPedido"] {
  const ultimo = pedidosDoMaisNovoAoMaisAntigo[0];

  if (!ultimo || ultimo.itens.length === 0) {
    return undefined;
  }

  return {
    itens: ultimo.itens.map((item) => ({ nome: item.nome, quantidade: item.quantidade })),
    diasAtras: Math.max(0, Math.floor((agora.getTime() - ultimo.criadoEm.getTime()) / MS_POR_DIA)),
  };
}

// O que a Beatriz sabe do cliente, em texto para as instruções. Vazio quando não sabe nada (cliente novo).
export function memoriaEmTexto(memoria: MemoriaDoCliente | undefined): string {
  if (!memoria) {
    return "";
  }

  const linhas: string[] = [];

  if (memoria.nome) {
    linhas.push(`- Nome no cadastro: ${memoria.nome}`);
  }

  if (memoria.quantidadeDePedidos > 0) {
    linhas.push(`- Já fez ${memoria.quantidadeDePedidos} pedido(s) com a gente.`);
  }

  if (memoria.ultimoPedido) {
    const quando = memoria.ultimoPedido.diasAtras === 0 ? "hoje" : memoria.ultimoPedido.diasAtras === 1 ? "ontem" : `há ${memoria.ultimoPedido.diasAtras} dias`;

    linhas.push(`- Último pedido (${quando}): ${memoria.ultimoPedido.itens.map((item) => `${item.quantidade}× ${item.nome}`).join(", ")}.`);
  }

  if (memoria.favoritos.length > 0) {
    linhas.push(`- O que mais pede: ${memoria.favoritos.join(", ")}.`);
  }

  if (memoria.etiquetas.length > 0) {
    linhas.push(`- Etiquetas do que você já aprendeu dele: ${memoria.etiquetas.join(", ")}.`);
  }

  linhas.push(`- Aceitou participar do clube de vantagens: ${memoria.aceitaClube ? "sim" : "não"}.`);

  return linhas.join("\n");
}
