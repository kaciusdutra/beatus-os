import { NextResponse } from "next/server";

import { getFinanceiroService } from "@/modules/financeiro/services/server/financeiroServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

import { operadorDaRequisicao } from "@/modules/atividades/services/operador";

// Lança uma despesa ou receita avulsa.
// Corpo: { tipo: "ENTRADA"|"SAIDA", categoria, descricao, valor, data: "AAAA-MM-DD", forma?, observacao? }
export async function POST(request: Request) {
  try {
    const corpo = await request.json();

    const lancamento = await getFinanceiroService().criarLancamento(
      {
        tipo: corpo?.tipo === "ENTRADA" ? "ENTRADA" : "SAIDA",
        categoria: typeof corpo?.categoria === "string" ? corpo.categoria : "",
        descricao: typeof corpo?.descricao === "string" ? corpo.descricao : "",
        valor: Number(String(corpo?.valor ?? "").replace(",", ".")),
        data: typeof corpo?.data === "string" ? corpo.data : "",
        forma: typeof corpo?.forma === "string" ? corpo.forma : undefined,
        observacao:
          typeof corpo?.observacao === "string" ? corpo.observacao : undefined,
      },
      operadorDaRequisicao(request)
    );

    return NextResponse.json({ sucesso: true, lancamento });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível lançar.");
  }
}
