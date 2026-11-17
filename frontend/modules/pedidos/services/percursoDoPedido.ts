// O percurso de um pedido, num lugar só: o cliente (novo ou antigo), o pagamento, a cozinha e a entrega.
// Tudo vem do banco: a tela Pedidos só desenha o que o sistema já sabe, para qualquer canal (PDV, WhatsApp, site).

export type SituacaoDaEtapa = "FEITO" | "EM_ANDAMENTO" | "PENDENTE" | "PROBLEMA" | "NAO_SE_APLICA";

export interface EtapaDoPercurso {
  chave: "CLIENTE" | "PAGAMENTO" | "COZINHA" | "ENTREGA";
  rotulo: string;
  situacao: SituacaoDaEtapa;
  detalhe: string;
}

export interface EntradaDoPercurso {
  status: string;
  // Pedido de marketplace: o cliente é da plataforma e o pagamento é feito lá.
  marketplace: boolean;
  clienteDoPedido?: { novoNestePedido: boolean; totalDePedidosAnteriores: number };
  pagamentos: { status: string; rotulo: string; aprovadoEm?: string }[];
}

export function percursoDoPedido(entrada: EntradaDoPercurso, formatarData: (iso: string) => string = (iso) => iso): EtapaDoPercurso[] {
  const cancelado = entrada.status === "CANCELADO";

  // ---------- Cliente ----------
  let cliente: EtapaDoPercurso;

  if (entrada.marketplace) {
    cliente = { chave: "CLIENTE", rotulo: "Cliente", situacao: "NAO_SE_APLICA", detalhe: "Cliente da plataforma (sem cadastro no Beatus)" };
  } else if (!entrada.clienteDoPedido) {
    cliente = { chave: "CLIENTE", rotulo: "Cliente", situacao: "PENDENTE", detalhe: "Sem dados do cliente" };
  } else if (entrada.clienteDoPedido.novoNestePedido) {
    cliente = { chave: "CLIENTE", rotulo: "Cliente", situacao: "FEITO", detalhe: "Cliente novo, cadastrado neste pedido" };
  } else {
    const antes = entrada.clienteDoPedido.totalDePedidosAnteriores;

    cliente = { chave: "CLIENTE", rotulo: "Cliente", situacao: "FEITO", detalhe: `Cliente cadastrado, ${antes} pedido${antes === 1 ? "" : "s"} antes deste` };
  }

  // ---------- Pagamento ----------
  let pagamento: EtapaDoPercurso;

  const aprovado = entrada.pagamentos.find((item) => item.status === "APROVADO");

  if (entrada.marketplace) {
    pagamento = { chave: "PAGAMENTO", rotulo: "Pagamento", situacao: "FEITO", detalhe: "Pago na plataforma" };
  } else if (aprovado) {
    pagamento = { chave: "PAGAMENTO", rotulo: "Pagamento", situacao: "FEITO", detalhe: `Aprovado: ${aprovado.rotulo}${aprovado.aprovadoEm ? ` em ${formatarData(aprovado.aprovadoEm)}` : ""}` };
  } else if (entrada.pagamentos.length === 0 || entrada.pagamentos.every((item) => item.status === "PENDENTE")) {
    pagamento = { chave: "PAGAMENTO", rotulo: "Pagamento", situacao: "PENDENTE", detalhe: "Aguardando o pagamento" };
  } else {
    pagamento = { chave: "PAGAMENTO", rotulo: "Pagamento", situacao: "PROBLEMA", detalhe: `Pagamento ${entrada.pagamentos[0].status.toLowerCase()}` };
  }

  // ---------- Cozinha ----------
  let cozinha: EtapaDoPercurso;

  if (cancelado) {
    cozinha = { chave: "COZINHA", rotulo: "Cozinha", situacao: "PROBLEMA", detalhe: "Pedido cancelado" };
  } else if (pagamento.situacao !== "FEITO") {
    cozinha = { chave: "COZINHA", rotulo: "Cozinha", situacao: "PENDENTE", detalhe: "Só entra depois do pagamento aprovado" };
  } else if (entrada.status === "NOVO") {
    cozinha = { chave: "COZINHA", rotulo: "Cozinha", situacao: "EM_ANDAMENTO", detalhe: "Na fila da cozinha" };
  } else if (entrada.status === "EM_PREPARO") {
    cozinha = { chave: "COZINHA", rotulo: "Cozinha", situacao: "EM_ANDAMENTO", detalhe: "Em preparo" };
  } else {
    cozinha = { chave: "COZINHA", rotulo: "Cozinha", situacao: "FEITO", detalhe: "Preparado" };
  }

  // ---------- Entrega ----------
  let entrega: EtapaDoPercurso;

  if (cancelado) {
    entrega = { chave: "ENTREGA", rotulo: "Entrega", situacao: "NAO_SE_APLICA", detalhe: "" };
  } else if (entrada.status === "ENTREGUE") {
    entrega = { chave: "ENTREGA", rotulo: "Entrega", situacao: "FEITO", detalhe: "Entregue" };
  } else if (entrada.status === "EM_ROTA") {
    entrega = { chave: "ENTREGA", rotulo: "Entrega", situacao: "EM_ANDAMENTO", detalhe: "A caminho do cliente" };
  } else {
    entrega = { chave: "ENTREGA", rotulo: "Entrega", situacao: "PENDENTE", detalhe: entrada.status === "PRONTO" ? "Pronto, esperando sair" : "Ainda não saiu" };
  }

  return [cliente, pagamento, cozinha, entrega];
}
