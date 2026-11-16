import { NextResponse } from "next/server";

import { getConsultaClienteService } from "@/modules/clientes/services/server/consultaClienteServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

import { operadorDaRequisicao } from "@/modules/atividades/services/operador";

// Troca as etiquetas do cliente (a memória da Beatriz). Corpo: { etiquetas: string[] }.
// Etiqueta de saúde, crença ou dado pessoal é recusada.
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const corpo = await request.json();

    const cliente = await getConsultaClienteService().editarEtiquetas(id, corpo?.etiquetas, operadorDaRequisicao(request));

    return NextResponse.json({ sucesso: true, cliente });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível salvar as etiquetas.");
  }
}
