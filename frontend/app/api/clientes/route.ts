import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  criarClienteServicePostgres,
} from "@/modules/clientes/services/server/clienteServiceFactory";

const clienteService =
  criarClienteServicePostgres();

export async function GET(
  request: NextRequest
) {
  const telefone =
    request.nextUrl.searchParams.get(
      "telefone"
    );

  const cpf =
    request.nextUrl.searchParams.get(
      "cpf"
    );

  if (
    !telefone?.trim() &&
    !cpf?.trim()
  ) {

  } catch (error) {
    console.error(
      "ERRO AO BUSCAR CLIENTE:",
      error
    );

    
    return NextResponse.json(
      {
        sucesso: false,

        mensagem:
          "Informe o telefone ou CPF do cliente.",
      },
      {
        status: 400,
      }
    );
  }

  try {
    const cliente =
      telefone?.trim()
        ? await clienteService.buscarPorTelefone(
            telefone
          )
        : await clienteService.buscarPorCpf(
            cpf!
          );

    return NextResponse.json({
      sucesso: true,

      encontrado:
        Boolean(cliente),

      cliente:
        cliente ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        sucesso: false,

        mensagem:
          error instanceof Error
            ? error.message
            : "Não foi possível localizar o cliente.",
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
            "Dados do cliente inválidos.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !body.nome?.trim()
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem:
            "Nome do cliente é obrigatório.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !body.telefone?.trim()
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem:
            "Telefone do cliente é obrigatório.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Array.isArray(
        body.enderecos
      ) ||
      body.enderecos.length ===
        0
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem:
            "O cliente precisa ter pelo menos um endereço.",
        },
        {
          status: 400,
        }
      );
    }

    const cliente =
      await clienteService.criarCliente({
        cliente: body,
      });

    return NextResponse.json(
      {
        sucesso: true,

        cliente,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    const mensagem =
      error instanceof Error
        ? error.message
        : "Não foi possível cadastrar o cliente.";

    const conflito =
      mensagem.includes(
        "Já existe um cliente"
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