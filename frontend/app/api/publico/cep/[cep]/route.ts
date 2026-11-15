import { NextResponse } from "next/server";

import { limitarVisitante } from "@/core/seguranca/limitesPublicos";

import { ErroConsultaCep, consultarCep } from "@/modules/fornecedores/services/server/consultaCep";

// Rota pública (o cliente do site informa o CEP): devolve rua, bairro e cidade para preencher
// o endereço. Só o CEP sai do sistema.
export async function GET(
  request: Request,
  context: { params: Promise<{ cep: string }> }
) {
  const limite = limitarVisitante("cep", request, 30, 60_000);

  if (limite) {
    return limite;
  }

  try {
    const { cep } = await context.params;

    return NextResponse.json({ sucesso: true, endereco: await consultarCep(cep) });
  } catch (error) {
    if (error instanceof ErroConsultaCep) {
      return NextResponse.json({ sucesso: false, mensagem: error.message }, { status: error.status });
    }

    console.error("Erro ao consultar o CEP (site):", error);

    return NextResponse.json({ sucesso: false, mensagem: "Não foi possível consultar o CEP agora. Preencha o endereço à mão." }, { status: 502 });
  }
}
