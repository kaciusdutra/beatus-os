import { NextResponse } from "next/server";

import { criarCustoFixoServicePostgres } from "@/modules/precificacao/services/server/custoFixoServiceFactory";

import { criarPrecificacaoServicePostgres } from "@/modules/precificacao/services/server/precificacaoServiceFactory";

const precificacaoService = criarPrecificacaoServicePostgres();

const custoFixoService = criarCustoFixoServicePostgres();

// Tudo que a tela de precificação precisa, menos os custos das fichas
// (que a tela calcula com os insumos atuais).
export async function GET() {
  try {
    const [parametros, canais, precos, resumoFixos] =
      await Promise.all([
        precificacaoService.buscarParametros(),
        precificacaoService.listarCanais(),
        precificacaoService.listarPrecos(),
        custoFixoService.resumo(),
      ]);

    return NextResponse.json({
      sucesso: true,
      parametros,
      canais,
      precos,
      custoFixoPorPedido: resumoFixos.custoPorPedido ?? 0,
      totalCustosFixos: resumoFixos.totalMensal,
    });
  } catch (error) {
    console.error("ERRO AO CARREGAR A PRECIFICAÇÃO:", error);

    return NextResponse.json(
      {
        sucesso: false,
        mensagem:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar a precificação.",
      },
      { status: 500 }
    );
  }
}
