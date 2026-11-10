import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  criarFichaTecnicaService,
} from "@/modules/fichasTecnicas/services/server/fichaTecnicaServiceFactory";

import {
  lerFichaDoCorpo,
} from "@/modules/fichasTecnicas/services/server/lerFichaDoCorpo";

const fichaService =
  criarFichaTecnicaService();

// Lista todas as fichas (preparações e produtos), com os itens.
// O custo é calculado pela tela (e pelo motor de custo), sempre com os
// preços atuais dos insumos.
export async function GET() {
  try {
    return NextResponse.json({
      sucesso: true,
      fichas: await fichaService.listar(),
    });
  } catch (error) {
    console.error("ERRO AO LISTAR FICHAS:", error);

    return NextResponse.json(
      {
        sucesso: false,
        mensagem:
          "Não foi possível listar as fichas técnicas.",
      },
      { status: 500 }
    );
  }
}

// Cria uma ficha (preparação ou produto).
export async function POST(
  request: NextRequest
) {
  try {
    const corpo = await request.json();

    if (!corpo || typeof corpo !== "object") {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem: "Dados da ficha inválidos.",
        },
        { status: 400 }
      );
    }

    const ficha = await fichaService.criar(
      lerFichaDoCorpo(corpo)
    );

    return NextResponse.json(
      { sucesso: true, ficha },
      { status: 201 }
    );
  } catch (error) {
    const mensagem =
      error instanceof Error
        ? error.message
        : "Não foi possível criar a ficha.";

    console.error("ERRO AO CRIAR FICHA:", error);

    return NextResponse.json(
      { sucesso: false, mensagem },
      { status: 400 }
    );
  }
}
