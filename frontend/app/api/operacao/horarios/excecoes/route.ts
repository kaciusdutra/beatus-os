import { NextResponse } from "next/server";

import { getHorarioService } from "@/modules/operacao/services/server/horarioServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

import { operadorDaRequisicao } from "@/modules/atividades/services/operador";

// Cria uma exceção ao horário normal (feriado, folga, abrir ou fechar um dia).
// Corpo: { inicio: "AAAA-MM-DD", fim: "AAAA-MM-DD", aberto, abertura?, fechamento?, observacao? }
export async function POST(request: Request) {
  try {
    const corpo = await request.json();

    const excecao = await getHorarioService().criarExcecao(
      {
        inicio: typeof corpo?.inicio === "string" ? corpo.inicio : "",
        fim: typeof corpo?.fim === "string" ? corpo.fim : "",
        aberto: corpo?.aberto === true,
        abertura: typeof corpo?.abertura === "string" ? corpo.abertura : undefined,
        fechamento: typeof corpo?.fechamento === "string" ? corpo.fechamento : undefined,
        observacao: typeof corpo?.observacao === "string" ? corpo.observacao : undefined,
      },
      operadorDaRequisicao(request)
    );

    return NextResponse.json({ sucesso: true, excecao });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível criar a exceção.");
  }
}
