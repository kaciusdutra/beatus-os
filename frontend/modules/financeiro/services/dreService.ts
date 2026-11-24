import type { DreRepositoryPort } from "../repositories/postgres/dreRepositoryPostgres";

import type { Dre } from "../types/dre";

import { calcularDre } from "./calcularDre";

const FORMATO_MES = /^\d{4}-(0[1-9]|1[0-2])$/;

export class DreService {
  constructor(
    private readonly repository: DreRepositoryPort,
    // Total mensal dos custos fixos vigentes (módulo de custos fixos).
    private readonly totalCustosFixosDoMes: (em: Date) => Promise<number>
  ) {}

  // mes: AAAA-MM
  async doMes(mes: string): Promise<Dre> {
    if (!FORMATO_MES.test(mes)) {
      throw new Error("Informe o mês no formato AAAA-MM.");
    }

    const [ano, numero] = mes.split("-").map(Number);

    const inicio = new Date(ano, numero - 1, 1);

    const fim = new Date(ano, numero, 1);

    const [pedidos, baixas, impostoPercentual, custosFixosDoMes] = await Promise.all([
      this.repository.listarPedidos(inicio, fim),
      this.repository.listarBaixasDeVenda(inicio, fim),
      this.repository.impostoPercentual(),
      this.totalCustosFixosDoMes(inicio),
    ]);

    return calcularDre({ mes, pedidos, baixas, impostoPercentual, custosFixosDoMes });
  }
}
