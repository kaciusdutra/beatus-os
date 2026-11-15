import { possuiPermissao } from "./permissionMatrix";

import type { UserRole } from "./permissionTypes";

// Quem não tem acesso ao financeiro (a cozinha, por exemplo) lê fichas, insumos
// e estoque, mas nunca recebe custo, preço, valor ou margem: o servidor tira
// esses campos da resposta antes de enviar.

const CAMPO_DE_CUSTO = /^(custo|preco|valor|margem|markup|cmv|lucro)/i;

export function podeVerCustos(papel: UserRole | undefined): boolean {
  return papel !== undefined && possuiPermissao(papel, "financeiro.visualizar");
}

export function removerCustos<T>(valor: T): T {
  if (Array.isArray(valor)) {
    return valor.map((item) => removerCustos(item)) as T;
  }

  if (valor !== null && typeof valor === "object" && !(valor instanceof Date)) {
    const limpo: Record<string, unknown> = {};

    for (const [chave, conteudo] of Object.entries(valor as Record<string, unknown>)) {
      if (!CAMPO_DE_CUSTO.test(chave)) {
        limpo[chave] = removerCustos(conteudo);
      }
    }

    return limpo as T;
  }

  return valor;
}

// Devolve os dados como estão para quem vê custos; sem custos para os demais.
export function paraOPapel<T>(papel: UserRole | undefined, dados: T): T {
  return podeVerCustos(papel) ? dados : removerCustos(dados);
}
