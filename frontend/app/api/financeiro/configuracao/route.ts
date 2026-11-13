import { NextResponse } from "next/server";

import { getContaPagarService } from "@/modules/financeiro/services/server/financeiroServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

import { operadorDaRequisicao } from "@/modules/atividades/services/operador";

export async function GET() {
  try {
    const configuracao = await getContaPagarService().buscarConfiguracao();

    return NextResponse.json({ sucesso: true, configuracao });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível ler a configuração do financeiro.");
  }
}

// Saldo de partida do caixa. Corpo: { saldoInicial, saldoInicialEm: "AAAA-MM-DD" }
export async function PUT(request: Request) {
  try {
    const corpo = await request.json();

    const configuracao = await getContaPagarService().salvarConfiguracao(
      {
        saldoInicial: Number(String(corpo?.saldoInicial ?? "").replace(",", ".")),
        saldoInicialEm:
          typeof corpo?.saldoInicialEm === "string" ? corpo.saldoInicialEm : undefined,
      },
      operadorDaRequisicao(request)
    );

    return NextResponse.json({ sucesso: true, configuracao });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível salvar o saldo inicial.");
  }
}
