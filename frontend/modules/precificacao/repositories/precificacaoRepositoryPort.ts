import type {
  CanalDeVenda,
  CanalPrecificacaoDados,
  ParametrosPrecificacao,
  PrecoDoProduto,
} from "../types/precificacao";

export interface PrecificacaoRepositoryPort {
  buscarParametros(): Promise<ParametrosPrecificacao>;

  // Grava os parâmetros sem mexer na estimativa de pedidos por mês (do 8F).
  salvarParametros(
    parametros: Omit<ParametrosPrecificacao, "pedidosMensaisEstimados">
  ): Promise<void>;

  listarCanais(): Promise<CanalPrecificacaoDados[]>;

  salvarCanal(canal: CanalPrecificacaoDados): Promise<void>;

  listarPrecos(): Promise<PrecoDoProduto[]>;

  salvarPreco(preco: PrecoDoProduto): Promise<void>;

  removerPreco(produtoId: string, canal: CanalDeVenda): Promise<void>;
}
