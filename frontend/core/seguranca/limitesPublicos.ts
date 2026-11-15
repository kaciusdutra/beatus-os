import { NextResponse } from "next/server";

import { LimiteDeRequisicoes, chaveDoVisitante } from "./limiteDeRequisicoes";

// Um limitador por rota pública. O estado fica em globalThis para sobreviver à recarga
// do módulo (em desenvolvimento o módulo da rota é recarregado e zeraria a contagem).
const global = globalThis as unknown as { __beatusLimitesPublicos?: Map<string, LimiteDeRequisicoes> };

// Devolve a resposta 429 se o visitante passou do limite; senão, nulo (pode seguir).
export function limitarVisitante(nome: string, requisicao: Request, maximo: number, janelaEmMs: number): NextResponse | null {
  const limites = (global.__beatusLimitesPublicos ??= new Map());

  let limite = limites.get(nome);

  if (!limite) {
    limite = new LimiteDeRequisicoes(maximo, janelaEmMs);

    limites.set(nome, limite);
  }

  const resultado = limite.permitir(chaveDoVisitante(requisicao.headers));

  if (resultado.permitido) {
    return null;
  }

  return NextResponse.json(
    { sucesso: false, mensagem: "Muitos pedidos em pouco tempo. Tente de novo em instantes." },
    { status: 429, headers: { "Retry-After": String(resultado.esperarSegundos) } }
  );
}
