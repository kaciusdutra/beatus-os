import {
  ProdutoRepositoryPort,
} from "../repositories/produtoRepositoryPort";

import {
  CATEGORIAS_PRODUTO,
  Produto,
} from "../types/produto";

export class ProdutoService {
  constructor(
    private readonly repository: ProdutoRepositoryPort
  ) {}

  async listar(): Promise<Produto[]> {
    return this.repository.listar();
  }

  // O produto nasce com preço 0: o preço de venda é decidido na
  // precificação (regra 6.6) e nunca pela ficha técnica.
  async criar(dados: {
    nome: string;
    descricao?: string;
    categoria: string;
  }): Promise<Produto> {
    const nome = dados.nome?.trim();

    if (!nome) {
      throw new Error(
        "Nome do produto é obrigatório."
      );
    }

    if (
      !CATEGORIAS_PRODUTO.includes(
        dados.categoria as (typeof CATEGORIAS_PRODUTO)[number]
      )
    ) {
      throw new Error(
        "Categoria do produto inválida."
      );
    }

    const existentes = await this.repository.listar();

    if (
      existentes.some(
        (produto) =>
          produto.nome.trim().toLowerCase() ===
          nome.toLowerCase()
      )
    ) {
      throw new Error(
        "Já existe um produto com este nome."
      );
    }

    const agora = new Date().toISOString();

    return this.repository.criar({
      id: crypto.randomUUID(),
      nome,
      descricao: dados.descricao?.trim() ?? "",
      categoria: dados.categoria,
      preco: 0,
      ativo: true,
      criadoEm: agora,
      atualizadoEm: agora,
    });
  }
}
