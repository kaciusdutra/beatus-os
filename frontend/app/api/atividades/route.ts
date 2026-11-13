import { NextRequest, NextResponse } from "next/server";

import { listarAtividades } from "@/modules/atividades/services/server/atividadeService";

// Registro de atividades. ?entidade=&referencia=&de=AAAA-MM-DD&ate=AAAA-MM-DD&limite=
export async function GET(request: NextRequest) {
  try {
    const parametros = request.nextUrl.searchParams;

    const atividades = await listarAtividades({
      entidade: parametros.get("entidade") || undefined,
      referencia: parametros.get("referencia")?.trim() || undefined,
      de: parametros.get("de") || undefined,
      ate: parametros.get("ate") || undefined,
      limite: Number(parametros.get("limite")) || undefined,
    });

    return NextResponse.json({ sucesso: true, atividades });
  } catch (error) {
    console.error("ERRO AO LISTAR AS ATIVIDADES:", error);

    return NextResponse.json(
      {
        sucesso: false,
        mensagem: "Não foi possível carregar o registro de atividades.",
      },
      { status: 500 }
    );
  }
}
