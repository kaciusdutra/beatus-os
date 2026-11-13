import { NextRequest, NextResponse } from "next/server";

import { getConsultaPedidoService } from "@/modules/pedidos/services/server/consultaPedidoServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

// Consulta de pedidos (todos os status). Filtros: status, canal, de, ate
// (AAAA-MM-DD), busca (número, nome ou telefone), clienteId, limite.
export async function GET(request: NextRequest) {
  try {
    const parametros = request.nextUrl.searchParams;

    const limite = Number(parametros.get("limite"));

    const resultado = await getConsultaPedidoService().listar({
      status: parametros.get("status") || undefined,
      canal: parametros.get("canal") || undefined,
      de: parametros.get("de") || undefined,
      ate: parametros.get("ate") || undefined,
      busca: parametros.get("busca") || undefined,
      clienteId: parametros.get("clienteId") || undefined,
      limite: Number.isFinite(limite) && limite > 0 ? limite : undefined,
    });

    return NextResponse.json({ sucesso: true, ...resultado });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível consultar os pedidos.");
  }
}
