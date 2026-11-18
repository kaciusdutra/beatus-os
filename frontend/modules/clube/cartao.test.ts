import { cartaoVenceu, decidirSelo, estadoDoCartao, primeiroNome, type CartaoParaDecidir, type EntradaDaDecisao } from "./cartao";

import { DIAS_DE_VALIDADE_DA_VANTAGEM, DIAS_PARA_O_CARTAO_REINICIAR, SELOS_PARA_A_VANTAGEM, VALOR_MINIMO_DO_SELO } from "./regras";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

const dia = 24 * 60 * 60 * 1000;

const t0 = new Date("2026-11-18T18:00:00.000Z");

const depois = (dias: number, base = t0) => new Date(base.getTime() + dias * dia);

const cartao = (extras: Partial<CartaoParaDecidir> = {}): CartaoParaDecidir => ({ ativadoEm: t0, ciclo: 1, cicloIniciadoEm: t0, ultimoPedidoEm: null, completoEm: null, selosNoCiclo: 0, ...extras });

const entrada = (extras: Partial<EntradaDaDecisao> = {}): EntradaDaDecisao => ({
  ativo: true,
  canalProprio: true,
  clienteAceita: true,
  cartao: cartao(),
  pedido: { criadoEm: t0, valorDosItens: 60 },
  agora: depois(1),
  ...extras,
});

// Os números da seção 28
verificar(VALOR_MINIMO_DO_SELO === 50 && SELOS_PARA_A_VANTAGEM === 8 && DIAS_PARA_O_CARTAO_REINICIAR === 60 && DIAS_DE_VALIDADE_DA_VANTAGEM === 15, "números da seção 28");

// ---------- Caminho feliz ----------
{
  const d = decidirSelo(entrada());

  verificar(d.creditar && d.selosApos === 1 && d.ciclo === 1 && !d.completa && !d.reiniciar && d.atualizarUltimoPedido, "pedido entregue acima do mínimo dá 1 selo");
}

verificar(decidirSelo(entrada({ pedido: { criadoEm: t0, valorDosItens: 50 } })).creditar, "exatamente R$ 50,00 dá selo");
verificar(decidirSelo(entrada({ pedido: { criadoEm: t0, valorDosItens: 49.9 } })).motivo === "ABAIXO_DO_MINIMO", "R$ 49,90 não dá selo");

// ---------- Quando não dá selo ----------
verificar(decidirSelo(entrada({ ativo: false })).motivo === "CLUBE_DESLIGADO", "clube desligado: nada acontece");
verificar(!decidirSelo(entrada({ ativo: false })).atualizarUltimoPedido, "clube desligado não mexe no cartão");
verificar(decidirSelo(entrada({ canalProprio: false })).motivo === "CANAL_NAO_CONTA", "marketplace não conta");
verificar(decidirSelo(entrada({ cartao: null })).motivo === "SEM_CARTAO", "sem cartão não há selo");
verificar(decidirSelo(entrada({ clienteAceita: false })).motivo === "SEM_ACEITE", "quem tirou o aceite não ganha selo");
verificar(decidirSelo(entrada({ pedido: { criadoEm: new Date(t0.getTime() - 1000), valorDosItens: 90 } })).motivo === "ANTERIOR_AO_ACEITE", "pedido de antes do aceite não conta (nada retroativo)");
verificar(decidirSelo(entrada({ pedido: { criadoEm: t0, valorDosItens: 90 } })).creditar, "o pedido que acionou o cartão conta");

// Abaixo do mínimo mantém o relógio dos 60 dias andando
{
  const d = decidirSelo(entrada({ pedido: { criadoEm: t0, valorDosItens: 20 } }));

  verificar(!d.creditar && d.atualizarUltimoPedido, "pedido abaixo do mínimo não dá selo, mas conta como pedido (os 60 dias)");
}

// ---------- Completar o cartão ----------
{
  const d = decidirSelo(entrada({ cartao: cartao({ selosNoCiclo: SELOS_PARA_A_VANTAGEM - 1 }) }));

  verificar(d.creditar && d.completa && d.selosApos === SELOS_PARA_A_VANTAGEM, "o 8º selo completa o cartão");
}

verificar(!decidirSelo(entrada({ cartao: cartao({ selosNoCiclo: 3 }) })).completa, "o 4º selo não completa");

// Cartão completo: sem acúmulo
{
  const completo = cartao({ selosNoCiclo: 8, completoEm: depois(2), ultimoPedidoEm: depois(2) });

  const d = decidirSelo(entrada({ cartao: completo, agora: depois(5) }));

  verificar(!d.creditar && d.motivo === "AGUARDANDO_RESGATE" && d.atualizarUltimoPedido, "cartão completo não acumula: aguarda o resgate");
}

// Vantagem ganha e vencida (15 dias): cartão reinicia e o pedido já conta no ciclo novo
{
  const completo = cartao({ selosNoCiclo: 8, completoEm: depois(2), ultimoPedidoEm: depois(2) });

  const d = decidirSelo(entrada({ cartao: completo, agora: depois(2 + 15 + 1) }));

  verificar(d.creditar && d.reiniciar && d.ciclo === 2 && d.selosApos === 1, "vantagem vencida: o cartão reinicia e este pedido é o 1º selo do ciclo novo");
}

verificar(!cartaoVenceu(cartao({ selosNoCiclo: 8, completoEm: depois(2) }), depois(2 + 15)), "no último dia a vantagem ainda vale");

// ---------- 60 dias sem pedir ----------
{
  const antigo = cartao({ selosNoCiclo: 5, ultimoPedidoEm: depois(1) });

  const dentro = decidirSelo(entrada({ cartao: antigo, agora: depois(1 + 60) }));

  verificar(dentro.creditar && !dentro.reiniciar && dentro.selosApos === 6, "no 60º dia ainda vale o ciclo");

  const fora = decidirSelo(entrada({ cartao: antigo, agora: depois(1 + 61) }));

  verificar(fora.creditar && fora.reiniciar && fora.ciclo === 2 && fora.selosApos === 1, "passou de 60 dias sem pedir: reinicia e este pedido é o 1º selo");

  const foraAbaixo = decidirSelo(entrada({ cartao: antigo, agora: depois(1 + 61), pedido: { criadoEm: t0, valorDosItens: 20 } }));

  verificar(!foraAbaixo.creditar && foraAbaixo.reiniciar && foraAbaixo.ciclo === 2 && foraAbaixo.selosApos === 0, "reinicia mesmo quando o pedido é abaixo do mínimo");
}

// Sem último pedido, conta do início do ciclo
verificar(cartaoVenceu(cartao({ cicloIniciadoEm: t0, ultimoPedidoEm: null }), depois(61)) && !cartaoVenceu(cartao({ cicloIniciadoEm: t0, ultimoPedidoEm: null }), depois(60)), "sem pedido entregue, os 60 dias contam do início do ciclo");

// ---------- Estado para a página ----------
{
  const andamento = estadoDoCartao(cartao({ selosNoCiclo: 3, ultimoPedidoEm: t0 }), depois(10));

  verificar(andamento.selos === 3 && andamento.faltam === 5 && !andamento.completo && !andamento.venceu && andamento.reiniciaEm?.getTime() === depois(60).getTime(), "cartão em andamento: 3 de 8, faltam 5, reinicia em 60 dias");

  const completo = estadoDoCartao(cartao({ selosNoCiclo: 8, completoEm: depois(2) }), depois(4));

  verificar(completo.completo && completo.faltam === 0 && completo.vantagemValeAte?.getTime() === depois(17).getTime(), "cartão completo: a vantagem vale 15 dias");

  const venceu = estadoDoCartao(cartao({ selosNoCiclo: 6, ultimoPedidoEm: t0 }), depois(100));

  verificar(venceu.venceu && venceu.selos === 0 && venceu.faltam === 8, "cartão vencido aparece zerado");

  const vantagemVencida = estadoDoCartao(cartao({ selosNoCiclo: 8, completoEm: depois(2) }), depois(30));

  verificar(vantagemVencida.venceu && !vantagemVencida.completo, "vantagem vencida: o cartão aparece zerado");
}

// ---------- Nome ----------
verificar(primeiroNome("Gabriel Souza Lima") === "Gabriel" && primeiroNome("  Ana  ") === "Ana" && primeiroNome("") === "", "só o primeiro nome vai ao cartão");

console.log(`✅ Testes do cartão do clube passaram (${verificacoes} verificações).`);
