import { limparOrigemDaCampanha, origemDaCampanhaDoEndereco, type OrigemDaCampanha } from "@/modules/pedidos/services/origemDaCampanha";

// A campanha de anúncio de onde o visitante veio fica guardada no navegador dele por 30 dias
// e vai junto com o pedido no checkout. Vale o último clique: um anúncio novo substitui o anterior.

export const CHAVE_DA_CAMPANHA = "beatus.site.campanha";

export const VALIDADE_DA_CAMPANHA_MS = 30 * 24 * 60 * 60 * 1000;

export interface Armazenamento {
  getItem(chave: string): string | null;
  setItem(chave: string, valor: string): void;
}

// Se o endereço da página trouxe utm_*, guarda (substituindo a anterior). Sem utm, não mexe.
export function guardarCampanhaDoEndereco(armazenamento: Armazenamento, parametros: URLSearchParams, agora: number): OrigemDaCampanha | undefined {
  const origem = origemDaCampanhaDoEndereco(parametros);

  if (!origem) {
    return undefined;
  }

  try {
    armazenamento.setItem(CHAVE_DA_CAMPANHA, JSON.stringify({ origem, guardadaEm: agora }));
  } catch {
    // sem armazenamento (navegação privada): a campanha vale só se o pedido sair na mesma visita
  }

  return origem;
}

// A campanha guardada, se ainda valer. Texto guardado é refeito pela limpeza (nunca confiado).
export function lerCampanhaGuardada(armazenamento: Armazenamento, agora: number): OrigemDaCampanha | undefined {
  try {
    const bruto = armazenamento.getItem(CHAVE_DA_CAMPANHA);

    if (!bruto) {
      return undefined;
    }

    const dados = JSON.parse(bruto) as { origem?: unknown; guardadaEm?: unknown };

    if (typeof dados.guardadaEm !== "number" || agora - dados.guardadaEm > VALIDADE_DA_CAMPANHA_MS || agora < dados.guardadaEm) {
      return undefined;
    }

    return limparOrigemDaCampanha(dados.origem);
  } catch {
    return undefined;
  }
}
