import { resumirConferencia } from "./resumirConferencia";

import type { PedidoDoMarketplace } from "../types/conferenciaMarketplace";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

function pedido(
  numero: string,
  esperado: number,
  extra: Partial<PedidoDoMarketplace> = {}
): PedidoDoMarketplace {
  return {
    id: numero,
    numero,
    canal: "IFOOD",
    codigoExterno: `C${numero}`,
    criadoEm: "2026-11-13T20:00:00.000Z",
    total: esperado + 10,
    comissaoEsperada: 10,
    liquidoEsperado: esperado,
    status: "AGUARDANDO",
    cancelado: false,
    ...extra,
  };
}

function executarTestes(): void {
  const resumo = resumirConferencia([
    pedido("1", 90),
    pedido("2", 40),
    pedido("3", 100, { status: "CONFERIDO", valorRecebido: 95, diferenca: -5 }),
    pedido("4", 50, { status: "CONFERIDO", valorRecebido: 50, diferenca: 0 }),
    pedido("5", 70, { cancelado: true }),
  ]);

  verificar(resumo.aguardando.quantidade === 2, "2 aguardando (o cancelado não conta)");
  verificar(resumo.aguardando.esperado === 130, "esperado de 90 + 40");
  verificar(resumo.conferidos.quantidade === 2, "2 conferidos");
  verificar(resumo.conferidos.esperado === 150, "esperado conferido de 100 + 50");
  verificar(resumo.conferidos.recebido === 145, "recebido de 95 + 50");
  verificar(resumo.conferidos.diferenca === -5, "diferença acumulada de -5");

  const vazio = resumirConferencia([]);

  verificar(vazio.aguardando.quantidade === 0 && vazio.conferidos.recebido === 0, "lista vazia zera tudo");
}

executarTestes();

console.log(`✅ Testes da conferência dos marketplaces passaram (${verificacoes} verificações).`);
