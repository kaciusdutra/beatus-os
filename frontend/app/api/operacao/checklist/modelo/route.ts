import { NextResponse } from "next/server";

import { getChecklistService } from "@/modules/operacao/services/server/checklistServiceFactory";

import { VERIFICACOES_AUTOMATICAS, type TipoDeChecklist } from "@/modules/operacao/services/checklist";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

import { operadorDaRequisicao } from "@/modules/atividades/services/operador";

// A lista de itens de cada checklist (a que o Kacius edita) e as verificações automáticas.
export async function GET() {
  try {
    return NextResponse.json({
      sucesso: true,
      modelo: await getChecklistService().modelo(),
      verificacoes: VERIFICACOES_AUTOMATICAS,
    });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível ler a lista do checklist.");
  }
}

// Troca a lista de um tipo. Corpo: { tipo: "ABERTURA"|"FECHAMENTO"|"PRODUCAO",
//   itens: [{ titulo, categoria?, obrigatorio, verificacao? }] } na ordem desejada.
export async function PUT(request: Request) {
  try {
    const corpo = await request.json();

    const itens = Array.isArray(corpo?.itens)
      ? corpo.itens.map((item: Record<string, unknown>) => ({
          titulo: typeof item?.titulo === "string" ? item.titulo : "",
          categoria: typeof item?.categoria === "string" && item.categoria.trim() ? item.categoria : undefined,
          obrigatorio: item?.obrigatorio !== false,
          verificacao: typeof item?.verificacao === "string" && item.verificacao ? item.verificacao : undefined,
        }))
      : [];

    const salvos = await getChecklistService().salvarModelo(
      corpo?.tipo as TipoDeChecklist,
      itens,
      operadorDaRequisicao(request)
    );

    return NextResponse.json({ sucesso: true, itens: salvos });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível salvar a lista do checklist.");
  }
}
