import { NextResponse } from "next/server";

import { LimiteDeRequisicoes, chaveDoVisitante } from "@/core/seguranca/limiteDeRequisicoes";

import { getSiteService } from "@/modules/site/services/server/siteServiceFactory";

import type { CardapioPublico } from "@/modules/site/services/siteService";

// Rota pública (sem login): o cardápio do site e se a casa está aberta. Só leitura,
// só o que pode aparecer (nome, descrição, categoria e preço do canal Site).

// O estado fica em globalThis para sobreviver à recarga do módulo (em desenvolvimento
// o módulo da rota é recarregado e zeraria a contagem).
const global = globalThis as unknown as {
  __beatusLimiteDoCardapio?: LimiteDeRequisicoes;
  __beatusCardapioGuardado?: { ate: number; valor: CardapioPublico } | null;
};

// 60 pedidos por minuto por visitante.
const limite = (global.__beatusLimiteDoCardapio ??= new LimiteDeRequisicoes(60, 60_000));

const SEGUNDOS_EM_MEMORIA = 15;

export async function GET(request: Request) {
  const visitante = limite.permitir(chaveDoVisitante(request.headers));

  if (!visitante.permitido) {
    return NextResponse.json(
      { sucesso: false, mensagem: "Muitos pedidos em pouco tempo. Tente de novo em instantes." },
      { status: 429, headers: { "Retry-After": String(visitante.esperarSegundos) } }
    );
  }

  try {
    // Guarda a resposta por alguns segundos: muita gente pedindo não vira muita consulta ao banco.
    if (!global.__beatusCardapioGuardado || global.__beatusCardapioGuardado.ate < Date.now()) {
      global.__beatusCardapioGuardado = { ate: Date.now() + SEGUNDOS_EM_MEMORIA * 1000, valor: await getSiteService().cardapio() };
    }

    return NextResponse.json({ sucesso: true, ...global.__beatusCardapioGuardado.valor }, { headers: { "Cache-Control": `public, max-age=${SEGUNDOS_EM_MEMORIA}` } });
  } catch (error) {
    console.error("Não foi possível montar o cardápio público:", error);

    // Sem detalhes técnicos para quem está de fora.
    return NextResponse.json({ sucesso: false, mensagem: "O cardápio está indisponível no momento." }, { status: 503 });
  }
}
