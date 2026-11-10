import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  criarProdutoServicePostgres,
} from "@/modules/produtos/services/server/produtoServiceFactory";

const produtoService =
  criarProdutoServicePostgres();

// Lista os produtos (para escolher de quem é a ficha técnica).
export async function GET() {
  try {
    return NextResponse.json({
      sucesso: true,
      produtos: await produtoService.listar(),
    });
  } catch (error) {
    console.error("ERRO AO LISTAR PRODUTOS:", error);

    return NextResponse.json(
      {
        sucesso: false,
        mensagem:
          "Não foi possível listar os produtos.",
      },
      { status: 500 }
    );
  }
}

// Cria um produto novo (preço 0; o preço vem da precificação).
// Corpo: { nome, descricao?, categoria }
export async function POST(
  request: NextRequest
) {
  try {
    const corpo = await request.json();

    const produto = await produtoService.criar({
      nome:
        typeof corpo?.nome === "string"
          ? corpo.nome
          : "",
      descricao:
        typeof corpo?.descricao === "string"
          ? corpo.descricao
          : undefined,
      categoria:
        typeof corpo?.categoria === "string"
          ? corpo.categoria
          : "",
    });

    return NextResponse.json(
      { sucesso: true, produto },
      { status: 201 }
    );
  } catch (error) {
    const mensagem =
      error instanceof Error
        ? error.message
        : "Não foi possível criar o produto.";

    console.error("ERRO AO CRIAR PRODUTO:", error);

    return NextResponse.json(
      { sucesso: false, mensagem },
      {
        status: mensagem.startsWith("Já existe")
          ? 409
          : 400,
      }
    );
  }
}
