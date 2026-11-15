import { NextResponse } from "next/server";

import { getQrService } from "@/modules/qr/services/server/qrServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

import { operadorDaRequisicao } from "@/modules/atividades/services/operador";

// O que já foi conferido hoje pelo QR.
export async function GET() {
  try {
    return NextResponse.json({ sucesso: true, conferidos: await getQrService().conferidosHoje() });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível ler as conferências.");
  }
}

// Marca o item como conferido hoje. Corpo: { itemTipo: "INSUMO"|"PREPARACAO"|"LOTE", itemId }
export async function POST(request: Request) {
  try {
    const corpo = await request.json();

    const conferencia = await getQrService().conferir(
      {
        itemTipo: typeof corpo?.itemTipo === "string" ? corpo.itemTipo : "",
        itemId: typeof corpo?.itemId === "string" ? corpo.itemId : "",
      },
      operadorDaRequisicao(request)
    );

    return NextResponse.json({ sucesso: true, conferencia });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível registrar a conferência.");
  }
}
