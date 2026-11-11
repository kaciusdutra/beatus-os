import { NextResponse } from "next/server";

import { criarCustoFixoServicePostgres } from "@/modules/precificacao/services/server/custoFixoServiceFactory";

const custoFixoService = criarCustoFixoServicePostgres();

function mensagemDe(error: unknown, padrao: string): string {
  return error instanceof Error ? error.message : padrao;
}

// Lista os custos fixos e o resumo (total do mês e custo por pedido).
export async function GET() {
  try {
    const [custos, resumo] = await Promise.all([
      custoFixoService.listar(),
      custoFixoService.resumo(),
    ]);

    return NextResponse.json({ sucesso: true, custos, resumo });
  } catch (error) {
    console.error("ERRO AO LISTAR OS CUSTOS FIXOS:", error);

    return NextResponse.json(
      {
        sucesso: false,
        mensagem: mensagemDe(
          error,
          "Não foi possível listar os custos fixos."
        ),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const corpo = await request.json();

    const custo = await custoFixoService.criar({
      nome: typeof corpo?.nome === "string" ? corpo.nome : "",
      valorMensal: Number(corpo?.valorMensal),
      inicioVigencia:
        typeof corpo?.inicioVigencia === "string" &&
        corpo.inicioVigencia
          ? corpo.inicioVigencia
          : undefined,
      fimVigencia:
        typeof corpo?.fimVigencia === "string" && corpo.fimVigencia
          ? corpo.fimVigencia
          : undefined,
      observacao:
        typeof corpo?.observacao === "string"
          ? corpo.observacao
          : undefined,
    });

    return NextResponse.json({ sucesso: true, custo });
  } catch (error) {
    console.error("ERRO AO CRIAR O CUSTO FIXO:", error);

    return NextResponse.json(
      {
        sucesso: false,
        mensagem: mensagemDe(
          error,
          "Não foi possível criar o custo fixo."
        ),
      },
      { status: 400 }
    );
  }
}
