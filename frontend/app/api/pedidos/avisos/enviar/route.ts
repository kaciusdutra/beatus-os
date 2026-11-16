import { NextResponse } from "next/server";

import { getEnvioDeAvisosService } from "@/modules/pedidos/services/server/envioDeAvisosServiceFactory";

// Envia os avisos pendentes do pedido (WhatsApp pela API da Meta; os do site ficam dispensados).
// A tela da Cozinha chama esta rota a cada poucos segundos. Sem a conexão com o WhatsApp configurada,
// os avisos do WhatsApp esperam e a resposta diz configurado: false.
export async function POST() {
  try {
    const resultado = await getEnvioDeAvisosService().enviarPendentes();

    return NextResponse.json({ sucesso: true, resultado });
  } catch (error) {
    console.error("ERRO AO ENVIAR OS AVISOS DO PEDIDO:", error);

    return NextResponse.json({ sucesso: false, mensagem: "Não foi possível enviar os avisos agora." }, { status: 500 });
  }
}
