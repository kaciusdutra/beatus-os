import "server-only";

import { criarContextoDesenvolvimento } from "@/core/context/empresaContext";

import { ConsultaPedidoService } from "../consultaPedidoService";

import { criarPedidoConsultaRepositoryPostgres } from "../../repositories/postgres/pedidoConsultaRepositoryPostgres";

export function getConsultaPedidoService(): ConsultaPedidoService {
  return new ConsultaPedidoService(
    criarPedidoConsultaRepositoryPostgres(criarContextoDesenvolvimento())
  );
}
