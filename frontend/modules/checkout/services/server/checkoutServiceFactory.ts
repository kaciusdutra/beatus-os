import "server-only";

import { prisma } from "@/lib/prisma";

import { buscarPorCep } from "@/core/address/addressService";

import { criarContextoDesenvolvimento } from "@/core/context/empresaContext";

import { registrarAtividade } from "@/modules/atividades/services/server/atividadeService";

import { ErroDePedido } from "@/modules/pedidos/services/calcularPedido";

import { calcularPedidoSemGravar } from "@/modules/pedidos/services/server/calculoPedidoService";

import { getLancarPedidoServicePostgres } from "@/modules/pedidos/services/server/lancarPedidoServicePostgres";

import { getSiteService } from "@/modules/site/services/server/siteServiceFactory";

import { criarCheckoutRepositoryPostgres } from "../../repositories/postgres/checkoutRepositoryPostgres";

import {
  CheckoutService,
  ErroDeCheckout,
  type ClientesDoCheckoutPort,
  type DistanciaDoEnderecoPort,
  type PedidosDoCheckoutPort,
} from "../checkoutService";

import type { GatewayDePagamento } from "../gatewayDePagamento";

import { MercadoPagoGateway } from "../mercadoPagoGateway";

const OPERADOR_DO_SITE = "Site (cardápio online)";

// ---------- Gateway (credenciais no .env; sem elas o checkout fica indisponível) ----------

export function enderecoPublicoDoSite(requisicao?: Request): string {
  const configurado = process.env.SITE_URL_BASE?.trim();

  if (configurado) {
    return configurado.replace(/\/+$/, "");
  }

  return requisicao ? new URL(requisicao.url).origin : "http://localhost:3000";
}

export function segredoDoWebhook(): string {
  return process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim() ?? "";
}

function criarGateway(requisicao?: Request): GatewayDePagamento | null {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();

  if (!token) {
    return null;
  }

  return new MercadoPagoGateway({
    accessToken: token,
    // Só para testes com um servidor de mentira; em uso normal não existe.
    baseUrl: process.env.MERCADOPAGO_BASE_URL?.trim() || undefined,
    ambiente: process.env.MERCADOPAGO_AMBIENTE?.trim() === "producao" ? "producao" : "sandbox",
    retornoAutomatico: enderecoPublicoDoSite(requisicao).startsWith("https://"),
  });
}

// ---------- Ligações com o resto do sistema ----------

// A mesma conta e o mesmo caminho do PDV, pelo canal "cardápio online".
const pedidos: PedidosDoCheckoutPort = {
  async calcular(itens, distanciaKm) {
    let calculado;

    try {
      calculado = await calcularPedidoSemGravar({
        canal: "CARDAPIO_ONLINE",
        itens: itens.map((item) => ({ produtoId: item.produtoId, quantidade: item.quantidade, observacao: item.observacao })),
        distanciaEntregaKm: distanciaKm,
      });
    } catch (error) {
      // As mensagens do cálculo (produto sem preço, fora da área) são escritas para o cliente.
      throw error instanceof ErroDePedido ? new ErroDeCheckout(error.message) : error;
    }

    return { subtotal: calculado.subtotal, taxaEntrega: calculado.taxaEntrega, total: calculado.total, regraEntrega: calculado.regraEntregaAplicada };
  },

  async lancar(dados) {
    const empresaId = criarContextoDesenvolvimento().empresaId;

    // O id do checkout é o id do pedido: se o pedido já foi criado (e uma etapa depois
    // dele falhou), devolve o que existe em vez de tentar criar outro.
    const existente = await prisma.pedido.findFirst({ where: { id: dados.checkoutId, empresaId }, include: { pagamentos: true } });

    if (existente) {
      return { pedidoId: existente.id, numero: String(existente.numero), pagamentoId: existente.pagamentos[0]?.id ?? "", total: Number(existente.total) };
    }

    const resultado = await getLancarPedidoServicePostgres().executar({
      operador: OPERADOR_DO_SITE,
      pedido: {
        id: dados.checkoutId,
        canal: "CARDAPIO_ONLINE",
        entrada: "ONLINE",
        clienteId: dados.clienteId,
        enderecoEntrega: {
          enderecoId: dados.enderecoId,
          rotulo: "CASA",
          cep: dados.dados.endereco.cep,
          logradouro: dados.dados.endereco.logradouro,
          numero: dados.dados.endereco.numero,
          complemento: dados.dados.endereco.complemento,
          bairro: dados.dados.endereco.bairro,
          cidade: dados.dados.endereco.cidade,
          estado: dados.dados.endereco.estado,
        },
        distanciaEntregaKm: dados.distanciaKm,
        itens: dados.dados.itens.map((item) => ({ produtoId: item.produtoId, quantidade: item.quantidade, observacao: item.observacao })),
        pagamento: { modalidade: "ELETRONICO", forma: dados.forma, status: "APROVADO", transacaoExterna: dados.transacaoExterna },
      },
    });

    return { pedidoId: resultado.pedido.id, numero: String(resultado.pedido.numero), pagamentoId: resultado.pagamento.id, total: resultado.pedido.total };
  },

  async numeroDoPedido(pedidoId) {
    const pedido = await prisma.pedido.findFirst({ where: { id: pedidoId, empresaId: criarContextoDesenvolvimento().empresaId }, select: { numero: true } });

    return pedido ? String(pedido.numero) : undefined;
  },
};

const clientes: ClientesDoCheckoutPort = {
  async garantir(dados, versaoDaPolitica) {
    const empresaId = criarContextoDesenvolvimento().empresaId;

    const { cliente: pessoa, endereco, consentimentos } = dados;

    const agora = new Date();

    // Quem já é cliente (pelo telefone, ou pelo CPF) segue com o cadastro que tem.
    const portelefone = await prisma.cliente.findFirst({ where: { empresaId, telefone: pessoa.telefone } });

    let cliente = portelefone ?? (await prisma.cliente.findFirst({ where: { empresaId, cpf: pessoa.cpf } }));

    // O telefone é quem prova que é a mesma pessoa. Achado só pelo CPF, o cadastro é de outra
    // pessoa (ou do mesmo dono com outro número): o pedido vai para ele, mas NADA nele muda,
    // principalmente os aceites de mensagens de marketing.
    const mesmaPessoa = portelefone !== null;

    if (cliente && !cliente.ativo) {
      throw new Error("O cadastro deste cliente está inativo.");
    }

    const nascimento = pessoa.dataNascimento ? new Date(`${pessoa.dataNascimento}T00:00:00.000Z`) : undefined;

    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: {
          empresaId,
          nome: pessoa.nome,
          telefone: pessoa.telefone,
          cpf: pessoa.cpf,
          email: pessoa.email ?? null,
          dataNascimento: nascimento ?? null,
          origemPrimeiroPedido: "CARDAPIO_ONLINE",
          aceitouPoliticaEm: agora,
          versaoDaPolitica,
          aceitaMarketing: consentimentos.aceitaMarketing,
          aceitaMarketingEm: consentimentos.aceitaMarketing ? agora : null,
        },
      });
    } else if (mesmaPessoa) {
      // Completa o que faltava (nunca troca nome, telefone ou CPF) e registra os aceites de agora.
      cliente = await prisma.cliente.update({
        where: { id: cliente.id },
        data: {
          ...(!cliente.email && pessoa.email ? { email: pessoa.email } : {}),
          ...(!cliente.dataNascimento && nascimento ? { dataNascimento: nascimento } : {}),
          aceitouPoliticaEm: agora,
          versaoDaPolitica,
          ...(consentimentos.aceitaMarketing !== cliente.aceitaMarketing
            ? { aceitaMarketing: consentimentos.aceitaMarketing, aceitaMarketingEm: agora }
            : {}),
        },
      });
    }

    const existente = await prisma.endereco.findFirst({
      where: { clienteId: cliente.id, cep: endereco.cep, numero: endereco.numero, logradouro: { equals: endereco.logradouro, mode: "insensitive" } },
    });

    const salvo =
      existente ??
      (await prisma.endereco.create({
        data: {
          clienteId: cliente.id,
          rotulo: "CASA",
          principal: (await prisma.endereco.count({ where: { clienteId: cliente.id } })) === 0,
          cep: endereco.cep,
          logradouro: endereco.logradouro,
          numero: endereco.numero,
          complemento: endereco.complemento ?? null,
          bairro: endereco.bairro,
          cidade: endereco.cidade,
          estado: endereco.estado,
        },
      }));

    return { clienteId: cliente.id, enderecoId: salvo.id };
  },
};

// SIMULADO, como no PDV: hoje só existem 4 endereços de teste com distância fixa
// (core/address). Quando a entrega real existir, vale para o PDV e para o site juntos.
const distancia: DistanciaDoEnderecoPort = {
  async distanciaKm(cep) {
    return buscarPorCep(cep)[0]?.distanciaSimuladaKm ?? null;
  },
};

export function getCheckoutService(requisicao?: Request): CheckoutService {
  return new CheckoutService({
    repositorio: criarCheckoutRepositoryPostgres(criarContextoDesenvolvimento()),
    pedidos,
    clientes,
    distancia,
    funcionamento: {
      async recebePedidos() {
        const { funcionamento } = await getSiteService().cardapio();

        return { recebe: funcionamento.recebePedidos, texto: funcionamento.texto };
      },
    },
    gateway: criarGateway(requisicao),
    registrar: async (dados) => {
      await registrarAtividade(prisma, { entidade: "SITE", operador: OPERADOR_DO_SITE, ...dados });
    },
  });
}
