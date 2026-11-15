import { NextResponse } from "next/server";

import { beatrizConfigurada } from "@/modules/beatriz/modelos/modeloAnthropic";

// Só diz se a chave da IA está preenchida no servidor. Nunca devolve a chave.
export async function GET() {
  return NextResponse.json({
    sucesso: true,
    configurada: beatrizConfigurada(),
    modelo: process.env.BEATRIZ_MODELO?.trim() || process.env.ANTHROPIC_MODELO?.trim() || "claude-sonnet-5-5",
  });
}
