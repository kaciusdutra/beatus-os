import { ConsultaPedidoService, resumirPedidos } from "./consultaPedidoService";

import type { PedidoConsultaRepositoryPort } from "../repositories/pedidoConsultaRepositoryPort";

import type { PedidoListado } from "../types/consultaPedido";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

function pedido(numero: string, status: PedidoListado["status"], total: number): PedidoListado {
  return {
    id: numero,
    numero,
    canal: "PDV",
    entrada: "MANUAL",
    status,
    total,
    criadoEm: "2026-11-13T20:00:00.000Z",
    cliente: { id: "c1", nome: "Cliente", telefone: "92999990000" },
    quantidadeItens: 1,
  };
}

async function recusa(promessa: Promise<unknown>): Promise<string> {
  try {
    await promessa;
  } catch (error) {
    return error instanceof Error ? error.message : "";
  }

  return "";
}

async function executarTestes(): Promise<void> {
  let ultimoFiltro: Parameters<PedidoConsultaRepositoryPort["listar"]>[0] | undefined;

  const lista = [pedido("1", "ENTREGUE", 100), pedido("2", "CANCELADO", 999), pedido("3", "NOVO", 50)];

  const repositorio: PedidoConsultaRepositoryPort = {
    async listar(filtro) {
      ultimoFiltro = filtro;

      return lista;
    },

    async buscarDetalhe() {
      return null;
    },
  };

  const servico = new ConsultaPedidoService(repositorio);

  // Resumo: cancelado aparece na quantidade, mas não no valor nem no ticket médio.
  const resumo = resumirPedidos(lista);

  verificar(resumo.quantidade === 3, "3 pedidos na lista");
  verificar(resumo.valorTotal === 150, "cancelado não entra no valor (100 + 50)");
  verificar(resumo.ticketMedio === 75, "ticket médio de 2 pedidos válidos");
  verificar(resumirPedidos([]).ticketMedio === 0, "lista vazia: ticket zero");

  // Filtros
  const resultado = await servico.listar({ de: "2026-11-01", ate: "2026-11-30", busca: "ana" });

  verificar(resultado.pedidos.length === 3, "repassa a lista do repositório");
  verificar(ultimoFiltro?.limite === 100, "limite padrão de 100");
  verificar(ultimoFiltro?.ate?.getDate() === 1 && ultimoFiltro.ate.getMonth() === 11, "data final vira o início do dia seguinte (exclusivo)");
  verificar(ultimoFiltro?.busca === "ana", "busca repassada");

  await servico.listar({ limite: 99999 });
  verificar(ultimoFiltro?.limite === 300, "limite máximo de 300");

  verificar((await recusa(servico.listar({ status: "VOANDO" }))).includes("inválida"), "situação inválida é recusada");
  verificar((await recusa(servico.listar({ de: "13/11/2026" }))).includes("AAAA-MM-DD"), "data fora do formato é recusada");
  verificar((await recusa(servico.listar({ de: "2026-11-10", ate: "2026-11-01" }))).includes("antes"), "período invertido é recusado");
  verificar((await recusa(servico.detalhe("x"))).includes("não encontrado"), "pedido inexistente");
}

executarTestes()
  .then(() => {
    console.log(`✅ Testes da consulta de pedidos passaram (${verificacoes} verificações).`);
  })
  .catch((erro) => {
    console.error(erro);

    process.exitCode = 1;
  });
