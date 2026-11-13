import { NextRequest, NextResponse } from "next/server";

import { getKanbanService } from "@/modules/estoque/services/server/kanbanService";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

import { operadorDaRequisicao } from "@/modules/atividades/services/operador";

// Dados da etiqueta de um cartão do quadro.
// ?fichaTecnicaId=&producaoLoteId=&gavetaId=&local=
export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams;

    const etiqueta = await getKanbanService().dadosDaEtiqueta({
      fichaTecnicaId: p.get("fichaTecnicaId") ?? "",
      producaoLoteId: p.get("producaoLoteId") || undefined,
      gavetaId: p.get("gavetaId") || undefined,
      local: p.get("local") ?? "",
      responsavel: operadorDaRequisicao(request),
    });

    return NextResponse.json({ sucesso: true, etiqueta });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível montar a etiqueta.");
  }
}
