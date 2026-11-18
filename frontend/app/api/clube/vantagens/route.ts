import { NextResponse } from "next/server";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

import { listarVantagens, salvarVantagem } from "@/modules/clube/services/server/vantagemService";

import { validarVantagem } from "@/modules/clube/vantagens";

// O catálogo de vantagens do clube (a equipe). Ler: configurações; criar e mudar: quem gerencia as configurações.
export async function GET() {
  try {
    return NextResponse.json({ sucesso: true, vantagens: await listarVantagens() });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível ler as vantagens.");
  }
}

export async function POST(request: Request) {
  try {
    const validacao = validarVantagem(await request.json());

    if (!validacao.ok) {
      return NextResponse.json({ sucesso: false, mensagem: validacao.erro }, { status: 422 });
    }

    return NextResponse.json({ sucesso: true, vantagem: await salvarVantagem(validacao.dados) });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível salvar a vantagem.");
  }
}
