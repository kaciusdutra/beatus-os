import {
  REGRAS_PADRAO,
  categoriaDoCongelado,
  diasDaRegra,
  situacaoDaValidade,
  validadeDoCongelado,
  validadeDoDescongelado,
} from "./calcularValidade";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

function executarTestes(): void {
  // Faixa pela temperatura do freezer
  verificar(categoriaDoCongelado(-20) === "CONGELADO_ABAIXO_18", "-20 °C é abaixo de -18");
  verificar(categoriaDoCongelado(-18) === "CONGELADO_11_A_18", "exatamente -18 °C ainda é a faixa de 30 dias");
  verificar(categoriaDoCongelado(-12) === "CONGELADO_11_A_18", "-12 °C");
  verificar(categoriaDoCongelado(-8) === "CONGELADO_6_A_10", "-8 °C");
  verificar(categoriaDoCongelado(-3) === "CONGELADO_0_A_5", "-3 °C");
  verificar(categoriaDoCongelado(null) === "CONGELADO_11_A_18", "sem temperatura medida usa 30 dias");
  verificar(categoriaDoCongelado(undefined) === "CONGELADO_11_A_18", "temperatura indefinida usa 30 dias");

  // Dias da regra, com as regras do sistema e com o padrão como reserva
  verificar(diasDaRegra(REGRAS_PADRAO, "CONGELADO_ABAIXO_18") === 90, "90 dias abaixo de -18");
  verificar(diasDaRegra(REGRAS_PADRAO, "RESFRIADO_CARNE_MOIDA") === 2, "2 dias para carne moída resfriada");
  verificar(
    diasDaRegra([{ categoria: "CONGELADO_11_A_18", dias: 45 }], "CONGELADO_11_A_18") === 45,
    "o valor editado vale mais que o padrão"
  );
  verificar(diasDaRegra([], "CONGELADO_ABAIXO_18") === 90, "sem regra salva, usa o padrão");

  // Validade do congelado
  const producao = new Date("2026-11-17T10:00:00.000Z");

  const semTemperatura = validadeDoCongelado(producao, REGRAS_PADRAO, null);

  verificar(
    semTemperatura.dias === 30 &&
      semTemperatura.validadeAte.toISOString() === "2026-12-17T10:00:00.000Z",
    "30 dias a partir da produção"
  );

  verificar(
    validadeDoCongelado(producao, REGRAS_PADRAO, -20).dias === 90,
    "90 dias com freezer abaixo de -18"
  );

  // Descongelado: 2 dias do descongelamento, limitado à validade do lote
  const descongelou = new Date("2026-11-19T08:00:00.000Z");

  verificar(
    validadeDoDescongelado(descongelou, 2).toISOString() === "2026-11-21T08:00:00.000Z",
    "2 dias a partir do descongelamento"
  );

  const lotePerto = new Date("2026-11-20T08:00:00.000Z");

  verificar(
    validadeDoDescongelado(descongelou, 2, lotePerto).getTime() === lotePerto.getTime(),
    "não passa da validade do lote congelado"
  );

  // Situação
  const agora = new Date("2026-11-19T12:00:00.000Z");

  verificar(
    situacaoDaValidade(new Date("2026-11-19T11:00:00.000Z"), agora, false) === "VENCIDO",
    "passou da validade"
  );

  verificar(
    situacaoDaValidade(new Date("2026-11-20T06:00:00.000Z"), agora, false) === "VENCE_LOGO",
    "geladeira: menos de 24 horas"
  );

  verificar(
    situacaoDaValidade(new Date("2026-11-21T12:00:00.000Z"), agora, false) === "OK",
    "geladeira: 2 dias de sobra"
  );

  verificar(
    situacaoDaValidade(new Date("2026-11-25T12:00:00.000Z"), agora, true) === "VENCE_LOGO",
    "freezer: menos de 7 dias"
  );

  verificar(
    situacaoDaValidade(new Date("2026-12-25T12:00:00.000Z"), agora, true) === "OK",
    "freezer: muito tempo"
  );

  verificar(situacaoDaValidade(null, agora, true) === "OK", "sem validade não alerta");

  console.log(
    `✅ Testes da validade passaram (${verificacoes} verificações).`
  );
}

try {
  executarTestes();
} catch (error) {
  console.error("❌ Testes da validade falharam:");
  console.error(error);
  process.exitCode = 1;
}
