import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  consultarCnpjPublico,
  ErroConsultaCnpj,
} from "@/modules/fornecedores/services/server/consultaCnpjPublica";

// Consulta pública do CNPJ para preencher o cadastro do fornecedor.
// GET /api/fornecedores/consulta-cnpj?cnpj=12345678000195
export async function GET(
  request: NextRequest
) {
  const cnpj =
    request.nextUrl.searchParams.get(
      "cnpj"
    ) ?? "";

  try {
    const dados =
      await consultarCnpjPublico(cnpj);

    return NextResponse.json({
      sucesso: true,
      dados,
    });
  } catch (error) {
    if (error instanceof ErroConsultaCnpj) {
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
      "ERRO AO CONSULTAR CNPJ:",
      error
    );

    return NextResponse.json(
      {
        sucesso: false,
        mensagem:
          "Não foi possível consultar o CNPJ agora. Preencha os dados manualmente.",
      },
      {
        status: 500,
      }
    );
  }
}
