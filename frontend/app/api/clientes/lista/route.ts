import { NextRequest, NextResponse } from "next/server";

import { getConsultaClienteService } from "@/modules/clientes/services/server/consultaClienteServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

// Lista de clientes com o que já compraram (sem pedidos cancelados).
// ?busca= nome, telefone, CPF ou e-mail; ?limite=
export async function GET(request: NextRequest) {
  try {
    const limite = Number(request.nextUrl.searchParams.get("limite"));

    const clientes = await getConsultaClienteService().listar(
      request.nextUrl.searchParams.get("busca") || undefined,
      Number.isFinite(limite) && limite > 0 ? limite : undefined
    );

    return NextResponse.json({ sucesso: true, clientes });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível listar os clientes.");
  }
}
