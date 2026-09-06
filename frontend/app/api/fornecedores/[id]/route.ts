import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  criarFornecedorServicePostgres,
} from "@/modules/fornecedores/services/server/fornecedorServiceFactory";

const fornecedorService =
  criarFornecedorServicePostgres();

export async function PUT(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const { id } =
      await context.params;

    const body =
      await request.json();

    if (
      !body ||
      typeof body !== "object"
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem:
            "Dados do fornecedor inválidos.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !body.razaoSocial?.trim()
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem:
            "Razão social do fornecedor é obrigatória.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !body.cpf?.trim() &&
      !body.cnpj?.trim()
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem:
            "Informe CPF ou CNPJ do fornecedor.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      body.cpf?.trim() &&
      body.cnpj?.trim()
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem:
            "Informe apenas CPF ou CNPJ do fornecedor.",
        },
        {
          status: 400,
        }
      );
    }

    const existente =
      await fornecedorService.buscarPorId(
        id
      );

    if (!existente) {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem:
            "Fornecedor não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    const atualizado =
      await fornecedorService.atualizarFornecedor({
        fornecedor: {
          id,

          razaoSocial:
            body.razaoSocial.trim(),

          nomeFantasia:
            body.nomeFantasia?.trim() ||
            undefined,

          cpf:
            body.cpf?.trim() ||
            undefined,

          cnpj:
            body.cnpj?.trim() ||
            undefined,

          telefone:
            body.telefone?.trim() ||
            undefined,

          email:
            body.email?.trim() ||
            undefined,

          observacao:
            body.observacao?.trim() ||
            undefined,

          criadoEm:
            existente.criadoEm,

          atualizadoEm:
            new Date().toISOString(),

          ativo:
            body.ativo !== false,
        },
      });

    return NextResponse.json({
      sucesso: true,
      fornecedor:
        atualizado,
    });
  } catch (error) {
    console.error(
      "ERRO AO ATUALIZAR FORNECEDOR:",
      error
    );

    const mensagem =
      error instanceof Error
        ? error.message
        : "Não foi possível atualizar o fornecedor.";

    const conflito =
      mensagem.includes(
        "Já existe um fornecedor"
      );

    return NextResponse.json(
      {
        sucesso: false,
        mensagem,
      },
      {
        status:
          conflito
            ? 409
            : 500,
      }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const { id } =
      await context.params;

    await fornecedorService.removerFornecedor(
      id
    );

    return NextResponse.json({
      sucesso: true,
      mensagem:
        "Fornecedor removido com sucesso.",
    });
  } catch (error) {
    console.error(
      "ERRO AO REMOVER FORNECEDOR:",
      error
    );

    const mensagem =
      error instanceof Error
        ? error.message
        : "Não foi possível remover o fornecedor.";

    const naoEncontrado =
      mensagem ===
      "Fornecedor não encontrado.";

    return NextResponse.json(
      {
        sucesso: false,
        mensagem,
      },
      {
        status:
          naoEncontrado
            ? 404
            : 500,
      }
    );
  }
}