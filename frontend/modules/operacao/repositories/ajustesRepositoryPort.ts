import type { LinhaDeAjuste } from "../services/ajustes";

export interface NovaLinhaDeAjuste {
  acao: string;
  resumo: string;
  referenciaId?: string;
  operador?: string | null;
  detalhes?: Record<string, string | undefined>;
}

// Os ajustes moram no Registro de atividades (área Operação).
export interface AjustesRepositoryPort {
  // Só os registros de ajuste (criação e resolução), dos mais novos para os mais antigos.
  listarLinhas(): Promise<LinhaDeAjuste[]>;

  // Acrescenta um registro e devolve o id dele.
  gravar(linha: NovaLinhaDeAjuste): Promise<string>;
}
