import { NextResponse } from "next/server";

import { getAjustesService } from "@/modules/operacao/services/server/ajustesServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

import { operadorDaRequisicao } from "@/modules/atividades/services/operador";

// Ajustes para amanhã. Por padrão só os pendentes; com ?todos=1 vêm também os resolvidos.
export async function GET(request: Request) {
  try {
    const todos = new URL(request.url).searchParams.get("todos") === "1";

    const servico = getAjustesService();

    return NextResponse.json({
      sucesso: true,
      ajustes: todos ? await servico.listar() : await servico.pendentes(),
    });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível ler os ajustes.");
  }
}

// Corpo: { texto, itemTipo?, itemId?, itemNome? }
export async function POST(request: Request) {
  try {
    const corpo = await request.json();

    const texto = (valor: unknown) => (typeof valor === "string" && valor.trim() ? valor : undefined);

    const ajuste = await getAjustesService().criar(
      {
        texto: typeof corpo?.texto === "string" ? corpo.texto : "",
        itemTipo: texto(corpo?.itemTipo),
        itemId: texto(corpo?.itemId),
        itemNome: texto(corpo?.itemNome),
      },
      operadorDaRequisicao(request)
    );

    return NextResponse.json({ sucesso: true, ajuste });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível anotar o ajuste.");
  }
}
