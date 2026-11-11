import type {
  ConfiguracaoPrecificacao,
  CustoFixo,
} from "../types/custoFixo";

export interface CustoFixoRepositoryPort {
  listar(): Promise<CustoFixo[]>;

  buscarPorId(id: string): Promise<CustoFixo | undefined>;

  criar(custo: CustoFixo): Promise<CustoFixo>;

  atualizar(custo: CustoFixo): Promise<CustoFixo>;

  buscarConfiguracao(): Promise<ConfiguracaoPrecificacao>;

  salvarConfiguracao(
    configuracao: ConfiguracaoPrecificacao
  ): Promise<ConfiguracaoPrecificacao>;
}
