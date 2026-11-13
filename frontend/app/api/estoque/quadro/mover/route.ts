import { NextResponse } from "next/server";

import { getKanbanService } from "@/modules/estoque/services/server/kanbanService";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

import { operadorDaRequisicao } from "@/modules/atividades/services/operador";

// Anda com um cartão para outra coluna.
// Corpo: { fichaTecnicaId, producaoLoteId?, gavetaId?, deLocal, paraLocal, quantidade }
export async function POST(request: Request) {
  try {
    const corpo = await request.json();

    await getKanbanService().moverCartao({
      fichaTecnicaId:
        typeof corpo?.fichaTecnicaId === "string" ? corpo.fichaTecnicaId : "",
      producaoLoteId:
        typeof corpo?.producaoLoteId === "string"
          ? corpo.producaoLoteId
          : undefined,
      gavetaId:
        typeof corpo?.gavetaId === "string" ? corpo.gavetaId : undefined,
      deLocal: String(corpo?.deLocal ?? ""),
      paraLocal: String(corpo?.paraLocal ?? ""),
      quantidade: Number(corpo?.quantidade),
      operador: operadorDaRequisicao(request),
    });

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível mover o cartão.");
  }
}
