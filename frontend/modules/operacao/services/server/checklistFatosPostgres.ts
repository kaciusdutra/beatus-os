import "server-only";

import { prisma } from "@/lib/prisma";

import type { EmpresaContext } from "@/core/context/empresaContext";

import { getEstoqueService } from "@/modules/estoque/services/server/estoqueService";

import { getKanbanService } from "@/modules/estoque/services/server/kanbanService";

import { leituraDeTemperatura, type FatosDoDia } from "../checklist";

import type { EstoqueDoDia, FatosDoDiaPort } from "../checklistDoDiaService";

// Os fatos do dia para o checklist: leituras de temperatura (do Registro de
// atividades), cartões vencidos (quadro do estoque) e itens abaixo do mínimo.
export class ChecklistFatosPostgres implements FatosDoDiaPort {
  constructor(private readonly contexto: EmpresaContext) {}

  async carregar(data: string): Promise<FatosDoDia> {
    const inicio = new Date(`${data}T00:00:00`);

    const fim = new Date(inicio);

    fim.setDate(fim.getDate() + 1);

    const [leituras, quadro, saldos] = await Promise.all([
      prisma.registroAtividade.findMany({
        where: {
          empresaId: this.contexto.empresaId,
          entidade: "ESTOQUE",
          acao: "TEMPERATURA",
          criadoEm: { gte: inicio, lt: fim },
        },
        select: { resumo: true, detalhes: true },
      }),
      getKanbanService().quadro(),
      getEstoqueService().listarSaldos(),
    ]);

    let leiturasDoFreezer = 0;

    let leiturasDaGeladeira = 0;

    for (const leitura of leituras) {
      const medidas = leituraDeTemperatura(leitura.resumo, leitura.detalhes);

      if (medidas.freezer) {
        leiturasDoFreezer++;
      }

      if (medidas.geladeira) {
        leiturasDaGeladeira++;
      }
    }

    return {
      leiturasDoFreezer,
      leiturasDaGeladeira,
      cartoesVencidos: quadro.cartoes
        .filter((cartao) => cartao.situacao === "VENCIDO" && cartao.quantidade > 0)
        .map((cartao) => ({ nome: cartao.nome, local: cartao.local })),
      abaixoDoMinimo: saldos
        .filter((saldo) => saldo.abaixoDoMinimo)
        .map((saldo) => ({
          nome: saldo.nome,
          saldo: saldo.saldo,
          minimo: saldo.minimo ?? 0,
          unidade: saldo.unidade,
        })),
    };
  }

  // O estoque do dia, para a abertura: o que falta, o que produzir, o que vence
  // e o que está descongelando.
  async estoqueDoDia(): Promise<EstoqueDoDia> {
    const [quadro, saldos] = await Promise.all([getKanbanService().quadro(), getEstoqueService().listarSaldos()]);

    const comSaldo = quadro.cartoes.filter((cartao) => cartao.quantidade > 0);

    return {
      abaixoDoMinimo: saldos
        .filter((saldo) => saldo.abaixoDoMinimo)
        .map((saldo) => ({ nome: saldo.nome, saldo: saldo.saldo, minimo: saldo.minimo ?? 0, unidade: saldo.unidade })),
      aProduzir: quadro.aProduzir.map((item) => ({
        nome: item.nome,
        saldo: item.saldo,
        minimo: item.minimo,
        unidade: item.unidade,
      })),
      cartoesVencidos: comSaldo
        .filter((cartao) => cartao.situacao === "VENCIDO")
        .map((cartao) => ({ nome: cartao.nome, local: cartao.local, quantidade: cartao.quantidade, unidade: cartao.unidade })),
      cartoesVencendo: comSaldo
        .filter((cartao) => cartao.situacao === "VENCE_LOGO")
        .map((cartao) => ({
          nome: cartao.nome,
          local: cartao.local,
          quantidade: cartao.quantidade,
          unidade: cartao.unidade,
          validadeAte: cartao.validadeAte,
        })),
      descongelando: comSaldo
        .filter((cartao) => cartao.local === "DESCONGELANDO")
        .map((cartao) => ({
          nome: cartao.nome,
          quantidade: cartao.quantidade,
          unidade: cartao.unidade,
          validadeAte: cartao.validadeAte,
        })),
    };
  }
}

export function criarChecklistFatosPostgres(contexto: EmpresaContext): FatosDoDiaPort {
  return new ChecklistFatosPostgres(contexto);
}
