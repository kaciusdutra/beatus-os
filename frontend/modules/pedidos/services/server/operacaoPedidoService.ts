import "server-only";

import { prisma } from "@/lib/prisma";

import { criarContextoDesenvolvimento } from "@/core/context/empresaContext";

import { registrarAtividade } from "@/modules/atividades/services/server/atividadeService";

import {
  baixarPedido,
  consumoDoPedido,
  devolverAoEstoque,
  type ConsumoDoPedido,
} from "@/modules/estoque/services/server/baixaPorVendaService";

import { podeMudarStatus } from "../../domain/pedidoStatus";

import { SELOS_PARA_A_VANTAGEM } from "@/modules/clube/regras";

import { creditarSeloDaEntrega } from "@/modules/clube/services/server/clubeService";

import { avisoParaMudanca } from "../avisoDoPedido";

import type { StatusOperacional } from "../../types/pedido";

export interface PedidoDaCozinha {
  id: string;

  numero: string;

  canal: string;

  entrada: string;

  statusOperacional: StatusOperacional;

  total: number;

  criadoEm: string;

  cliente: { nome: string; telefone: string };

  endereco: string;

  itens: { id: string; nome: string; quantidade: number; observacao?: string }[];

  pagamentoStatus?: string;

  ticketStatus?: string;
}

const STATUS_ATIVOS: StatusOperacional[] = [
  "NOVO",
  "EM_PREPARO",
  "PRONTO",
  "EM_ROTA",
];

const ROTULO: Record<StatusOperacional, string> = {
  NOVO: "Novo",
  EM_PREPARO: "Em preparo",
  PRONTO: "Pronto",
  EM_ROTA: "Em rota",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};

function enderecoResumido(pedido: {
  enderecoLogradouro: string | null;
  enderecoNumero: string | null;
  enderecoComplemento: string | null;
  enderecoBairro: string | null;
}): string {
  return [
    [pedido.enderecoLogradouro, pedido.enderecoNumero]
      .filter(Boolean)
      .join(", "),
    pedido.enderecoComplemento,
    pedido.enderecoBairro,
  ]
    .filter(Boolean)
    .join(" - ");
}

export class OperacaoPedidoService {
  private readonly contexto = criarContextoDesenvolvimento();

  private get empresaId(): string {
    return this.contexto.empresaId;
  }

  async listarParaCozinha(): Promise<PedidoDaCozinha[]> {
    const pedidos = await prisma.pedido.findMany({
      where: {
        empresaId: this.empresaId,
        statusOperacional: { in: STATUS_ATIVOS },
      },
      include: {
        cliente: true,
        itens: true,
        pagamentos: true,
        filaImpressao: true,
      },
      orderBy: { criadoEm: "asc" },
    });

    return pedidos.map((pedido) => ({
      id: pedido.id,
      numero: pedido.numero,
      canal: pedido.canal,
      entrada: pedido.entrada,
      statusOperacional: pedido.statusOperacional as StatusOperacional,
      total: Number(pedido.total),
      criadoEm: pedido.criadoEm.toISOString(),
      cliente: { nome: pedido.cliente.nome, telefone: pedido.cliente.telefone },
      endereco: enderecoResumido(pedido),
      itens: pedido.itens.map((item) => ({
        id: item.id,
        nome: item.nome,
        quantidade: item.quantidade,
        observacao: item.observacao ?? undefined,
      })),
      pagamentoStatus: pedido.pagamentos[0]?.status,
      ticketStatus: pedido.filaImpressao[0]?.status,
    }));
  }

  async consumo(pedidoId: string): Promise<ConsumoDoPedido[]> {
    return consumoDoPedido(pedidoId);
  }

  // Muda o status do pedido (iniciar preparo, pronto, em rota, entregue,
  // cancelar). Iniciar preparo baixa o estoque; cancelar em preparo ou pronto
  // deixa a baixa (vira perda) e devolve só o que a cozinha marcar.
  async mudarStatus(dados: {
    pedidoId: string;
    novoStatus: string;
    motivo?: string;
    devolucoes?: { id: string; quantidade: number }[];
    operador?: string | null;
  }): Promise<{ statusOperacional: StatusOperacional; avisos: string[] }> {
    const novo = dados.novoStatus as StatusOperacional;

    if (!Object.keys(ROTULO).includes(novo)) {
      throw new Error("Status inválido.");
    }

    if (novo === "CANCELADO" && !dados.motivo?.trim()) {
      throw new Error("Informe o motivo do cancelamento.");
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.findFirst({
        where: { id: dados.pedidoId, empresaId: this.empresaId },
        include: { itens: true, pagamentos: true },
      });

      if (!pedido) {
        throw new Error("Pedido não encontrado.");
      }

      const atual = pedido.statusOperacional as StatusOperacional;

      if (!podeMudarStatus(atual, novo)) {
        throw new Error(
          `Não dá para passar de "${ROTULO[atual]}" para "${ROTULO[novo]}".`
        );
      }

      const avisos: string[] = [];

      const devolvidos: string[] = [];

      if (novo === "EM_PREPARO") {
        const baixa = await baixarPedido(tx, {
          id: pedido.id,
          numero: pedido.numero,
          itens: pedido.itens.map((item) => ({
            produtoId: item.produtoId,
            nome: item.nome,
            quantidade: item.quantidade,
          })),
        });

        avisos.push(...baixa.avisos);
      }

      if (novo === "CANCELADO") {
        const podeDevolver = atual === "EM_PREPARO" || atual === "PRONTO";

        if ((dados.devolucoes?.length ?? 0) > 0 && !podeDevolver) {
          throw new Error(
            atual === "NOVO"
              ? "O pedido ainda não consumiu estoque: não há o que devolver."
              : "Pedido em rota: nada volta ao estoque."
          );
        }

        if (podeDevolver) {
          devolvidos.push(
            ...(await devolverAoEstoque(
              tx,
              { id: pedido.id, numero: pedido.numero },
              dados.devolucoes ?? []
            ))
          );
        }

        const pagamento = pedido.pagamentos[0];

        if (pagamento?.status === "APROVADO") {
          avisos.push(
            `O pagamento de R$ ${Number(pagamento.valor).toFixed(2)} estava aprovado: o estorno é com o financeiro.`
          );
        }
      }

      await tx.pedido.update({
        where: { id: pedido.id },
        data: { statusOperacional: novo },
      });

      // Aviso ao cliente (site e WhatsApp): nasce junto da mudança, na mesma transação.
      // O envio é outra etapa; aqui só fica registrado o que deve ser dito.
      const aviso = avisoParaMudanca({ novaSituacao: novo, canalDoPedido: pedido.canal, numero: pedido.numero });

      if (aviso) {
        await tx.avisoDoPedido.createMany({
          data: [{ empresaId: this.empresaId, pedidoId: pedido.id, evento: aviso.evento, canalDoAviso: aviso.canalDoAviso, texto: aviso.texto }],
          skipDuplicates: true,
        });
      }

      const resumo =
        novo === "CANCELADO"
          ? `Pedido ${pedido.numero} cancelado (estava "${ROTULO[atual]}"). Motivo: ${dados.motivo?.trim()}.${
              atual === "EM_PREPARO" || atual === "PRONTO"
                ? devolvidos.length > 0
                  ? ` Voltou ao estoque: ${devolvidos.join(", ")}. O resto do consumo vira perda.`
                  : " O que foi consumido vira perda."
                : ""
            }`
          : `Pedido ${pedido.numero}: ${ROTULO[atual]} → ${ROTULO[novo]}.`;

      await registrarAtividade(tx, {
        entidade: "PEDIDO",
        acao: novo,
        resumo,
        referenciaId: pedido.id,
        referenciaNumero: pedido.numero,
        operador: dados.operador,
        detalhes: {
          de: atual,
          para: novo,
          motivo: dados.motivo ?? null,
          devolvidos,
          avisos,
        },
      });

      return { statusOperacional: novo, avisos };
    });

    // Clube (seção 28): a entrega já está gravada; o selo vem depois e nunca a atrapalha.
    if (novo === "ENTREGUE") {
      await this.darSeloDoClube(dados.pedidoId, dados.operador);
    }

    return resultado;
  }

  // O pedido foi entregue: credita o selo do clube, se for o caso. Desligado, não faz nada. Se falhar, a entrega continua
  // valendo e o erro fica no registro do servidor (o selo é idempotente: pode ser creditado depois, sem duplicar).
  private async darSeloDoClube(pedidoId: string, operador?: string | null): Promise<void> {
    try {
      const pedido = await prisma.pedido.findFirst({ where: { id: pedidoId, empresaId: this.empresaId } });

      if (!pedido) {
        return;
      }

      const selo = await creditarSeloDaEntrega(prisma, {
        id: pedido.id,
        empresaId: this.empresaId,
        clienteId: pedido.clienteId,
        canal: pedido.canal,
        codigoExterno: pedido.codigoExterno,
        criadoEm: pedido.criadoEm,
        subtotal: pedido.subtotal,
        descontos: pedido.descontos,
      });

      if (selo.creditar) {
        await registrarAtividade(prisma, {
          entidade: "PEDIDO",
          acao: "SELO_DO_CLUBE",
          resumo: `Pedido ${pedido.numero}: selo do clube creditado (${selo.selosApos} de ${SELOS_PARA_A_VANTAGEM} no ciclo ${selo.ciclo})${selo.completa ? ". Cartão completo!" : "."}`,
          referenciaId: pedido.id,
          referenciaNumero: pedido.numero,
          operador,
          detalhes: { ciclo: selo.ciclo, selosApos: selo.selosApos, completa: selo.completa, reiniciou: selo.reiniciar },
        });
      }
    } catch (error) {
      console.error("ERRO AO CREDITAR O SELO DO CLUBE:", error);
    }
  }

  // ---------- ticket e fila de impressão ----------

  async dadosDoTicket(pedidoId: string) {
    const pedido = await prisma.pedido.findFirst({
      where: { id: pedidoId, empresaId: this.empresaId },
      include: { cliente: true, itens: true, pagamentos: true },
    });

    if (!pedido) {
      throw new Error("Pedido não encontrado.");
    }

    return {
      id: pedido.id,
      numero: pedido.numero,
      canal: pedido.canal,
      criadoEm: pedido.criadoEm.toISOString(),
      cliente: { nome: pedido.cliente.nome, telefone: pedido.cliente.telefone },
      endereco: enderecoResumido(pedido),
      referencia: pedido.enderecoComplemento ?? undefined,
      itens: pedido.itens.map((item) => ({
        nome: item.nome,
        quantidade: item.quantidade,
        observacao: item.observacao ?? undefined,
      })),
      pagamento: pedido.pagamentos[0]
        ? {
            forma: pedido.pagamentos[0].forma,
            status: pedido.pagamentos[0].status,
          }
        : undefined,
      total: Number(pedido.total),
    };
  }

  async marcarTicket(
    pedidoId: string,
    status: "IMPRESSO" | "FALHOU",
    operador?: string | null
  ): Promise<void> {
    const pedido = await prisma.pedido.findFirst({
      where: { id: pedidoId, empresaId: this.empresaId },
    });

    if (!pedido) {
      throw new Error("Pedido não encontrado.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.filaImpressao.updateMany({
        where: { pedidoId, empresaId: this.empresaId, tipo: "TICKET_COZINHA" },
        data: {
          status,
          impressoEm: status === "IMPRESSO" ? new Date() : null,
          tentativas: { increment: 1 },
        },
      });

      await registrarAtividade(tx, {
        entidade: "PEDIDO",
        acao: "TICKET",
        resumo: `Ticket do pedido ${pedido.numero}: ${status === "IMPRESSO" ? "impresso" : "falhou"}.`,
        referenciaId: pedido.id,
        referenciaNumero: pedido.numero,
        operador,
      });
    });
  }

  // Fila para um impressor automático (quando a impressora existir).
  async fila(status: string = "PENDENTE") {
    const linhas = await prisma.filaImpressao.findMany({
      where: { empresaId: this.empresaId, status },
      include: { pedido: true },
      orderBy: { criadoEm: "asc" },
      take: 100,
    });

    return linhas.map((linha) => ({
      id: linha.id,
      tipo: linha.tipo,
      status: linha.status,
      tentativas: linha.tentativas,
      pedidoId: linha.pedidoId,
      numero: linha.pedido.numero,
      criadoEm: linha.criadoEm.toISOString(),
    }));
  }
}

let instancia: OperacaoPedidoService | null = null;

export function getOperacaoPedidoService(): OperacaoPedidoService {
  if (!instancia) {
    instancia = new OperacaoPedidoService();
  }

  return instancia;
}
