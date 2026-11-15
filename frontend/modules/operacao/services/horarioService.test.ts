import type { HorarioRepositoryPort } from "../repositories/horarioRepositoryPort";

import { HorarioService } from "./horarioService";

import {
  configuracaoPadrao,
  type ConfiguracaoDeHorarios,
  type ExcecaoDeHorario,
  type HorarioSemanal,
} from "./horarios";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

class RepositorioFalso implements HorarioRepositoryPort {
  configuracao: ConfiguracaoDeHorarios = configuracaoPadrao();

  async carregar() {
    return JSON.parse(JSON.stringify(this.configuracao)) as ConfiguracaoDeHorarios;
  }

  async salvarSemana(semanal: HorarioSemanal) {
    this.configuracao.semanal = semanal;
  }

  async criarExcecao(excecao: Omit<ExcecaoDeHorario, "id">) {
    const criada = { ...excecao, id: `e${this.configuracao.excecoes.length + 1}` };

    this.configuracao.excecoes.push(criada);

    return criada;
  }

  async removerExcecao(id: string) {
    const indice = this.configuracao.excecoes.findIndex((e) => e.id === id);

    if (indice < 0) {
      return null;
    }

    return this.configuracao.excecoes.splice(indice, 1)[0];
  }
}

async function recusa(promessa: Promise<unknown>): Promise<string> {
  try {
    await promessa;
  } catch (erro) {
    return erro instanceof Error ? erro.message : "";
  }

  return "";
}

async function executarTestes(): Promise<void> {
  const repo = new RepositorioFalso();

  const diario: string[] = [];

  const servico = new HorarioService(repo, async (dados) => {
    diario.push(`${dados.acao}: ${dados.resumo}`);
  });

  // ---------- Semana ----------
  const semana = (await servico.obter()).semanal.map((dia) => ({ ...dia }));

  semana[1] = { aberto: true, abertura: "18:00", fechamento: "22:00" }; // abre a segunda

  const salva = await servico.salvarSemana(semana, "Kacius");

  verificar(salva.semanal[1].aberto && salva.semanal[1].fechamento === "22:00", "a mudança da semana é salva");
  verificar(diario.length === 1 && diario[0].startsWith("HORARIOS_ALTERADOS") && diario[0].includes("Segunda-feira: fechado → 18:00–22:00"), "a mudança vai para o diário com o antes e o depois");

  await servico.salvarSemana(salva.semanal, "Kacius");

  verificar(diario.length === 1, "salvar sem mudar nada não registra no diário");

  verificar((await recusa(servico.salvarSemana(semana.slice(0, 6)))).includes("7 dias"), "precisa dos 7 dias");

  const ruim = semana.map((dia) => ({ ...dia }));

  ruim[3] = { aberto: true, abertura: "22:00", fechamento: "18:00" };

  verificar((await recusa(servico.salvarSemana(ruim))).includes("Quarta-feira: A abertura precisa ser antes do fechamento"), "horário ruim aponta o dia");

  const fechaDia = semana.map((dia) => ({ ...dia }));

  fechaDia[0] = { aberto: false, abertura: "18:00", fechamento: "22:00" };

  const guardado = await servico.salvarSemana(fechaDia);

  verificar(guardado.semanal[0].aberto === false && guardado.semanal[0].abertura === undefined, "dia fechado não guarda horas");

  // ---------- Exceções ----------
  const um = await servico.criarExcecao({ inicio: "2026-11-16", fim: "2026-11-16", aberto: true, abertura: "18:00", fechamento: "22:00", observacao: "  Feriado  " }, "Kacius");

  verificar(um.id !== "" && um.observacao === "Feriado", "exceção criada, com a observação aparada");
  verificar(diario[diario.length - 1].includes("16/11/2026: 18:00–22:00 (Feriado)"), "exceção de um dia no diário");

  await servico.criarExcecao({ inicio: "2026-12-24", fim: "2026-12-26", aberto: false });

  verificar(diario[diario.length - 1].includes("24/12/2026 a 26/12/2026: fechado"), "exceção de período no diário");

  verificar((await recusa(servico.criarExcecao({ inicio: "2026-11-30", fim: "2026-11-01", aberto: false }))).includes("antes"), "período invertido");
  verificar((await recusa(servico.criarExcecao({ inicio: "30/11/2026", fim: "30/11/2026", aberto: false }))).includes("AAAA-MM-DD"), "data fora do formato");
  verificar((await recusa(servico.criarExcecao({ inicio: "2026-02-30", fim: "2026-02-30", aberto: false }))).includes("AAAA-MM-DD"), "data que não existe");
  verificar((await recusa(servico.criarExcecao({ inicio: "2026-01-01", fim: "2027-12-31", aberto: false }))).includes("366"), "período longo demais");
  verificar((await recusa(servico.criarExcecao({ inicio: "2026-11-20", fim: "2026-11-20", aberto: true }))).includes("abertura"), "exceção aberta precisa de horas");

  // ---------- Remover ----------
  const antes = repo.configuracao.excecoes.length;

  await servico.removerExcecao(um.id, "Kacius");

  verificar(repo.configuracao.excecoes.length === antes - 1, "exceção removida");
  verificar(diario[diario.length - 1].startsWith("EXCECAO_REMOVIDA") && diario[diario.length - 1].includes("16/11/2026"), "remoção no diário");
  verificar((await recusa(servico.removerExcecao("nao-existe"))).includes("não encontrada"), "remover o que não existe é recusado");
}

executarTestes()
  .then(() => {
    console.log(`✅ Testes do serviço de horários passaram (${verificacoes} verificações).`);
  })
  .catch((erro) => {
    console.error(erro);

    process.exitCode = 1;
  });
