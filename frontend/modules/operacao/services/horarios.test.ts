import {
  HORARIO_PADRAO_SEMANAL,
  calendarioDoMes,
  configuracaoPadrao,
  dataValida,
  diaDaSemanaDe,
  domingoDePascoa,
  estadoDaOperacao,
  feriadosNacionais,
  problemaNoHorario,
  resolverHorarioDoDia,
  somarDiasAoTexto,
  type ConfiguracaoDeHorarios,
} from "./horarios";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

function executarTestes(): void {
  // ---------- Datas ----------
  verificar(dataValida("2026-02-28") && !dataValida("2026-02-30") && !dataValida("26-02-28") && !dataValida("2026-13-01"), "validação de datas");
  verificar(diaDaSemanaDe("2026-11-15") === 0, "15/11/2026 é domingo");
  verificar(diaDaSemanaDe("2026-11-16") === 1, "16/11/2026 é segunda");
  verificar(somarDiasAoTexto("2026-12-30", 3) === "2027-01-02", "soma de dias vira o ano");

  // ---------- Padrão da rotina ----------
  const padrao = configuracaoPadrao();

  verificar(HORARIO_PADRAO_SEMANAL.length === 7, "7 dias");
  verificar(!padrao.semanal[1].aberto && !padrao.semanal[2].aberto, "segunda e terça são de produção (fechadas)");
  verificar(padrao.semanal[0].aberto && padrao.semanal[0].fechamento === "22:00", "domingo aberto até 22h");
  verificar(padrao.semanal[3].fechamento === "22:00" && padrao.semanal[4].fechamento === "22:00", "quarta e quinta até 22h");
  verificar(padrao.semanal[5].fechamento === "23:00" && padrao.semanal[6].fechamento === "23:00", "sexta e sábado até 23h");
  verificar(padrao.semanal.slice(0, 1).concat(padrao.semanal.slice(3)).every((dia) => dia.abertura === "18:00"), "todos abrem às 18h");

  // ---------- Resolver o horário de um dia ----------
  const quarta = resolverHorarioDoDia("2026-11-18", padrao);

  verificar(quarta.aberto && quarta.origem === "SEMANAL" && quarta.abertura === "18:00", "quarta no horário normal");

  const segunda = resolverHorarioDoDia("2026-11-16", padrao);

  verificar(!segunda.aberto && segunda.diaDeProducao, "segunda sem exceção é dia de produção");

  const config: ConfiguracaoDeHorarios = {
    semanal: padrao.semanal,
    excecoes: [
      // Feriado numa segunda: o Kacius decidiu abrir
      { id: "a", inicio: "2026-11-16", fim: "2026-11-16", aberto: true, abertura: "17:00", fechamento: "21:00", observacao: "Feriado" },
      // Quinta fechada por período (folga de 3 dias)
      { id: "b", inicio: "2026-11-19", fim: "2026-11-21", aberto: false, observacao: "Folga" },
      // Um dia dentro desse período abre mais cedo: a mais específica vale
      { id: "c", inicio: "2026-11-20", fim: "2026-11-20", aberto: true, abertura: "16:00", fechamento: "23:00" },
    ],
  };

  const aberta = resolverHorarioDoDia("2026-11-16", config);

  verificar(aberta.aberto && aberta.origem === "EXCECAO" && aberta.abertura === "17:00" && !aberta.diaDeProducao, "segunda de feriado aberta por exceção");
  verificar(resolverHorarioDoDia("2026-11-19", config).aberto === false, "quinta dentro da folga está fechada");
  verificar(resolverHorarioDoDia("2026-11-21", config).aberto === false, "sábado dentro da folga está fechado");
  verificar(resolverHorarioDoDia("2026-11-20", config).abertura === "16:00", "a exceção de um dia vence a de período");
  verificar(resolverHorarioDoDia("2026-11-22", config).origem === "SEMANAL", "fora das exceções, volta ao normal");
  verificar(resolverHorarioDoDia("2026-11-19", config).excecao?.observacao === "Folga", "devolve a exceção que valeu");

  // ---------- Verificação do horário ----------
  verificar(problemaNoHorario({ aberto: false }) === null, "fechado não precisa de horas");
  verificar(problemaNoHorario({ aberto: true, abertura: "18:00", fechamento: "22:00" }) === null, "horário bom");
  verificar((problemaNoHorario({ aberto: true, abertura: "25:00", fechamento: "22:00" }) ?? "").includes("abertura"), "hora de abertura inválida");
  verificar((problemaNoHorario({ aberto: true, abertura: "18:00" }) ?? "").includes("fechamento"), "falta o fechamento");
  verificar((problemaNoHorario({ aberto: true, abertura: "22:00", fechamento: "18:00" }) ?? "").includes("antes"), "abertura depois do fechamento");

  // ---------- Páscoa e feriados ----------
  verificar(domingoDePascoa(2026) === "2026-04-05", "Páscoa de 2026");
  verificar(domingoDePascoa(2025) === "2025-04-20", "Páscoa de 2025");
  verificar(domingoDePascoa(2027) === "2027-03-28", "Páscoa de 2027");
  verificar(domingoDePascoa(2024) === "2024-03-31", "Páscoa de 2024");

  const feriados2026 = feriadosNacionais(2026);

  const nomeEm = (data: string) => feriados2026.find((feriado) => feriado.data === data)?.nome;

  verificar(nomeEm("2026-02-16") === "Carnaval (segunda)" && nomeEm("2026-02-17") === "Carnaval (terça)", "Carnaval de 2026");
  verificar(nomeEm("2026-04-03") === "Sexta-feira Santa", "Sexta-feira Santa de 2026");
  verificar(nomeEm("2026-06-04") === "Corpus Christi", "Corpus Christi de 2026");
  verificar(nomeEm("2026-11-20") === "Dia da Consciência Negra" && nomeEm("2026-12-25") === "Natal", "feriados fixos");
  verificar(feriados2026.length === 13, "13 feriados nacionais no ano");
  verificar(feriados2026.every((feriado, i, lista) => i === 0 || lista[i - 1].data <= feriado.data), "feriados em ordem");

  // ---------- Calendário ----------
  const fev = calendarioDoMes(2026, 2, padrao);

  verificar(fev.length === 28, "fevereiro de 2026 tem 28 dias");

  const carnavalSegunda = fev.find((dia) => dia.data === "2026-02-16")!;
  const carnavalTerca = fev.find((dia) => dia.data === "2026-02-17")!;

  verificar(carnavalSegunda.feriado === "Carnaval (segunda)" && carnavalSegunda.feriadoEmDiaDeProducao, "feriado em segunda é marcado como feriado em dia de produção");
  verificar(carnavalTerca.feriadoEmDiaDeProducao, "feriado em terça também");

  const comExcecao = calendarioDoMes(2026, 2, {
    ...padrao,
    excecoes: [{ id: "x", inicio: "2026-02-16", fim: "2026-02-16", aberto: true, abertura: "18:00", fechamento: "22:00" }],
  });

  const aberto = comExcecao.find((dia) => dia.data === "2026-02-16")!;

  verificar(aberto.horario.aberto && !aberto.feriadoEmDiaDeProducao, "depois de decidir abrir, deixa de ser pendência");

  const nov = calendarioDoMes(2026, 11, padrao);

  verificar(nov.length === 30 && nov[0].diaDaSemana === 0, "novembro de 2026 tem 30 dias e começa no domingo");
  verificar(nov.find((dia) => dia.data === "2026-11-20")?.feriadoEmDiaDeProducao === false, "feriado numa sexta (dia de venda) não é pendência");

  // ---------- Estado da operação ----------
  const hora = (h: number, m: number) => new Date(2026, 10, 18, h, m);

  const horario = { aberto: true, abertura: "18:00", fechamento: "22:00" };

  verificar(estadoDaOperacao(horario, true, hora(17, 59)) === "AGUARDANDO_ABERTURA", "antes das 18h aguarda a abertura");
  verificar(estadoDaOperacao(horario, false, hora(18, 0)) === "CHECKLIST", "às 18h sem checklist: checklist");
  verificar(estadoDaOperacao(horario, true, hora(18, 0)) === "OPERANDO", "às 18h com checklist: operando");
  verificar(estadoDaOperacao(horario, true, hora(21, 59)) === "OPERANDO", "às 21:59 ainda operando");
  verificar(estadoDaOperacao(horario, true, hora(22, 0)) === "FECHAMENTO", "às 22h entra em fechamento");
  verificar(estadoDaOperacao({ aberto: false }, true, hora(19, 0)) === "FECHADA", "dia fechado");
  verificar(estadoDaOperacao({ aberto: true }, true, hora(19, 0)) === "FECHADA", "horário mal configurado não libera a operação");
}

executarTestes();

console.log(`✅ Testes dos horários e do calendário passaram (${verificacoes} verificações).`);
