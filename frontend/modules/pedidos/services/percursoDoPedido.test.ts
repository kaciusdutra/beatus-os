import { percursoDoPedido, type EntradaDoPercurso } from "./percursoDoPedido";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

const base = (extras: Partial<EntradaDoPercurso> = {}): EntradaDoPercurso => ({
  status: "NOVO",
  marketplace: false,
  clienteDoPedido: { novoNestePedido: false, totalDePedidosAnteriores: 3 },
  pagamentos: [{ status: "APROVADO", rotulo: "Pix (Mercado Pago)", aprovadoEm: "2026-11-17T15:00:00.000Z" }],
  ...extras,
});

const etapa = (entrada: EntradaDoPercurso, chave: string) => percursoDoPedido(entrada, (iso) => `em ${iso.slice(0, 10)}`).find((item) => item.chave === chave)!;

// Cliente antigo, pago, na fila da cozinha
{
  const passos = percursoDoPedido(base(), (iso) => `em ${iso.slice(0, 10)}`);

  verificar(passos.map((item) => item.chave).join() === "CLIENTE,PAGAMENTO,COZINHA,ENTREGA", "quatro etapas, nesta ordem");
  verificar(passos[0].situacao === "FEITO" && passos[0].detalhe === "Cliente cadastrado, 3 pedidos antes deste", "cliente antigo com 3 pedidos antes");
  verificar(passos[1].situacao === "FEITO" && passos[1].detalhe === "Aprovado: Pix (Mercado Pago) em em 2026-11-17", "pagamento aprovado com a data");
  verificar(passos[2].situacao === "EM_ANDAMENTO" && passos[2].detalhe === "Na fila da cozinha", "na fila da cozinha");
  verificar(passos[3].situacao === "PENDENTE", "entrega ainda não saiu");
}

// Cliente novo e singular
verificar(etapa(base({ clienteDoPedido: { novoNestePedido: true, totalDePedidosAnteriores: 0 } }), "CLIENTE").detalhe === "Cliente novo, cadastrado neste pedido", "cliente novo é cadastrado no pedido");
verificar(etapa(base({ clienteDoPedido: { novoNestePedido: false, totalDePedidosAnteriores: 1 } }), "CLIENTE").detalhe === "Cliente cadastrado, 1 pedido antes deste", "um pedido antes, no singular");
verificar(etapa(base({ clienteDoPedido: undefined }), "CLIENTE").situacao === "PENDENTE", "sem dados do cliente");

// Andamento da cozinha e da entrega
verificar(etapa(base({ status: "EM_PREPARO" }), "COZINHA").detalhe === "Em preparo", "em preparo");

{
  const pronto = base({ status: "PRONTO" });

  verificar(etapa(pronto, "COZINHA").situacao === "FEITO" && etapa(pronto, "ENTREGA").detalhe === "Pronto, esperando sair", "pronto: cozinha feita, entrega esperando");
}

verificar(etapa(base({ status: "EM_ROTA" }), "ENTREGA").situacao === "EM_ANDAMENTO" && etapa(base({ status: "EM_ROTA" }), "ENTREGA").detalhe === "A caminho do cliente", "em rota");
verificar(etapa(base({ status: "ENTREGUE" }), "ENTREGA").situacao === "FEITO" && etapa(base({ status: "ENTREGUE" }), "COZINHA").situacao === "FEITO", "entregue");

// Cancelado
{
  const cancelado = base({ status: "CANCELADO" });

  verificar(etapa(cancelado, "COZINHA").situacao === "PROBLEMA" && etapa(cancelado, "ENTREGA").situacao === "NAO_SE_APLICA", "cancelado: cozinha com problema, entrega não se aplica");
}

// Pagamento
verificar(etapa(base({ pagamentos: [] }), "PAGAMENTO").situacao === "PENDENTE", "sem pagamento: pendente");
verificar(etapa(base({ pagamentos: [{ status: "PENDENTE", rotulo: "Pix" }] }), "PAGAMENTO").detalhe === "Aguardando o pagamento", "pagamento pendente");
verificar(etapa(base({ pagamentos: [{ status: "RECUSADO", rotulo: "Cartão" }] }), "PAGAMENTO").situacao === "PROBLEMA", "pagamento recusado é problema");
verificar(etapa(base({ pagamentos: [{ status: "PENDENTE", rotulo: "Pix" }] }), "COZINHA").detalhe === "Só entra depois do pagamento aprovado", "sem pagamento aprovado a cozinha espera");
verificar(etapa(base({ pagamentos: [{ status: "APROVADO", rotulo: "Dinheiro" }] }), "PAGAMENTO").detalhe === "Aprovado: Dinheiro", "sem data, só o meio");

// Aprovado depois de um recusado
verificar(etapa(base({ pagamentos: [{ status: "RECUSADO", rotulo: "Cartão" }, { status: "APROVADO", rotulo: "Pix" }] }), "PAGAMENTO").situacao === "FEITO", "uma tentativa aprovada basta");

// Marketplace
{
  const ifood = base({ marketplace: true, clienteDoPedido: undefined, pagamentos: [] });

  verificar(etapa(ifood, "CLIENTE").situacao === "NAO_SE_APLICA" && etapa(ifood, "PAGAMENTO").detalhe === "Pago na plataforma", "marketplace: cliente e pagamento são da plataforma");
  verificar(etapa(ifood, "COZINHA").detalhe === "Na fila da cozinha", "marketplace entra na cozinha mesmo sem pagamento no Beatus");
}

console.log(`✅ Testes do percurso do pedido passaram (${verificacoes} verificações).`);
