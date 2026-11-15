import type { ConferenciaRepositoryPort } from "../repositories/conferenciaRepositoryPort";

import type { CartaoDoQuadro, SaldoDeEstoque } from "@/modules/estoque/types/estoque";

import type { AjusteDoDia } from "@/modules/operacao/services/ajustes";

import type { ConferenciaDoItem } from "../types/qr";

import { QrService, type FontesDoQr } from "./qrService";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

async function recusa(promessa: Promise<unknown>): Promise<string> {
  try {
    await promessa;
  } catch (error) {
    return error instanceof Error ? error.message : "erro";
  }

  return "";
}

const AGORA = new Date(2026, 10, 15, 18, 30);

const PAO: SaldoDeEstoque = { itemTipo: "INSUMO", id: "insumo-pao-0001", nome: "Pão", unidade: "un", saldo: 12, minimo: 20, abaixoDoMinimo: true };

const CARTAO = (producaoLoteId: string, local: CartaoDoQuadro["local"], quantidade: number): CartaoDoQuadro => ({
  chave: `${producaoLoteId}|${local}`,
  fichaTecnicaId: "ficha-cheddar",
  nome: "Cheddar",
  unidade: "g",
  producaoLoteId,
  loteCodigo: "L261115-AB12",
  local,
  quantidade,
  situacao: "OK",
});

const AJUSTE = (itemId: string | undefined): AjusteDoDia => ({ id: `aj-${itemId ?? "geral"}`, texto: "Repor", itemId, criadoEm: "2026-11-14T22:00:00.000Z" });

class ConferenciasFalsas implements ConferenciaRepositoryPort {
  linhas: ConferenciaDoItem[] = [];

  async registrar(dados: { itemTipo: string; itemId: string; nome: string; operador?: string | null }) {
    this.linhas.unshift({ itemTipo: dados.itemTipo, itemId: dados.itemId, nome: dados.nome, em: AGORA.toISOString(), por: dados.operador ?? undefined });
  }

  async desde(inicio: Date) {
    return this.linhas.filter((linha) => new Date(linha.em) >= inicio);
  }
}

const fontes: FontesDoQr = {
  saldos: async () => [PAO],
  historico: async () => [],
  cartoes: async () => [CARTAO("lote-cheddar-1", "FREEZER", 500), CARTAO("lote-cheddar-1", "COZINHA", 200), CARTAO("lote-outro-9999", "GELADEIRA", 80)],
  lotesRecentes: async () => [{ id: "lote-sem-saldo-1", nome: "Maionese", codigo: "L261110-ZZ99" }],
  ajustesPendentes: async () => [AJUSTE("insumo-pao-0001"), AJUSTE("lote-cheddar-1"), AJUSTE(undefined)],
};

async function executarTestes(): Promise<void> {
  const conferencias = new ConferenciasFalsas();

  const servico = new QrService(fontes, conferencias, () => AGORA);

  // ---------- Insumo ----------
  const ficha = await servico.fichaDoInsumo("insumo-pao-0001");

  verificar(ficha.item.nome === "Pão" && ficha.item.abaixoDoMinimo, "ficha do insumo");
  verificar(ficha.ajustes.length === 1 && ficha.ajustes[0].itemId === "insumo-pao-0001", "só os ajustes do item");
  verificar(ficha.conferidoHoje === undefined, "ainda não conferido");
  verificar((await recusa(servico.fichaDoInsumo("nao-existe"))).includes("não encontrado"), "insumo inexistente");

  // ---------- Lote ----------
  const lote = await servico.fichaDoLote("lote-cheddar-1");

  verificar(lote.cartoes.length === 2, "só os cartões do lote");
  verificar(lote.nome === "Cheddar" && lote.loteCodigo === "L261115-AB12", "nome e código do lote");
  verificar(lote.ajustes.length === 1, "ajuste do lote");

  const semSaldo = await servico.fichaDoLote("lote-sem-saldo-1");

  verificar(semSaldo.cartoes.length === 0 && semSaldo.nome === "Maionese", "lote sem saldo ainda abre");
  verificar((await recusa(servico.fichaDoLote("lote-fantasma"))).includes("não encontrado"), "lote inexistente");

  // ---------- Conferência ----------
  const feita = await servico.conferir({ itemTipo: "INSUMO", itemId: "insumo-pao-0001" }, "Kacius");

  verificar(feita.nome === "Pão" && feita.por === "Kacius", "conferência grava o nome e quem");
  verificar((await servico.fichaDoInsumo("insumo-pao-0001")).conferidoHoje?.por === "Kacius", "ficha mostra conferido hoje");

  await servico.conferir({ itemTipo: "LOTE", itemId: "lote-cheddar-1" }, "Irmão");
  await servico.conferir({ itemTipo: "INSUMO", itemId: "insumo-pao-0001" }, "Irmão");

  const hoje = await servico.conferidosHoje();

  verificar(hoje.length === 2, "um por item, o mais recente");
  verificar(hoje.find((item) => item.itemId === "insumo-pao-0001")?.por === "Irmão", "vale a conferência mais nova");
  verificar((await recusa(servico.conferir({ itemTipo: "INSUMO", itemId: "nao-existe" }, null))).includes("não encontrado"), "não confere o que não existe");

  // Conferência de ontem não conta hoje.
  conferencias.linhas.push({ itemTipo: "INSUMO", itemId: "ontem", nome: "Velho", em: new Date(2026, 10, 14, 20, 0).toISOString() });

  verificar(!(await servico.conferidosHoje()).some((item) => item.itemId === "ontem"), "conferência de ontem fica de fora");
}

void executarTestes().then(() => {
  console.log(`✅ Testes do serviço do QR passaram (${verificacoes} verificações).`);
});
