import type { CustoFixoRepositoryPort } from "../repositories/custoFixoRepositoryPort";

import type {
  ConfiguracaoPrecificacao,
  CustoFixo,
  ResumoCustosFixos,
} from "../types/custoFixo";

import {
  custoFixoPorPedido,
  totalMensalVigente,
} from "./calcularCustoFixo";

export interface DadosCustoFixo {
  nome: string;

  valorMensal: number;

  inicioVigencia?: string;

  fimVigencia?: string | null;

  ativo?: boolean;

  observacao?: string;
}

function validar(dados: {
  nome: string;
  valorMensal: number;
  inicioVigencia: string;
  fimVigencia?: string;
}): void {
  if (!dados.nome.trim()) {
    throw new Error("Nome do custo fixo é obrigatório.");
  }

  if (
    !Number.isFinite(dados.valorMensal) ||
    dados.valorMensal < 0
  ) {
    throw new Error(
      "O valor mensal deve ser zero ou maior."
    );
  }

  const inicio = new Date(dados.inicioVigencia).getTime();

  if (Number.isNaN(inicio)) {
    throw new Error("Início da vigência inválido.");
  }

  if (dados.fimVigencia) {
    const fim = new Date(dados.fimVigencia).getTime();

    if (Number.isNaN(fim)) {
      throw new Error("Fim da vigência inválido.");
    }

    if (fim < inicio) {
      throw new Error(
        "O fim da vigência não pode ser antes do início."
      );
    }
  }
}

export class CustoFixoService {
  constructor(
    private readonly repository: CustoFixoRepositoryPort
  ) {}

  async listar(): Promise<CustoFixo[]> {
    return this.repository.listar();
  }

  async criar(dados: DadosCustoFixo): Promise<CustoFixo> {
    const agora = new Date().toISOString();

    const custo: CustoFixo = {
      id: crypto.randomUUID(),
      nome: dados.nome.trim(),
      valorMensal: dados.valorMensal,
      inicioVigencia: dados.inicioVigencia || agora,
      fimVigencia: dados.fimVigencia || undefined,
      ativo: dados.ativo ?? true,
      observacao: dados.observacao?.trim() || undefined,
      criadoEm: agora,
      atualizadoEm: agora,
    };

    validar(custo);

    return this.repository.criar(custo);
  }

  // O custo fixo não é apagado: se sai do orçamento, inativa-se.
  async atualizar(
    id: string,
    dados: DadosCustoFixo
  ): Promise<CustoFixo> {
    const existente = await this.repository.buscarPorId(id);

    if (!existente) {
      throw new Error("Custo fixo não encontrado.");
    }

    const atualizado: CustoFixo = {
      ...existente,
      nome: dados.nome.trim(),
      valorMensal: dados.valorMensal,
      inicioVigencia:
        dados.inicioVigencia || existente.inicioVigencia,
      fimVigencia:
        dados.fimVigencia === undefined
          ? existente.fimVigencia
          : dados.fimVigencia || undefined,
      ativo: dados.ativo ?? existente.ativo,
      observacao:
        dados.observacao === undefined
          ? existente.observacao
          : dados.observacao.trim() || undefined,
      atualizadoEm: new Date().toISOString(),
    };

    validar(atualizado);

    return this.repository.atualizar(atualizado);
  }

  async salvarPedidosMensais(
    pedidosMensaisEstimados: number
  ): Promise<ConfiguracaoPrecificacao> {
    if (
      !Number.isInteger(pedidosMensaisEstimados) ||
      pedidosMensaisEstimados < 0
    ) {
      throw new Error(
        "Os pedidos por mês devem ser um número inteiro, zero ou maior."
      );
    }

    return this.repository.salvarConfiguracao({
      pedidosMensaisEstimados,
    });
  }

  // Total dos custos vigentes e o rateio por pedido (regra 7.6).
  async resumo(
    em: Date = new Date()
  ): Promise<ResumoCustosFixos> {
    const [custos, configuracao] = await Promise.all([
      this.repository.listar(),
      this.repository.buscarConfiguracao(),
    ]);

    const totalMensal = totalMensalVigente(custos, em);

    return {
      totalMensal,
      pedidosMensaisEstimados:
        configuracao.pedidosMensaisEstimados,
      custoPorPedido: custoFixoPorPedido(
        totalMensal,
        configuracao.pedidosMensaisEstimados
      ),
    };
  }
}
