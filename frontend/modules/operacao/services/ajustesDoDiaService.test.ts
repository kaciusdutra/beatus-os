import type { AjustesRepositoryPort, NovaLinhaDeAjuste } from "../repositories/ajustesRepositoryPort";

import {
  ACAO_AJUSTE,
  ACAO_AJUSTE_RESOLVIDO,
  ajustesPendentes,
  consolidarAjustes,
  problemaNoTextoDoAjuste,
  type LinhaDeAjuste,
} from "./ajustes";

import { AjustesDoDiaService } from "./ajustesDoDiaService";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

class RepositorioFalso implements AjustesRepositoryPort {
  linhas: LinhaDeAjuste[] = [];
  contador = 0;

  async listarLinhas() {
    return [...this.linhas].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  }

  async gravar(linha: NovaLinhaDeAjuste) {
    this.contador++;

    const id = `reg-${this.contador}`;

    this.linhas.push({
      id,
      acao: linha.acao,
      referenciaId: linha.referenciaId,
      operador: linha.operador ?? undefined,
      criadoEm: `2026-11-15T10:00:${String(this.contador).padStart(2, "0")}.000Z`,
      detalhes: linha.detalhes,
    });

    return id;
  }
}

async function executarTestes(): Promise<void> {
  // ---------- Texto ----------
  verificar(problemaNoTextoDoAjuste("   ") !== null, "texto vazio");
  verificar(problemaNoTextoDoAjuste("x".repeat(201)) !== null, "texto longo");
  verificar(problemaNoTextoDoAjuste("Descongelar o blend na sexta") === null, "texto bom");

  // ---------- Consolidar ----------
  const linhas: LinhaDeAjuste[] = [
    { id: "a", acao: ACAO_AJUSTE, criadoEm: "2026-11-14T22:00:00.000Z", operador: "Kacius", detalhes: { texto: "Repor pão", itemNome: "Pão" } },
    { id: "b", acao: ACAO_AJUSTE, criadoEm: "2026-11-15T22:00:00.000Z", detalhes: { texto: "Produzir cheddar" } },
    { id: "r1", acao: ACAO_AJUSTE_RESOLVIDO, referenciaId: "a", criadoEm: "2026-11-15T18:00:00.000Z", operador: "Irmão" },
    { id: "r2", acao: ACAO_AJUSTE_RESOLVIDO, referenciaId: "a", criadoEm: "2026-11-15T19:00:00.000Z", operador: "Outro" },
    { id: "x", acao: "OUTRA_COISA", criadoEm: "2026-11-15T20:00:00.000Z" },
  ];

  const todos = consolidarAjustes(linhas);

  verificar(todos.length === 2, "só os ajustes entram");
  verificar(todos[0].id === "b", "mais novo primeiro");
  verificar(todos[1].resolvidoPor === "Irmão", "vale a primeira resolução");
  verificar(todos[1].itemNome === "Pão", "item do ajuste");
  verificar(ajustesPendentes(todos).length === 1 && ajustesPendentes(todos)[0].id === "b", "só o pendente");
  verificar(consolidarAjustes([{ id: "z", acao: ACAO_AJUSTE, criadoEm: "2026-11-15T10:00:00.000Z" }])[0].texto === "(sem texto)", "registro sem texto não quebra");

  // ---------- Serviço ----------
  const repo = new RepositorioFalso();

  const servico = new AjustesDoDiaService(repo);

  let recusou = false;

  try {
    await servico.criar({ texto: " " }, "Kacius");
  } catch {
    recusou = true;
  }

  verificar(recusou && repo.linhas.length === 0, "texto vazio não grava");

  const criado = await servico.criar({ texto: "  Pesar a sobra do blend  ", itemTipo: "PREPARACAO", itemId: "abc", itemNome: "Blend" }, "Kacius");

  verificar(criado.texto === "Pesar a sobra do blend", "texto aparado");
  verificar(criado.criadoPor === "Kacius" && !criado.resolvidoEm, "quem criou e pendente");
  verificar(repo.linhas[0].acao === ACAO_AJUSTE, "gravou no diário");
  verificar((await servico.pendentes()).length === 1, "um pendente");

  const resolvido = await servico.resolver(criado.id, "Irmão");

  verificar(resolvido.resolvidoPor === "Irmão", "resolvido por");
  verificar((await servico.pendentes()).length === 0, "nenhum pendente");
  verificar((await servico.listar()).length === 1, "continua no histórico");

  let jaResolvido = false;

  try {
    await servico.resolver(criado.id, "Irmão");
  } catch {
    jaResolvido = true;
  }

  verificar(jaResolvido, "não resolve duas vezes");

  let inexistente = false;

  try {
    await servico.resolver("nao-existe", null);
  } catch {
    inexistente = true;
  }

  verificar(inexistente, "ajuste inexistente");
}

void executarTestes().then(() => {
  console.log(`✅ Testes dos ajustes para amanhã passaram (${verificacoes} verificações).`);
});
