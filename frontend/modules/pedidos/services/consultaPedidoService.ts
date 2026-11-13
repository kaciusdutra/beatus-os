import type { PedidoConsultaRepositoryPort } from "../repositories/pedidoConsultaRepositoryPort";

import type {
  FiltroDePedidos,
  PedidoDetalhe,
  PedidoListado,
  ResumoDePedidos,
} from "../types/consultaPedido";

const STATUS_VALIDOS = ["NOVO", "EM_PREPARO", "PRONTO", "EM_ROTA", "ENTREGUE", "CANCELADO"];

const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/;

const LIMITE_PADRAO = 100;

const LIMITE_MAXIMO = 300;

function dataValida(texto: string): boolean {
  return FORMATO_DATA.test(texto) && !Number.isNaN(new Date(`${texto}T00:00:00`).getTime());
}

export function resumirPedidos(pedidos: PedidoListado[]): ResumoDePedidos {
  const validos = pedidos.filter((pedido) => pedido.status !== "CANCELADO");

  const valorTotal = Math.round(validos.reduce((soma, pedido) => soma + pedido.total, 0) * 100) / 100;

  return {
    quantidade: pedidos.length,
    valorTotal,
    ticketMedio: validos.length > 0 ? Math.round((valorTotal / validos.length) * 100) / 100 : 0,
  };
}

export class ConsultaPedidoService {
  constructor(private readonly repository: PedidoConsultaRepositoryPort) {}

  async listar(
    filtro: FiltroDePedidos = {}
  ): Promise<{ pedidos: PedidoListado[]; resumo: ResumoDePedidos; limitado: boolean }> {
    if (filtro.status && !STATUS_VALIDOS.includes(filtro.status)) {
      throw new Error("Situação do pedido inválida.");
    }

    if ((filtro.de && !dataValida(filtro.de)) || (filtro.ate && !dataValida(filtro.ate))) {
      throw new Error("Informe as datas no formato AAAA-MM-DD.");
    }

    if (filtro.de && filtro.ate && filtro.ate < filtro.de) {
      throw new Error("A data final não pode ser antes da inicial.");
    }

    const limite = Math.min(Math.max(Math.floor(filtro.limite ?? LIMITE_PADRAO), 1), LIMITE_MAXIMO);

    let ate: Date | undefined;

    if (filtro.ate) {
      ate = new Date(`${filtro.ate}T00:00:00`);

      ate.setDate(ate.getDate() + 1);
    }

    const pedidos = await this.repository.listar({
      status: filtro.status || undefined,
      canal: filtro.canal || undefined,
      clienteId: filtro.clienteId || undefined,
      busca: filtro.busca || undefined,
      de: filtro.de ? new Date(`${filtro.de}T00:00:00`) : undefined,
      ate,
      limite,
    });

    return {
      pedidos,
      resumo: resumirPedidos(pedidos),
      limitado: pedidos.length >= limite,
    };
  }

  async detalhe(id: string): Promise<PedidoDetalhe> {
    const pedido = await this.repository.buscarDetalhe(id);

    if (!pedido) {
      throw new Error("Pedido não encontrado.");
    }

    return pedido;
  }
}
