import { NextResponse } from "next/server";

import { limitarVisitante } from "@/core/seguranca/limitesPublicos";

import { escolherVantagem } from "@/modules/clube/services/server/vantagemService";

// O cliente completou o cartão e escolhe a vantagem (clube, seção 28). Corpo: { codigo, vantagemId }.
// O código do link do cartão é a prova de quem é; sem o clube ligado, ou com código errado, a resposta é a mesma.
export async function POST(request: Request) {
  const limite = limitarVisitante("clube-vantagem", request, 20, 600_000);

  if (limite) {
    return limite;
  }

  try {
    const corpo = await request.json();

    const resultado = await escolherVantagem(typeof corpo?.codigo === "string" ? corpo.codigo : "", typeof corpo?.vantagemId === "string" ? corpo.vantagemId : "");

    if (!resultado.ok) {
      return NextResponse.json({ sucesso: false, mensagem: resultado.erro }, { status: 422 });
    }

    return NextResponse.json({
      sucesso: true,
      jaEscolhida: resultado.jaEscolhida,
      resgate: { nome: resultado.resgate.nome, descricao: resultado.resgate.descricaoParaOCliente, expiraEm: resultado.resgate.expiraEm.toISOString() },
    });
  } catch (error) {
    console.error("ERRO AO ESCOLHER A VANTAGEM DO CLUBE:", error);

    return NextResponse.json({ sucesso: false, mensagem: "Não foi possível escolher a vantagem agora. Tente de novo." }, { status: 500 });
  }
}
