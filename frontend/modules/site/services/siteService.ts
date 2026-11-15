import type { ConfiguracaoDeHorarios } from "@/modules/operacao/services/horarios";

import { agoraNoFusoDoSite, calcularFuncionamento, resumoDaSemana, type Funcionamento, type LinhaDaSemana } from "./funcionamento";

import { montarCardapio, type CategoriaDoCardapio, type PrecoDaBase, type ProdutoDaBase } from "./montarCardapio";

// De onde o site tira os dados; a fábrica liga ao banco.
export interface FontesDoSite {
  produtos(): Promise<ProdutoDaBase[]>;
  precos(): Promise<PrecoDaBase[]>;
  horarios(): Promise<ConfiguracaoDeHorarios>;
}

// Tudo o que o site mostra, e nada além disso.
export interface CardapioPublico {
  categorias: CategoriaDoCardapio[];
  funcionamento: Funcionamento;
  semana: LinhaDaSemana[];
}

export class SiteService {
  constructor(
    private readonly fontes: FontesDoSite,
    private readonly agora: () => Date = () => new Date()
  ) {}

  async cardapio(): Promise<CardapioPublico> {
    const [produtos, precos, horarios] = await Promise.all([this.fontes.produtos(), this.fontes.precos(), this.fontes.horarios()]);

    return {
      categorias: montarCardapio(produtos, precos),
      funcionamento: calcularFuncionamento(horarios, agoraNoFusoDoSite(this.agora())),
      semana: resumoDaSemana(horarios),
    };
  }
}
