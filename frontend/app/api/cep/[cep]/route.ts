import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  consultarCep,
  ErroConsultaCep,
} from "@/modules/fornecedores/services/server/consultaCep";

// Endereço pelo CEP, para preencher cadastros (fornecedores e, depois, clientes).
// GET /api/cep/69005000
export async function GET(
  _request: NextRequest,
  context: {
    params: Promise<{
      cep: string;
    }>;
  }
) {
  try {
    const { cep } = await context.params;

    const endereco =
      await consultarCep(cep);

    return NextResponse.json({
      sucesso: true,
      endereco,
    });
  } catch (error) {
    if (error instanceof ErroConsultaCep) {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem: error.message,
        },
        {
          status: error.status,
        }
      );
    }

    console.error(
      "ERRO AO CONSULTAR CEP:",
      error
    );

    return NextResponse.json(
      {
        sucesso: false,
        mensagem:
          "Não foi possível consultar o CEP agora. Preencha o endereço manualmente.",
      },
      {
        status: 500,
      }
    );
  }
}
