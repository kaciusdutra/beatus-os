import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  criarInsumoServicePostgres,
} from "@/modules/insumos/services/server/insumoServiceFactory";

const insumoService =
  criarInsumoServicePostgres();

function texto(
  valor: unknown
): string | undefined {
  return typeof valor === "string" &&
    valor.trim()
    ? valor.trim()
    : undefined;
}

// Altera só os campos enviados; o custo unitário é recalculado pelo serviço.
// PATCH /api/insumos/[id]
export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const { id } = await context.params;

    const corpo = await request.json();

    if (!corpo || typeof corpo !== "object") {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "Dados do insumo inválidos.",
        },
        { status: 400 }
      );
    }

    const existente =
      await insumoService.buscarPorId(id);

    if (!existente) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "Insumo não encontrado.",
        },
        { status: 404 }
      );
    }

    const quantidadeCompra =
      corpo.quantidadeCompra !== undefined
        ? Number(corpo.quantidadeCompra)
        : existente.quantidadeCompra;

    const precoCompra =
      corpo.precoCompra !== undefined
        ? Number(corpo.precoCompra)
        : existente.precoCompra;

    const atualizado =
      await insumoService.atualizar({
        ...existente,
        nome: texto(corpo.nome) ?? existente.nome,
        categoriaId:
          texto(corpo.categoriaId) ??
          existente.categoriaId,
        unidadeCompraId:
          texto(corpo.unidadeCompraId) ??
          existente.unidadeCompraId,
        quantidadeCompra,
        precoCompra,
        // null ou vazio limpa a equivalência; número e unidade andam juntos.
        equivalenciaQuantidade:
          corpo.equivalenciaQuantidade === null ||
          corpo.equivalenciaQuantidade === ""
            ? undefined
            : corpo.equivalenciaQuantidade !== undefined
              ? Number(corpo.equivalenciaQuantidade)
              : existente.equivalenciaQuantidade,
        equivalenciaUnidade:
          corpo.equivalenciaUnidade === null ||
          corpo.equivalenciaUnidade === ""
            ? undefined
            : (texto(corpo.equivalenciaUnidade) ??
              existente.equivalenciaUnidade),
        perdaLimpeza:
          corpo.perdaLimpeza !== undefined &&
          corpo.perdaLimpeza !== null &&
          corpo.perdaLimpeza !== ""
            ? Number(corpo.perdaLimpeza)
            : existente.perdaLimpeza,
        fornecedorId:
          corpo.fornecedorId === null
            ? undefined
            : (texto(corpo.fornecedorId) ??
              existente.fornecedorId),
        ativo:
          typeof corpo.ativo === "boolean"
            ? corpo.ativo
            : existente.ativo,
        observacao:
          corpo.observacao === null
            ? undefined
            : (texto(corpo.observacao) ??
              existente.observacao),
        atualizadoEm: new Date().toISOString(),
      });

    return NextResponse.json({
      sucesso: true,
      insumo: atualizado,
    });
  } catch (error) {
    console.error(
      "ERRO AO ATUALIZAR INSUMO:",
      error
    );

    return NextResponse.json(
      {
        sucesso: false,
        erro:
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar o insumo.",
      },
      { status: 400 }
    );
  }
}
