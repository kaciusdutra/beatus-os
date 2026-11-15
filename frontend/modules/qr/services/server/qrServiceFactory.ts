import "server-only";

import { criarContextoDesenvolvimento } from "@/core/context/empresaContext";

import { getEstoqueService } from "@/modules/estoque/services/server/estoqueService";

import { codigoDoLote, getKanbanService } from "@/modules/estoque/services/server/kanbanService";

import { getAjustesService } from "@/modules/operacao/services/server/ajustesServiceFactory";

import { criarConferenciaRepositoryPostgres } from "../../repositories/postgres/conferenciaRepositoryPostgres";

import { QrService } from "../qrService";

export function getQrService(): QrService {
  const estoque = getEstoqueService();

  const kanban = getKanbanService();

  return new QrService(
    {
      saldos: () => estoque.listarSaldos(),
      historico: (itemTipo, id, limite) => estoque.historico(itemTipo, id, limite),
      cartoes: async () => (await kanban.quadro()).cartoes,
      lotesRecentes: async () =>
        (await estoque.listarLotes(200)).map((lote) => ({
          id: lote.id,
          nome: lote.nome,
          codigo: codigoDoLote(new Date(lote.criadoEm), lote.id),
        })),
      ajustesPendentes: () => getAjustesService().pendentes(),
    },
    criarConferenciaRepositoryPostgres(criarContextoDesenvolvimento())
  );
}
