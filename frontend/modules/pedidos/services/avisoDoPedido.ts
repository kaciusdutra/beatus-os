// Avisos ao cliente sobre o andamento do pedido. Nascem da mudança de situação feita na
// Cozinha (ninguém digita) e só existem para pedidos que chegaram pelo site ou pelo WhatsApp.

export type EventoDoAviso = "EM_PREPARO" | "A_CAMINHO" | "ENTREGUE";

export type CanalDoAviso = "SITE" | "WHATSAPP";

export const ROTULO_DO_EVENTO: Record<EventoDoAviso, string> = {
  EM_PREPARO: "Em preparo",
  A_CAMINHO: "A caminho",
  ENTREGUE: "Entregue",
};

// A situação do pedido que dispara aviso (as demais não avisam o cliente).
export function eventoDaSituacao(situacao: string): EventoDoAviso | undefined {
  if (situacao === "EM_PREPARO") {
    return "EM_PREPARO";
  }

  if (situacao === "EM_ROTA") {
    return "A_CAMINHO";
  }

  if (situacao === "ENTREGUE") {
    return "ENTREGUE";
  }

  return undefined;
}

// Por onde o aviso vai: o canal em que o pedido nasceu. Pedido de balcão, marketplace
// ou outro canal não recebe aviso do Beatus.
export function canalDoAviso(canalDoPedido: string): CanalDoAviso | undefined {
  if (canalDoPedido === "WHATSAPP") {
    return "WHATSAPP";
  }

  if (canalDoPedido === "CARDAPIO_ONLINE") {
    return "SITE";
  }

  return undefined;
}

export function textoDoAviso(evento: EventoDoAviso, numero: string, canal: CanalDoAviso): string {
  switch (evento) {
    case "EM_PREPARO":
      return `Pagamento confirmado! Seu pedido nº ${numero} já está em preparo.`;
    case "A_CAMINHO":
      return `Seu pedido nº ${numero} saiu para a entrega e está a caminho.`;
    case "ENTREGUE":
      return canal === "WHATSAPP"
        ? `Seu pedido nº ${numero} foi entregue. Bom apetite! Deu tudo certo? Se quiser, conta pra gente como foi.`
        : `Seu pedido nº ${numero} foi entregue. Bom apetite!`;
  }
}

// O aviso de entregue ganha o link do cartão do clube (só quando o cliente tem cartão e o clube está ligado).
export function linkDoCartaoNoAviso(texto: string, cartao: { enderecoDoSite: string; codigo: string }): string {
  return `${texto} Seu cartão de selos do clube: ${cartao.enderecoDoSite.replace(/[/]+$/, "")}/cardapio/clube/${cartao.codigo}`;
}

// O que gravar para esta mudança de situação, ou nada.
export function avisoParaMudanca(dados: { novaSituacao: string; canalDoPedido: string; numero: string; cartaoDoClube?: { enderecoDoSite: string; codigo: string } }): { evento: EventoDoAviso; canalDoAviso: CanalDoAviso; texto: string } | undefined {
  const evento = eventoDaSituacao(dados.novaSituacao);

  const canal = canalDoAviso(dados.canalDoPedido);

  if (!evento || !canal) {
    return undefined;
  }

  const texto = textoDoAviso(evento, dados.numero, canal);

  return { evento, canalDoAviso: canal, texto: evento === "ENTREGUE" && dados.cartaoDoClube ? linkDoCartaoNoAviso(texto, dados.cartaoDoClube) : texto };
}
