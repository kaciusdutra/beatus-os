import { NextResponse } from "next/server";

import { getQrService } from "@/modules/qr/services/server/qrServiceFactory";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

// Ficha do item que o QR da gaveta ou da prateleira abre.
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    return NextResponse.json({ sucesso: true, ficha: await getQrService().fichaDoInsumo(id) });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível abrir a ficha do item.", 404);
  }
}
