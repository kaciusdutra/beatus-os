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

interface Contexto {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  context: Contexto
) {
  try {
    const { id } = await context.params;

    const ficha = await fichaService.buscarPorId(id);

    if (!ficha) {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem: "Ficha técnica não encontrada.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ sucesso: true, ficha });
  } catch (error) {
    console.error("ERRO AO BUSCAR FICHA:", error);

    return NextResponse.json(
      {
        sucesso: false,
        mensagem:
          "Não foi possível buscar a ficha técnica.",
      },
      { status: 500 }
    );
  }
}

// Altera a ficha inteira (itens incluídos). Para inativar, envie ativo: false.
// Fichas não são excluídas (regra 6.5).
export async function PUT(
  request: NextRequest,
  context: Contexto
) {
  try {
    const { id } = await context.params;

    const corpo = await request.json();

    const existente = await fichaService.buscarPorId(id);

    if (!existente) {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem: "Ficha técnica não encontrada.",
        },
        { status: 404 }
      );
    }

    const ficha = await fichaService.atualizar(
      lerFichaDoCorpo(
        {
          ...corpo,
          // O tipo e o produto de uma ficha não mudam.
          tipo: existente.tipo,
          produtoId: existente.produtoId,
        },
        existente
      )
    );

    return NextResponse.json({ sucesso: true, ficha });
  } catch (error) {
    const mensagem =
      error instanceof Error
        ? error.message
        : "Não foi possível atualizar a ficha.";

    console.error("ERRO AO ATUALIZAR FICHA:", error);

    return NextResponse.json(
      { sucesso: false, mensagem },
      { status: 400 }
    );
  }
}
