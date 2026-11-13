import { NextResponse } from "next/server";

import { getEstoqueService } from "@/modules/estoque/services/server/estoqueService";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

import { operadorDaRequisicao } from "@/modules/atividades/services/operador";

export async function GET() {
  try {
    const lotes = await getEstoqueService().listarLotes();

    return NextResponse.json({ sucesso: true, lotes });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível listar os lotes.", 500);
  }
}

// Produz um lote. Corpo: { fichaId, quantidadePlanejada, quantidadeProduzida,
// validade?, observacao? }
export async function POST(request: Request) {
  try {
    const corpo = await request.json();

    const resultado = await getEstoqueService().produzirLote({
      fichaId: typeof corpo?.fichaId === "string" ? corpo.fichaId : "",
      quantidadePlanejada: Number(corpo?.quantidadePlanejada),
      quantidadeProduzida: Number(corpo?.quantidadeProduzida),
      validade:
        typeof corpo?.validade === "string" && corpo.validade
          ? corpo.validade
          : undefined,
      observacao:
        typeof corpo?.observacao === "string" ? corpo.observacao : undefined,
      operador: operadorDaRequisicao(request),
    });

    return NextResponse.json({ sucesso: true, ...resultado }, { status: 201 });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível registrar o lote.");
  }
}
