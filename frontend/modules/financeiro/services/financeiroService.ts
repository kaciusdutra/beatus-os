import type { FinanceiroRepositoryPort } from "../repositories/financeiroRepositoryPort";

import type {
  FluxoDeCaixa,
  LancamentoManual,
  NovoLancamento,
} from "../types/fluxoDeCaixa";

import { FORMAS_DE_LANCAMENTO } from "../types/fluxoDeCaixa";

import type { ConferenciaDoDia } from "../types/conferenciaDoDia";

import { calcularFluxoDeCaixa, ehMesInteiro } from "./calcularFluxoDeCaixa";

import { conferirDia } from "./conferirDia";

const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/;

function dataValida(texto: string): boolean {
  return FORMATO_DATA.test(texto) && !Number.isNaN(new Date(`${texto}T00:00:00`).getTime());
}

export class FinanceiroService {
  constructor(
    private readonly repository: FinanceiroRepositoryPort,
    // Total mensal dos custos fixos vigentes (vem do módulo de custos fixos).
    private readonly totalCustosFixosDoMes: (em: Date) => Promise<number>
  ) {}

  // de e ate: AAAA-MM-DD, os dois dias inclusos.
  async fluxoDeCaixa(de: string, ate: string): Promise<FluxoDeCaixa> {
    if (!dataValida(de) || !dataValida(ate)) {
      throw new Error("Informe o período com datas válidas (AAAA-MM-DD).");
    }

    if (ate < de) {
      throw new Error("A data final não pode ser antes da inicial.");
    }

    const inicio = new Date(`${de}T00:00:00`);

    const fim = new Date(`${ate}T00:00:00`);

    fim.setDate(fim.getDate() + 1);

    const [pagamentos, repasses, compras, titulosPagos, lancamentos] = await Promise.all([
      this.repository.listarPagamentosRecebidos(inicio, fim),
      this.repository.listarRepassesRecebidos(inicio, fim),
      this.repository.listarComprasPagas(inicio, fim),
      this.repository.listarTitulosPagos(inicio, fim),
      this.repository.listarLancamentos(inicio, fim),
    ]);

    const custosFixosPrevistos = ehMesInteiro(de, ate)
      ? await this.totalCustosFixosDoMes(inicio)
      : undefined;

    return calcularFluxoDeCaixa({
      de,
      ate,
      pagamentos,
      repasses,
      compras,
      titulosPagos,
      lancamentos,
      custosFixosPrevistos,
    });
  }

  // Conferência de um dia (AAAA-MM-DD) por canal: vendido, o que entrou, o que
  // falta receber dos marketplaces e a diferença.
  async conferenciaDoDia(data: string): Promise<ConferenciaDoDia> {
    if (!dataValida(data)) {
      throw new Error("Informe o dia com data válida (AAAA-MM-DD).");
    }

    const inicio = new Date(`${data}T00:00:00`);

    const fim = new Date(inicio);

    fim.setDate(fim.getDate() + 1);

    return conferirDia(data, await this.repository.listarPedidosDoDia(inicio, fim));
  }

  // Lançamentos avulsos do período, inclusive os cancelados (para a tela mostrar o histórico).
  async listarLancamentos(de: string, ate: string): Promise<LancamentoManual[]> {
    if (!dataValida(de) || !dataValida(ate)) {
      throw new Error("Informe o período com datas válidas (AAAA-MM-DD).");
    }

    const fim = new Date(`${ate}T00:00:00`);

    fim.setDate(fim.getDate() + 1);

    return this.repository.listarLancamentos(new Date(`${de}T00:00:00`), fim);
  }

  async criarLancamento(
    dados: NovoLancamento,
    operador?: string | null
  ): Promise<LancamentoManual> {
    if (dados.tipo !== "ENTRADA" && dados.tipo !== "SAIDA") {
      throw new Error("O tipo deve ser ENTRADA ou SAIDA.");
    }

    const categoria = dados.categoria?.trim();

    const descricao = dados.descricao?.trim();

    if (!categoria) {
      throw new Error("Informe a categoria.");
    }

    if (!descricao) {
      throw new Error("Informe a descrição.");
    }

    if (!Number.isFinite(dados.valor) || dados.valor <= 0) {
      throw new Error("O valor deve ser maior que zero.");
    }

    if (!dataValida(dados.data)) {
      throw new Error("Informe a data (AAAA-MM-DD).");
    }

    const forma = dados.forma?.trim().toUpperCase();

    if (forma && !FORMAS_DE_LANCAMENTO.includes(forma)) {
      throw new Error("Forma inválida. Use PIX, DINHEIRO ou CARTAO.");
    }

    return this.repository.criarLancamento(
      {
        tipo: dados.tipo,
        categoria,
        descricao,
        valor: Math.round(dados.valor * 100) / 100,
        // O lançamento vale ao meio-dia do dia informado, para não virar o dia por fuso.
        data: new Date(`${dados.data}T12:00:00`).toISOString(),
        forma: forma || undefined,
        observacao: dados.observacao?.trim() || undefined,
      },
      operador
    );
  }

  async cancelarLancamento(
    id: string,
    motivo: string,
    operador?: string | null
  ): Promise<void> {
    if (!motivo?.trim()) {
      throw new Error("Informe o motivo do cancelamento.");
    }

    await this.repository.cancelarLancamento(id, motivo.trim(), operador);
  }
}
