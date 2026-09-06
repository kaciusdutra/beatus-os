import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  criarFornecedorServicePostgres,
} from "@/modules/fornecedores/services/server/fornecedorServiceFactory";

const fornecedorService =
  criarFornecedorServicePostgres();

export async function GET(
  request: NextRequest
) {
  const cpf =
    request.nextUrl.searchParams.get(
      "cpf"
    );

  const cnpj =
    request.nextUrl.searchParams.get(
      "cnpj"
    );

  const id =
    request.nextUrl.searchParams.get(
      "id"
    );

  try {
    if (id?.trim()) {
      const fornecedor =
        await fornecedorService.buscarPorId(
          id.trim()
        );

      return NextResponse.json({
        sucesso: true,
        encontrado:
          Boolean(fornecedor),
        fornecedor:
          fornecedor ?? null,
      });
    }

    if (cpf?.trim()) {
      const fornecedor =
        await fornecedorService.buscarPorCpf(
          cpf.trim()
        );

      return NextResponse.json({
        sucesso: true,
        encontrado:
          Boolean(fornecedor),
        fornecedor:
          fornecedor ?? null,
      });
    }

    if (cnpj?.trim()) {
      const fornecedor =
        await fornecedorService.buscarPorCnpj(
          cnpj.trim()
        );

      return NextResponse.json({
        sucesso: true,
        encontrado:
          Boolean(fornecedor),
        fornecedor:
          fornecedor ?? null,
      });
    }

    const fornecedores =
      await fornecedorService.listar();

    return NextResponse.json({
      sucesso: true,
      fornecedores,
    });
  } catch (error) {
    console.error(
      "ERRO AO BUSCAR FORNECEDORES:",
      error
    );

    return NextResponse.json(
      {
        sucesso: false,
        mensagem:
          error instanceof Error
            ? error.message
            : "Não foi possível localizar os fornecedores.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
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

    const agora =
      new Date().toISOString();

    const fornecedor =
      await fornecedorService.criarFornecedor({
        fornecedor: {
          id:
            crypto.randomUUID(),

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
            agora,

          atualizadoEm:
            agora,

          ativo:
            body.ativo !== false,
        },
      });

    return NextResponse.json(
      {
        sucesso: true,
        fornecedor,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "ERRO AO CADASTRAR FORNECEDOR:",
      error
    );

    const mensagem =
      error instanceof Error
        ? error.message
        : "Não foi possível cadastrar o fornecedor.";

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