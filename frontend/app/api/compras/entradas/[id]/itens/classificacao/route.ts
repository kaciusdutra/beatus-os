import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  criarEntradaCompraServicePostgres,
} from "@/modules/compras/services/server/entradaCompraServiceFactory";

import {
  ClassificacaoItemInput,
} from "@/modules/compras/types/entradaCompra";

import {
  DestinoItemCompra,
} from "@/modules/compras/domain/destinoItemCompra";

const entradaCompraService =
  criarEntradaCompraServicePostgres();

interface Contexto {
  params: Promise<{
    id: string;
  }>;
}

function statusDoErro(
  mensagem: string
): number {
  if (
    mensagem ===
    "Entrada de compra não encontrada."
  ) {
    return 404;
  }

  if (
    mensagem.includes(
      "Somente entradas em RASCUNHO"
    )
  ) {
    return 409;
  }

  return 400;
}

// Identificação dos itens (conhecido ou novo) e destino sugerido.
export async function GET(
  _request: NextRequest,
  context: Contexto
) {
  try {
    const { id } = await context.params;

    const identificacoes =
      await entradaCompraService.identificarItens(
        id
      );

    return NextResponse.json({
      sucesso: true,
      identificacoes,
    });
  } catch (error) {
    console.error(
      "ERRO AO IDENTIFICAR OS ITENS DA ENTRADA:",
      error
    );

    const mensagem =
      error instanceof Error
        ? error.message
        : "Não foi possível identificar os itens.";

    return NextResponse.json(
      {
        sucesso: false,
        mensagem,
      },
      {
        status: statusDoErro(mensagem),
      }
    );
  }
}

// Grava o destino dos itens.
// Corpo: { itens: [{ itemId, destino | null }] }
export async function PATCH(
  request: NextRequest,
  context: Contexto
) {
  try {
    const { id } = await context.params;

    const body = await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      !Array.isArray(body.itens)
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem:
            "Dados da classificação inválidos.",
        },
        {
          status: 400,
        }
      );
    }

    const itens: ClassificacaoItemInput[] =
      body.itens.map(
        (item: Record<string, unknown>) => ({
          itemId:
            typeof item?.itemId === "string"
              ? item.itemId
              : "",
          destino:
            // O serviço valida se o destino existe.
            typeof item?.destino === "string" &&
            item.destino
              ? (item.destino as DestinoItemCompra)
              : null,
          quantidadeReal:
            item?.quantidadeReal === null
              ? null
              : typeof item?.quantidadeReal === "number"
                ? item.quantidadeReal
                : undefined,
          unidadeReal:
            item?.unidadeReal === null
              ? null
              : typeof item?.unidadeReal === "string"
                ? item.unidadeReal
                : undefined,
          lembrarFator: item?.lembrarFator === true,
        })
      );

    const entrada =
      await entradaCompraService.classificarItens(
        id,
        itens
      );

    return NextResponse.json({
      sucesso: true,
      entrada,
    });
  } catch (error) {
    console.error(
      "ERRO AO CLASSIFICAR ITENS DA ENTRADA:",
      error
    );

    const mensagem =
      error instanceof Error
        ? error.message
        : "Não foi possível classificar os itens.";

    return NextResponse.json(
      {
        sucesso: false,
        mensagem,
      },
      {
        status: statusDoErro(mensagem),
      }
    );
  }
}
