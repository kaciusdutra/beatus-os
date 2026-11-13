import { conferirDia } from "./conferirDia";

import type { PedidoDoDia } from "../types/conferenciaDoDia";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

const proprio = (canal: string, total: number, pago = total, status = "ENTREGUE"): PedidoDoDia => ({
  canal,
  status,
  total,
  pagamentoAprovado: pago,
});

const ifood = (
  total: number,
  comissao: number,
  extra: Partial<PedidoDoDia> = {}
): PedidoDoDia => ({
  canal: "IFOOD",
  status: "ENTREGUE",
  total,
  pagamentoAprovado: total,
  comissaoEsperada: comissao,
  liquidoEsperado: total - comissao,
  conferenciaStatus: "AGUARDANDO",
  ...extra,
});

function executarTestes(): void {
  const dia = conferirDia("2026-11-18", [
    // Canais próprios: 3 pedidos, tudo pago
    proprio("WHATSAPP", 80),
    proprio("WHATSAPP", 60),
    proprio("PDV", 100),
    proprio("PDV", 999, 999, "CANCELADO"),
    // iFood: um conferido (recebeu 2 a menos), dois aguardando
    ifood(100, 25, { conferenciaStatus: "CONFERIDO", valorRecebido: 73 }),
    ifood(80, 20),
    ifood(40, 10),
    ifood(500, 125, { status: "CANCELADO" }),
  ]);

  const whats = dia.canais.find((c) => c.canal === "WHATSAPP")!;
  const pdv = dia.canais.find((c) => c.canal === "PDV")!;
  const ifoodLinha = dia.canais.find((c) => c.canal === "IFOOD")!;

  verificar(whats.pedidos === 2 && whats.vendido === 140 && whats.entrou === 140 && whats.situacao === "BATE", "WhatsApp: 2 pedidos, 140 vendidos e 140 recebidos, bate");
  verificar(pdv.pedidos === 1 && pdv.cancelados === 1 && pdv.valorCancelado === 999 && pdv.vendido === 100, "PDV: cancelado fica fora das vendas e só é contado");

  verificar(ifoodLinha.tipo === "MARKETPLACE" && ifoodLinha.pedidos === 3 && ifoodLinha.cancelados === 1, "iFood: 3 pedidos válidos e 1 cancelado");
  verificar(ifoodLinha.vendido === 220, "iFood vendeu 100 + 80 + 40");
  verificar(ifoodLinha.entrou === 73, "só entrou o repasse conferido (73)");
  verificar(ifoodLinha.aReceber === 90 && ifoodLinha.pedidosAguardando === 2, "a receber: (80−20) + (40−10) = 90, de 2 pedidos");
  verificar(ifoodLinha.comissao === 55, "comissão esperada de 25 + 20 + 10");
  verificar(ifoodLinha.diferenca === -2 && ifoodLinha.situacao === "AGUARDANDO", "diferença de −2 no conferido, e ainda aguardando 2 pedidos");

  verificar(dia.canais[dia.canais.length - 1].canal === "IFOOD", "marketplaces depois dos canais próprios");

  verificar(dia.totais.pedidos === 6 && dia.totais.cancelados === 2, "6 pedidos válidos, 2 cancelados");
  verificar(dia.totais.vendido === 460, "vendido total: 140 + 100 + 220");
  verificar(dia.totais.entrou === 313, "entrou: 140 + 100 + 73");
  verificar(dia.totais.aReceber === 90 && dia.totais.comissoes === 55 && dia.totais.diferenca === -2, "a receber, comissões e diferença somam");
  // 460 = 313 (entrou) + 90 (a receber) + 55 (comissões) − (−2) (diferença do repasse)
  verificar(dia.fecha, "a conta fecha: vendido = entrou + a receber + comissões − diferença");

  // Canal próprio com pagamento faltando
  const faltando = conferirDia("2026-11-18", [proprio("PDV", 100, 60)]);

  verificar(faltando.canais[0].situacao === "DIFERENCA" && faltando.canais[0].diferenca === -40, "pagamento a menos no canal próprio é diferença de −40");

  // Tudo conferido sem diferença
  const ok = conferirDia("2026-11-18", [ifood(100, 25, { conferenciaStatus: "CONFERIDO", valorRecebido: 75 })]);

  verificar(ok.canais[0].situacao === "CONFERIDO" && ok.fecha, "iFood todo conferido e sem diferença");

  // Dia sem pedidos
  const vazio = conferirDia("2026-11-18", []);

  verificar(vazio.canais.length === 0 && vazio.totais.vendido === 0 && vazio.fecha, "dia sem pedidos");
}

executarTestes();

console.log(`✅ Testes da conferência do dia passaram (${verificacoes} verificações).`);
