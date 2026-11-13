import {
  calcularCapitalDeGiro,
  diasEntre,
  mediaDeVendasPorDiaDaSemana,
  situacaoDoTitulo,
  somarDias,
} from "./calcularCapitalDeGiro";

import type { ContaPagar } from "../types/contasAPagar";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

function titulo(id: string, vencimento: string, valor: number, extra: Partial<ContaPagar> = {}): ContaPagar {
  return {
    id,
    fornecedorId: "f1",
    fornecedor: "Fornecedor",
    tipo: "BOLETO",
    parcela: 1,
    totalParcelas: 1,
    valor,
    vencimento,
    status: "ABERTO",
    criadoEm: "2026-11-01T12:00:00.000Z",
    ...extra,
  };
}

function executarTestes(): void {
  // Datas
  verificar(somarDias("2026-11-28", 5) === "2026-12-03", "virada de mês");
  verificar(somarDias("2026-12-30", 3) === "2027-01-02", "virada de ano");
  verificar(diasEntre("2026-11-01", "2026-11-30") === 29, "dias entre datas");

  // Situação
  verificar(situacaoDoTitulo({ status: "ABERTO", vencimento: "2026-11-10" }, "2026-11-13") === "VENCIDO", "vencido");
  verificar(situacaoDoTitulo({ status: "ABERTO", vencimento: "2026-11-13" }, "2026-11-13") === "VENCE_HOJE", "vence hoje");
  verificar(situacaoDoTitulo({ status: "ABERTO", vencimento: "2026-11-20" }, "2026-11-13") === "ABERTO", "a vencer");
  verificar(situacaoDoTitulo({ status: "PAGO", vencimento: "2026-11-10" }, "2026-11-13") === "PAGO", "pago não vence");
  verificar(situacaoDoTitulo({ status: "CANCELADO", vencimento: "2026-11-10" }, "2026-11-13") === "CANCELADO", "cancelado");

  // Média de vendas por dia da semana (4 semanas)
  const media = mediaDeVendasPorDiaDaSemana([
    { data: "2026-11-04T20:00:00", valor: 400 }, // quarta
    { data: "2026-11-11T20:00:00", valor: 400 }, // quarta
    { data: "2026-11-06T20:00:00", valor: 800 }, // sexta
  ]);

  verificar(media[3] === 200, "quarta: 800 em 4 semanas = 200");
  verificar(media[5] === 200, "sexta: 800 em 4 semanas = 200");
  verificar(media[1] === 0, "segunda sem venda");

  // Capital de giro, hoje = quinta 2026-11-12 (getDay 4)
  const titulos = [
    titulo("a", "2026-11-10", 300), // vencido
    titulo("b", "2026-11-12", 100), // vence hoje
    titulo("c", "2026-11-14", 500), // em 2 dias
    titulo("d", "2026-11-25", 700), // em 13 dias
    titulo("e", "2026-12-20", 900), // fora do horizonte de 30 dias
    titulo("f", "2026-11-13", 50, { status: "PAGO" }),
    titulo("g", "2026-11-13", 60, { status: "CANCELADO" }),
  ];

  const giro = calcularCapitalDeGiro({
    hoje: "2026-11-12",
    saldoAtual: 1000,
    titulos,
    vendasMediaPorDiaDaSemana: [0, 0, 0, 200, 200, 300, 300],
    custosFixosMensais: 0,
  });

  verificar(giro.totalEmAberto.quantidade === 5 && giro.totalEmAberto.valor === 2500, "5 títulos em aberto, R$ 2.500");
  verificar(giro.vencidos.quantidade === 1 && giro.vencidos.valor === 300, "1 vencido de 300");
  verificar(giro.venceHoje.valor === 100, "vence hoje 100");
  verificar(giro.ate7Dias.valor === 900, "até 7 dias: vencido 300 + hoje 100 + 500");
  verificar(giro.ate30Dias.valor === 1600, "até 30 dias: 300 + 100 + 500 + 700");
  verificar(giro.projecao.length === 31, "31 dias de projeção (hoje + 30)");
  verificar(giro.projecao[0].saldo === 600, "hoje: 1000 - 300 vencido - 100 de hoje");
  verificar(giro.projecao[1].vendasEsperadas === 300, "sexta 13 vende 300 (média)");
  verificar(giro.alertas.some((a) => a.codigo === "VENCIDO" && a.nivel === "CRITICO"), "alerta de vencido");
  verificar(giro.alertas.some((a) => a.codigo === "VENCE_HOJE"), "alerta vence hoje");
  verificar(giro.alertas.some((a) => a.codigo === "VENCE_EM_3_DIAS"), "alerta próximos 3 dias");
  verificar(giro.prazoMedioDias !== undefined, "tem prazo médio");

  // Caixa negativo
  const apertado = calcularCapitalDeGiro({
    hoje: "2026-11-12",
    saldoAtual: 200,
    titulos: [titulo("x", "2026-11-15", 1000)],
    vendasMediaPorDiaDaSemana: [0, 0, 0, 0, 0, 100, 0],
    custosFixosMensais: 0,
  });

  verificar(apertado.primeiroDiaNegativo?.data === "2026-11-15", "caixa fica negativo no vencimento");
  verificar(apertado.alertas.some((a) => a.codigo === "CAIXA_NEGATIVO" && a.nivel === "CRITICO"), "alerta de caixa negativo");

  // Custos fixos rateados por dia
  const comFixo = calcularCapitalDeGiro({
    hoje: "2026-11-12",
    saldoAtual: 1000,
    titulos: [],
    vendasMediaPorDiaDaSemana: [0, 0, 0, 0, 0, 0, 0],
    custosFixosMensais: 3000,
    horizonteDias: 10,
  });

  verificar(comFixo.projecao[10].saldo === 0, "10 dias × R$ 100 de custo fixo por dia zera R$ 1.000");

  // Sem saldo inicial: sem projeção e com aviso
  const semSaldo = calcularCapitalDeGiro({
    hoje: "2026-11-12",
    saldoAtual: null,
    titulos: [titulo("y", "2026-11-20", 100)],
    vendasMediaPorDiaDaSemana: [0, 0, 0, 0, 0, 0, 0],
    custosFixosMensais: 0,
  });

  verificar(semSaldo.projecao.length === 0, "sem saldo não há projeção");
  verificar(semSaldo.alertas.some((a) => a.codigo === "SEM_SALDO_INICIAL"), "pede o saldo inicial");
  verificar(semSaldo.ate30Dias.valor === 100, "a posição dos títulos funciona sem saldo");
}

executarTestes();

console.log(`✅ Testes do capital de giro passaram (${verificacoes} verificações).`);
