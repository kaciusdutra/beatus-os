import { NextResponse } from "next/server";

import { getPixService } from "@/modules/pix/services/server/pixServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

import { operadorDaRequisicao } from "@/modules/atividades/services/operador";

export async function GET() {
  try {
    return NextResponse.json({
      sucesso: true,
      configuracao: await getPixService().obterConfiguracao(),
    });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível ler a configuração do Pix.");
  }
}

// Corpo: { chave, nomeRecebedor, cidade }
export async function PUT(request: Request) {
  try {
    const corpo = await request.json();

    const configuracao = await getPixService().salvarConfiguracao(
      {
        chave: typeof corpo?.chave === "string" ? corpo.chave : "",
        nomeRecebedor: typeof corpo?.nomeRecebedor === "string" ? corpo.nomeRecebedor : "",
        cidade: typeof corpo?.cidade === "string" ? corpo.cidade : "",
      },
      operadorDaRequisicao(request)
    );

    return NextResponse.json({ sucesso: true, configuracao });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível salvar a configuração do Pix.");
  }
}
