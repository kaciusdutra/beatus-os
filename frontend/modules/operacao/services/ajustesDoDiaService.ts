import type { AjustesRepositoryPort } from "../repositories/ajustesRepositoryPort";

import {
  ACAO_AJUSTE,
  ACAO_AJUSTE_RESOLVIDO,
  ajustesPendentes,
  consolidarAjustes,
  problemaNoTextoDoAjuste,
  type AjusteDoDia,
} from "./ajustes";

export interface NovoAjuste {
  texto: string;
  itemTipo?: string;
  itemId?: string;
  itemNome?: string;
}

export class AjustesDoDiaService {
  constructor(private readonly repository: AjustesRepositoryPort) {}

  // Tudo o que foi anotado (pendente e resolvido), do mais novo para o mais antigo.
  async listar(): Promise<AjusteDoDia[]> {
    return consolidarAjustes(await this.repository.listarLinhas());
  }

  // O que ainda espera: aparece na abertura do dia seguinte.
  async pendentes(): Promise<AjusteDoDia[]> {
    return ajustesPendentes(await this.listar());
  }

  async criar(dados: NovoAjuste, operador?: string | null): Promise<AjusteDoDia> {
    const problema = problemaNoTextoDoAjuste(dados.texto ?? "");

    if (problema) {
      throw new Error(problema);
    }

    const texto = dados.texto.trim();

    const id = await this.repository.gravar({
      acao: ACAO_AJUSTE,
      resumo: `Ajuste para amanhã${dados.itemNome ? ` (${dados.itemNome})` : ""}: ${texto}`,
      operador,
      detalhes: {
        texto,
        itemTipo: dados.itemTipo,
        itemId: dados.itemId,
        itemNome: dados.itemNome,
      },
    });

    const criado = (await this.listar()).find((ajuste) => ajuste.id === id);

    if (!criado) {
      throw new Error("Não foi possível anotar o ajuste.");
    }

    return criado;
  }

  async resolver(id: string, operador?: string | null): Promise<AjusteDoDia> {
    const ajuste = (await this.listar()).find((item) => item.id === id);

    if (!ajuste) {
      throw new Error("Ajuste não encontrado.");
    }

    if (ajuste.resolvidoEm) {
      throw new Error("Este ajuste já foi resolvido.");
    }

    await this.repository.gravar({
      acao: ACAO_AJUSTE_RESOLVIDO,
      resumo: `Ajuste resolvido: ${ajuste.texto}`,
      referenciaId: id,
      operador,
    });

    const resolvido = (await this.listar()).find((item) => item.id === id);

    return resolvido ?? ajuste;
  }
}
