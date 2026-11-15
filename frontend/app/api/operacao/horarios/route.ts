import { NextResponse } from "next/server";

import { getHorarioService } from "@/modules/operacao/services/server/horarioServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

import { operadorDaRequisicao } from "@/modules/atividades/services/operador";

// Horário normal da semana e exceções (por dia ou período). O sistema todo lê
// daqui para saber se a operação está aberta.
export async function GET() {
  try {
    return NextResponse.json({
      sucesso: true,
      configuracao: await getHorarioService().obter(),
    });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível ler os horários.");
  }
}

// Salva o horário normal. Corpo: { semanal: [ {aberto, abertura?, fechamento?} x 7 ] },
// de domingo (0) a sábado (6).
export async function PUT(request: Request) {
  try {
    const corpo = await request.json();

    const semanal = Array.isArray(corpo?.semanal)
      ? corpo.semanal.map((dia: Record<string, unknown>) => ({
          aberto: dia?.aberto === true,
          abertura: typeof dia?.abertura === "string" ? dia.abertura : undefined,
          fechamento: typeof dia?.fechamento === "string" ? dia.fechamento : undefined,
        }))
      : [];

    const configuracao = await getHorarioService().salvarSemana(semanal, operadorDaRequisicao(request));

    return NextResponse.json({ sucesso: true, configuracao });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível salvar os horários.");
  }
}
