import { NextResponse } from "next/server";

import { criarCustoFixoServicePostgres } from "@/modules/precificacao/services/server/custoFixoServiceFactory";

const custoFixoService = criarCustoFixoServicePostgres();

// Edita ou inativa um custo fixo (ele nunca é apagado).
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const corpo = await request.json();

    const custo = await custoFixoService.atualizar(id, {
      nome: typeof corpo?.nome === "string" ? corpo.nome : "",
      valorMensal: Number(corpo?.valorMensal),
      inicioVigencia:
        typeof corpo?.inicioVigencia === "string" &&
        corpo.inicioVigencia
          ? corpo.inicioVigencia
          : undefined,
      fimVigencia:
        typeof corpo?.fimVigencia === "string"
          ? corpo.fimVigencia
          : undefined,
      ativo:
        typeof corpo?.ativo === "boolean" ? corpo.ativo : undefined,
      observacao:
        typeof corpo?.observacao === "string"
          ? corpo.observacao
          : undefined,
    });

    return NextResponse.json({ sucesso: true, custo });
  } catch (error) {
    console.error("ERRO AO ATUALIZAR O CUSTO FIXO:", error);

    const mensagem =
      error instanceof Error
        ? error.message
        : "Não foi possível atualizar o custo fixo.";

    return NextResponse.json(
      { sucesso: false, mensagem },
      {
        status:
          mensagem === "Custo fixo não encontrado." ? 404 : 400,
      }
    );
  }
}
