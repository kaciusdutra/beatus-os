// A cozinha tem de perceber quando chega pedido novo, sem ninguém olhar a tela:
// o pedido aprovado entra na fila sozinho (não há "aceite" humano) e a tela avisa.

export interface PedidoParaAlerta {
  id: string;
  numero: string;
  canal: string;
  statusOperacional: string;
}

// Os pedidos "Novos" que ainda não tinham aparecido. Na primeira leitura da tela
// (vistos nulo) não se avisa nada: tudo o que já estava na fila é só o ponto de partida.
export function pedidosNovosDaFila(vistos: ReadonlySet<string> | null, atuais: PedidoParaAlerta[]): PedidoParaAlerta[] {
  if (vistos === null) {
    return [];
  }

  return atuais.filter((pedido) => pedido.statusOperacional === "NOVO" && !vistos.has(pedido.id));
}

// Guarda o que a tela já viu (qualquer situação, para um pedido que volta de outra coluna não avisar de novo).
export function marcarComoVistos(vistos: ReadonlySet<string> | null, atuais: PedidoParaAlerta[]): Set<string> {
  const proximo = new Set(vistos ?? []);

  for (const pedido of atuais) {
    proximo.add(pedido.id);
  }

  return proximo;
}

export function tituloDaAba(naFila: number, tituloBase = "Cozinha"): string {
  return naFila > 0 ? `(${naFila}) ${naFila === 1 ? "pedido novo" : "pedidos novos"} · ${tituloBase}` : tituloBase;
}

export function textoDoAlerta(novos: PedidoParaAlerta[]): string {
  if (novos.length === 0) {
    return "";
  }

  if (novos.length === 1) {
    return `Pedido novo #${novos[0].numero} (${novos[0].canal})`;
  }

  return `${novos.length} pedidos novos: ${novos.map((pedido) => `#${pedido.numero}`).join(", ")}`;
}
