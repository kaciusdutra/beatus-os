import type {
  ChecklistRepositoryPort,
  ExecucaoSalva,
  ItemDoModeloSalvo,
} from "../repositories/checklistRepositoryPort";

import { CHECKLIST_PADRAO, type FatosDoDia, type ItemDoModelo, type TipoDeChecklist } from "./checklist";

import { ChecklistDoDiaService, type EstoqueDoDia } from "./checklistDoDiaService";

import { configuracaoPadrao } from "./horarios";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

class RepositorioFalso implements ChecklistRepositoryPort {
  modelo: Record<TipoDeChecklist, ItemDoModeloSalvo[]> = { ABERTURA: [], FECHAMENTO: [], PRODUCAO: [] };
  execucoes: ExecucaoSalva[] = [];
  contador = 0;
  sementes = 0;

  async listarModelo(tipo: TipoDeChecklist) {
    return this.modelo[tipo].map((item) => ({ ...item }));
  }

  async semearModeloSeVazio(padrao: Record<TipoDeChecklist, ItemDoModelo[]>) {
    if (Object.values(this.modelo).some((lista) => lista.length > 0)) {
      return;
    }

    this.sementes++;

    for (const tipo of Object.keys(padrao) as TipoDeChecklist[]) {
      this.modelo[tipo] = padrao[tipo].map((item) => ({ ...item, id: `m${++this.contador}` }));
    }
  }

  async substituirModelo(tipo: TipoDeChecklist, itens: ItemDoModelo[]) {
    this.modelo[tipo] = itens.map((item) => ({ ...item, id: `m${++this.contador}` }));
  }

  async buscarExecucao(data: string, tipo: TipoDeChecklist) {
    return this.execucoes.find((e) => e.data === data && e.tipo === tipo) ?? null;
  }

  async buscarExecucaoDoItem(itemId: string) {
    return this.execucoes.find((e) => e.itens.some((i) => i.id === itemId)) ?? null;
  }

  async buscarExecucaoPorId(id: string) {
    return this.execucoes.find((e) => e.id === id) ?? null;
  }

  async criarExecucao(data: string, tipo: TipoDeChecklist, itens: ItemDoModelo[]) {
    const execucao: ExecucaoSalva = {
      id: `e${++this.contador}`,
      data,
      tipo,
      itens: itens.map((item, ordem) => ({
        id: `i${++this.contador}`,
        titulo: item.titulo,
        categoria: item.categoria,
        obrigatorio: item.obrigatorio,
        ordem,
        verificacao: item.verificacao,
        feito: false,
      })),
    };

    this.execucoes.push(execucao);

    return execucao;
  }

  async marcarItem(itemId: string, dados: { feito: boolean; observacao?: string; operador?: string | null }) {
    const execucao = this.execucoes.find((e) => e.itens.some((i) => i.id === itemId))!;

    const item = execucao.itens.find((i) => i.id === itemId)!;

    item.feito = dados.feito;
    item.feitoPor = dados.feito ? (dados.operador ?? undefined) : undefined;
    item.observacao = dados.observacao;
  }

  async concluir(execucaoId: string, operador?: string | null) {
    const execucao = this.execucoes.find((e) => e.id === execucaoId)!;

    execucao.concluidoEm = "2026-11-18T21:00:00.000Z";
    execucao.concluidoPor = operador ?? undefined;
  }

  async reabrir(execucaoId: string) {
    const execucao = this.execucoes.find((e) => e.id === execucaoId)!;

    execucao.concluidoEm = undefined;
    execucao.concluidoPor = undefined;
  }

  async listarExecucoesDoDia(data: string) {
    return this.execucoes.filter((e) => e.data === data);
  }
}

const SEM_FATOS: FatosDoDia = { leiturasDoFreezer: 0, leiturasDaGeladeira: 0, cartoesVencidos: [], abaixoDoMinimo: [] };

const ESTOQUE: EstoqueDoDia = { abaixoDoMinimo: [], aProduzir: [], cartoesVencidos: [], cartoesVencendo: [], descongelando: [] };

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

  let fatos: FatosDoDia = { ...SEM_FATOS };

  const diario: string[] = [];

  const servico = new ChecklistDoDiaService(
    repo,
    { carregar: async () => fatos, estoqueDoDia: async () => ESTOQUE },
    { obter: async () => configuracaoPadrao() },
    async (dados) => {
      diario.push(`${dados.acao}: ${dados.resumo}`);
    }
  );

  const quarta = new Date(2026, 10, 18, 17, 0); // quarta 18/11/2026
  const segunda = new Date(2026, 10, 16, 10, 0);
  const sabado = new Date(2026, 10, 21, 17, 0);

  // ---------- Dia de venda ----------
  const dia = await servico.doDia(quarta);

  verificar(dia.data === "2026-11-18" && dia.horario.aberto && dia.horario.fechamento === "22:00", "quarta: dia de venda, fecha às 22h");
  verificar(dia.tipos.map((t) => t.tipo).join() === "ABERTURA,FECHAMENTO", "abertura e fechamento");
  verificar(repo.sementes === 1, "a lista inicial é gravada uma única vez");

  const abertura = dia.tipos[0];

  verificar(abertura.itens.length === CHECKLIST_PADRAO.ABERTURA.length, "o checklist é a cópia da lista");
  verificar(!abertura.concluido && abertura.situacao.obrigatoriosPendentes.length > 0, "começa pendente");

  const freezer = abertura.itens.find((i) => i.verificacao === "TEMPERATURA_FREEZER:1")!;

  verificar(freezer.automatico?.ok === false && !freezer.cumprido, "sem leitura de temperatura, o item automático não passa");

  // Abrir de novo no mesmo dia reaproveita
  const outra = await servico.doDia(quarta);

  verificar(outra.tipos[0].execucaoId === abertura.execucaoId && repo.execucoes.length === 2, "abrir o checklist de novo não duplica");

  // ---------- Concluir exige o obrigatório ----------
  const semConcluir = await recusa(servico.concluir(abertura.execucaoId, "Kacius"));

  verificar(semConcluir.includes("Ainda faltam itens obrigatórios") && semConcluir.includes("Higienizar"), "não conclui com obrigatórios pendentes e diz quais");

  // Fatos ok: os automáticos passam sozinhos
  fatos = { ...SEM_FATOS, leiturasDoFreezer: 1, leiturasDaGeladeira: 1 };

  const comFatos = await servico.doDia(quarta);

  verificar(comFatos.tipos[0].itens.filter((i) => i.verificacao && i.cumprido).length === 4, "temperaturas, cartões e estoque passam sozinhos");

  // Marca os manuais obrigatórios
  for (const item of comFatos.tipos[0].itens.filter((i) => !i.verificacao && i.obrigatorio)) {
    await servico.marcarItem(item.id, true, undefined, "Irmão");
  }

  const depois = await servico.doDia(quarta);

  verificar(depois.tipos[0].situacao.podeConcluir, "com os manuais obrigatórios feitos, pode concluir");
  verificar(depois.tipos[0].itens.find((i) => i.titulo.includes("Higienizar"))?.feitoPor === "Irmão", "guarda quem fez");

  // Item opcional pendente não impede
  verificar(depois.tipos[0].itens.some((i) => !i.obrigatorio && !i.cumprido), "ainda há opcional pendente");

  await servico.concluir(abertura.execucaoId, "Kacius");

  verificar((await servico.doDia(quarta)).tipos[0].concluido, "checklist concluído");
  verificar(diario.some((linha) => linha.startsWith("CHECKLIST_CONCLUIDO") && linha.includes("18/11/2026")), "a conclusão vai para o diário");

  const estado = await servico.estado(quarta);

  verificar(estado.temAbertura && estado.aberturaConcluida && estado.temFechamento && !estado.fechamentoConcluido, "estado: abertura concluída, fechamento não");

  // Concluído não se altera sem reabrir
  const manual = depois.tipos[0].itens.find((i) => !i.verificacao)!;

  verificar((await recusa(servico.marcarItem(manual.id, false, undefined))).includes("Reabra"), "concluído não aceita mudança");
  verificar((await recusa(servico.concluir(abertura.execucaoId))).includes("já foi concluído"), "não conclui duas vezes");

  await servico.reabrir(abertura.execucaoId, "Kacius");

  verificar(!(await servico.estado(quarta)).aberturaConcluida, "reaberto volta a pendente");
  verificar((await recusa(servico.reabrir(abertura.execucaoId))).includes("não está concluído"), "não reabre o que não está concluído");

  // ---------- Item automático com problema ----------
  fatos = { ...SEM_FATOS, leiturasDoFreezer: 1, leiturasDaGeladeira: 1, cartoesVencidos: [{ nome: "Blend" }] };

  const vencido = (await servico.doDia(quarta)).tipos[0].itens.find((i) => i.verificacao === "CARTOES_VENCIDOS")!;

  verificar(vencido.automatico?.ok === false && !vencido.cumprido, "cartão vencido reprova o item automático");

  const semObs = await recusa(servico.marcarItem(vencido.id, true, undefined, "Kacius"));

  verificar(semObs.includes("escreva uma observação"), "marcar à mão um automático com problema exige observação");

  await servico.marcarItem(vencido.id, true, "Vou descartar depois do jantar", "Kacius");

  const assumido = (await servico.doDia(quarta)).tipos[0].itens.find((i) => i.verificacao === "CARTOES_VENCIDOS")!;

  verificar(assumido.cumprido && assumido.observacao === "Vou descartar depois do jantar", "com observação, o item passa");

  // ---------- Fechamento pede a 2ª leitura ----------
  const fechamento = (await servico.doDia(quarta)).tipos[1];

  const segundaLeitura = fechamento.itens.find((i) => i.verificacao === "TEMPERATURA_FREEZER:2")!;

  verificar(segundaLeitura.automatico?.ok === false, "com 1 leitura, a 2ª do fechamento ainda falta");

  fatos = { ...fatos, leiturasDoFreezer: 2 };

  verificar((await servico.doDia(quarta)).tipos[1].itens.find((i) => i.verificacao === "TEMPERATURA_FREEZER:2")?.automatico?.ok === true, "com 2 leituras, passa");

  // ---------- Dia de produção e dia fechado ----------
  const producao = await servico.doDia(segunda);

  verificar(producao.tipos.length === 1 && producao.tipos[0].tipo === "PRODUCAO" && !producao.horario.aberto, "segunda: só o checklist de produção");

  const semTipos = new ChecklistDoDiaService(
    repo,
    { carregar: async () => fatos, estoqueDoDia: async () => ESTOQUE },
    { obter: async () => ({ ...configuracaoPadrao(), semanal: configuracaoPadrao().semanal.map((d, i) => (i === 6 ? { aberto: false } : d)) }) }
  );

  verificar((await semTipos.doDia(sabado)).tipos.length === 0, "dia fechado que não é de produção: sem checklist");

  const estadoSemAbertura = await semTipos.estado(sabado);

  verificar(!estadoSemAbertura.temAbertura && !estadoSemAbertura.aberturaConcluida, "dia sem abertura não tem o que concluir");

  // ---------- Editar a lista ----------
  const novos: ItemDoModelo[] = [
    { titulo: "Conferir o gelo", obrigatorio: true },
    { titulo: "Temperatura do freezer", obrigatorio: true, verificacao: "TEMPERATURA_FREEZER:1" },
  ];

  const salva = await servico.salvarModelo("ABERTURA", novos, "Kacius");

  verificar(salva.length === 2 && salva[0].titulo === "Conferir o gelo", "a lista editada é gravada na ordem");
  verificar(diario[diario.length - 1].startsWith("CHECKLIST_EDITADO") && diario[diario.length - 1].includes("2 item(ns), 2 obrigatório(s)"), "a edição vai para o diário");

  const quinta = new Date(2026, 10, 19, 17, 0);

  verificar((await servico.doDia(quinta)).tipos[0].itens.length === 2, "o próximo dia usa a lista nova");
  verificar((await servico.doDia(quarta)).tipos[0].itens.length === CHECKLIST_PADRAO.ABERTURA.length, "o dia que já existia não muda (histórico)");

  verificar((await recusa(servico.salvarModelo("ABERTURA", [{ titulo: " ", obrigatorio: true }]))).includes("título"), "item sem título é recusado");
  verificar((await recusa(servico.salvarModelo("ABERTURA", [{ titulo: "X", obrigatorio: true, verificacao: "XYZ" }]))).includes("inválida"), "verificação inventada é recusada");
  verificar((await recusa(servico.salvarModelo("OUTRO" as TipoDeChecklist, []))).includes("inválido"), "tipo inválido é recusado");
  verificar((await recusa(servico.salvarModelo("ABERTURA", Array.from({ length: 41 }, () => ({ titulo: "x", obrigatorio: false }))))).includes("40"), "lista grande demais");
}

executarTestes()
  .then(() => {
    console.log(`✅ Testes do checklist do dia passaram (${verificacoes} verificações).`);
  })
  .catch((erro) => {
    console.error(erro);

    process.exitCode = 1;
  });
