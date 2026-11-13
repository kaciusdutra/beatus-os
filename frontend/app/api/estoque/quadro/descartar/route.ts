import { NextResponse } from "next/server";

import { getKanbanService } from "@/modules/estoque/services/server/kanbanService";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

import { operadorDaRequisicao } from "@/modules/atividades/services/operador";

// Descarta (vencido, estragado): vira perda, com motivo.
// Corpo: { fichaTecnicaId, producaoLoteId?, gavetaId?, local, quantidade, motivo }
export async function POST(request: Request) {
  try {
    const corpo = await request.json();

    await getKanbanService().descartarCartao({
      fichaTecnicaId:
        typeof corpo?.fichaTecnicaId === "string" ? corpo.fichaTecnicaId : "",
      producaoLoteId:
        typeof corpo?.producaoLoteId === "string"
          ? corpo.producaoLoteId
          : undefined,
      gavetaId:
        typeof corpo?.gavetaId === "string" ? corpo.gavetaId : undefined,
      local: String(corpo?.local ?? ""),
      quantidade: Number(corpo?.quantidade),
      motivo: typeof corpo?.motivo === "string" ? corpo.motivo : "",
      operador: operadorDaRequisicao(request),
    });

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível descartar.");
  }
}
