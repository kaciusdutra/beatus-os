import { JANELA_DA_IMPRESSAO_MS, proximoTicketParaImprimir, type PedidoParaImprimir } from "./impressaoAutomatica";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

const agora = Date.UTC(2026, 10, 15, 18, 0, 0);

const ha = (minutos: number) => new Date(agora - minutos * 60_000).toISOString();

const pedido = (id: string, minutos: number, extras: Partial<PedidoParaImprimir> = {}): PedidoParaImprimir => ({
  id,
  statusOperacional: "NOVO",
  criadoEm: ha(minutos),
  ticketStatus: "PENDENTE",
  ...extras,
});

const nenhum = new Set<string>();

verificar(proximoTicketParaImprimir([], nenhum, agora) === undefined, "fila vazia: nada a imprimir");

verificar(proximoTicketParaImprimir([pedido("a", 1)], nenhum, agora) === "a", "pedido novo com ticket pendente imprime");

verificar(proximoTicketParaImprimir([pedido("a", 1, { ticketStatus: undefined })], nenhum, agora) === "a", "ticket sem situação conta como pendente");

verificar(proximoTicketParaImprimir([pedido("a", 1, { ticketStatus: "IMPRESSO" })], nenhum, agora) === undefined, "já impresso não repete");

verificar(proximoTicketParaImprimir([pedido("a", 1, { ticketStatus: "FALHOU" })], nenhum, agora) === undefined, "ticket que falhou não tenta de novo sozinho (sai pelo link)");

verificar(proximoTicketParaImprimir([pedido("a", 1)], new Set(["a"]), agora) === undefined, "já tentado nesta tela não repete");

verificar(proximoTicketParaImprimir([pedido("a", 1, { statusOperacional: "PRONTO" })], nenhum, agora) === undefined, "pedido pronto não imprime");

verificar(proximoTicketParaImprimir([pedido("a", 1, { statusOperacional: "CANCELADO" })], nenhum, agora) === undefined, "pedido cancelado não imprime");

verificar(proximoTicketParaImprimir([pedido("a", 2, { statusOperacional: "EM_PREPARO" })], nenhum, agora) === "a", "pedido em preparo ainda sem ticket imprime");

// Janela: só pedido recente.
verificar(proximoTicketParaImprimir([pedido("velho", JANELA_DA_IMPRESSAO_MS / 60_000 + 1)], nenhum, agora) === undefined, "ticket parado de antes não sai de uma vez");

verificar(proximoTicketParaImprimir([pedido("limite", JANELA_DA_IMPRESSAO_MS / 60_000)], nenhum, agora) === "limite", "no limite da janela ainda imprime");

// Ordem: o mais antigo primeiro.
verificar(proximoTicketParaImprimir([pedido("b", 1), pedido("a", 5), pedido("c", 3)], nenhum, agora) === "a", "o mais antigo sai primeiro");

verificar(proximoTicketParaImprimir([pedido("b", 1), pedido("a", 5)], new Set(["a"]), agora) === "b", "depois do tentado, vem o seguinte");

// Data estragada ou do futuro não imprime.
verificar(proximoTicketParaImprimir([pedido("x", 0, { criadoEm: "lixo" })], nenhum, agora) === undefined, "data inválida não imprime");

verificar(proximoTicketParaImprimir([pedido("y", -30)], nenhum, agora) === undefined, "data muito no futuro não imprime");

console.log(`✅ Testes da impressão automática passaram (${verificacoes} verificações).`);
