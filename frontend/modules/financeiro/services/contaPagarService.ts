import type { ContaPagarRepositoryPort } from "../repositories/contaPagarRepositoryPort";

import type { FinanceiroRepositoryPort } from "../repositories/financeiroRepositoryPort";

import type {
  CapitalDeGiro,
  ConfiguracaoFinanceira,
  ContaPagar,
  NovoTitulo,
  PagamentoDeTitulo,
  StatusDoTitulo,
} from "../types/contasAPagar";

import { TIPOS_DE_TITULO } from "../types/contasAPagar";

import { FORMAS_DE_LANCAMENTO } from "../types/fluxoDeCaixa";

import {
  calcularCapitalDeGiro,
  mediaDeVendasPorDiaDaSemana,
  somarDias,
  textoDaData,
} from "./calcularCapitalDeGiro";

import type { FinanceiroService } from "./financeiroService";

const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/;

function dataValida(texto: string | undefined): texto is string {
  return !!texto && FORMATO_DATA.test(texto) && !Number.isNaN(new Date(`${texto}T12:00:00`).getTime());
}

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

// Valida os títulos de uma compra a prazo: tipo, vencimento, valores e soma.
// Chamado pela confirmação da compra, antes de qualquer gravação.
export function validarTitulos(titulos: NovoTitulo[], valorTotalDaCompra: number): NovoTitulo[] {
  if (!titulos || titulos.length === 0) {
    throw new Error("Informe ao menos uma parcela com o vencimento.");
  }

  const validados = titulos.map((titulo, indice) => {
    const numero = indice + 1;

    if (!TIPOS_DE_TITULO.includes(titulo.tipo)) {
      throw new Error(`Parcela ${numero}: o tipo deve ser BOLETO, DUPLICATA ou OUTRO.`);
    }

    if (!dataValida(titulo.vencimento)) {
      throw new Error(`Parcela ${numero}: informe o vencimento (AAAA-MM-DD).`);
    }

    if (!Number.isFinite(titulo.valor) || titulo.valor <= 0) {
      throw new Error(`Parcela ${numero}: o valor deve ser maior que zero.`);
    }

    return {
      tipo: titulo.tipo,
      numeroDocumento: titulo.numeroDocumento?.trim() || undefined,
      valor: arredondar(titulo.valor),
      vencimento: titulo.vencimento,
      observacao: titulo.observacao?.trim() || undefined,
    };
  });

  const soma = arredondar(validados.reduce((total, titulo) => total + titulo.valor, 0));

  if (Math.abs(soma - arredondar(valorTotalDaCompra)) > 0.01) {
    throw new Error(
      `A soma das parcelas (R$ ${soma.toFixed(2).replace(".", ",")}) deve ser igual ao total da compra (R$ ${arredondar(valorTotalDaCompra).toFixed(2).replace(".", ",")}).`
    );
  }

  return validados;
}

export class ContaPagarService {
  constructor(
    private readonly repository: ContaPagarRepositoryPort,
    private readonly financeiroRepository: FinanceiroRepositoryPort,
    private readonly financeiro: FinanceiroService,
    // Total mensal dos custos fixos vigentes.
    private readonly totalCustosFixosDoMes: (em: Date) => Promise<number>
  ) {}

  async criarTitulos(
    origem: { entradaCompraId?: string; fornecedorId: string },
    titulos: NovoTitulo[],
    operador?: string | null
  ): Promise<ContaPagar[]> {
    return this.repository.criarTitulos(origem, titulos, operador);
  }

  async listar(status?: StatusDoTitulo): Promise<ContaPagar[]> {
    return this.repository.listar(status ? { status } : {});
  }

  async pagar(
    id: string,
    pagamento: PagamentoDeTitulo,
    operador?: string | null
  ): Promise<ContaPagar> {
    if (!dataValida(pagamento.pagoEm)) {
      throw new Error("Informe a data do pagamento (AAAA-MM-DD).");
    }

    if (!Number.isFinite(pagamento.valorPago) || pagamento.valorPago <= 0) {
      throw new Error("O valor pago deve ser maior que zero.");
    }

    const forma = pagamento.forma?.trim().toUpperCase();

    if (!forma || !FORMAS_DE_LANCAMENTO.includes(forma)) {
      throw new Error("Informe a forma do pagamento: PIX, DINHEIRO ou CARTAO.");
    }

    return this.repository.pagar(
      id,
      { pagoEm: pagamento.pagoEm, valorPago: arredondar(pagamento.valorPago), forma },
      operador
    );
  }

  async cancelar(id: string, motivo: string, operador?: string | null): Promise<void> {
    if (!motivo?.trim()) {
      throw new Error("Informe o motivo do cancelamento.");
    }

    await this.repository.cancelar(id, motivo.trim(), operador);
  }

  async cancelarDaCompra(
    entradaCompraId: string,
    motivo: string,
    operador?: string | null
  ): Promise<{ cancelados: number; pagos: number }> {
    return this.repository.cancelarDaCompra(entradaCompraId, motivo, operador);
  }

  async buscarConfiguracao(): Promise<ConfiguracaoFinanceira> {
    return this.repository.buscarConfiguracao();
  }

  async salvarConfiguracao(
    configuracao: ConfiguracaoFinanceira,
    operador?: string | null
  ): Promise<ConfiguracaoFinanceira> {
    if (!Number.isFinite(configuracao.saldoInicial)) {
      throw new Error("Informe o saldo inicial.");
    }

    if (!dataValida(configuracao.saldoInicialEm)) {
      throw new Error("Informe a data a partir da qual o saldo vale (AAAA-MM-DD).");
    }

    return this.repository.salvarConfiguracao(
      {
        saldoInicial: arredondar(configuracao.saldoInicial),
        saldoInicialEm: configuracao.saldoInicialEm,
      },
      operador
    );
  }

  // Posição, projeção e alertas do capital de giro.
  async capitalDeGiro(): Promise<CapitalDeGiro> {
    const hoje = textoDaData(new Date());

    const configuracao = await this.repository.buscarConfiguracao();

    const custosFixosMensais = await this.totalCustosFixosDoMes(new Date());

    // Vendas dos últimos 28 dias, para a média por dia da semana.
    const inicioVendas = new Date(`${somarDias(hoje, -28)}T00:00:00`);

    const fimVendas = new Date(`${somarDias(hoje, 1)}T00:00:00`);

    const pagamentos = await this.financeiroRepository.listarPagamentosRecebidos(
      inicioVendas,
      fimVendas
    );

    // Saldo de hoje: saldo inicial + o que entrou e saiu desde a data dele.
    let saldoAtual: number | null = null;

    if (configuracao.saldoInicialEm) {
      const fluxo = await this.financeiro.fluxoDeCaixa(configuracao.saldoInicialEm, hoje);

      saldoAtual = arredondar(configuracao.saldoInicial + fluxo.saldo);
    }

    // Todos os títulos: os abertos formam a posição e a projeção; os pagos entram no prazo médio.
    const todos = await this.repository.listar({});

    const giro = calcularCapitalDeGiro({
      hoje,
      saldoAtual,
      titulos: todos,
      vendasMediaPorDiaDaSemana: mediaDeVendasPorDiaDaSemana(pagamentos),
      custosFixosMensais,
    });

    return giro;
  }
}
