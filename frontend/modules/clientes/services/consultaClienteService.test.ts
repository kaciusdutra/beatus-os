import { aplicarEdicao } from "./consultaClienteService";

import type { Cliente } from "../types/cliente";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

function recusa(funcao: () => unknown): string {
  try {
    funcao();
  } catch (error) {
    return error instanceof Error ? error.message : "";
  }

  return "";
}

const base = {
  id: "c1",
  nome: "Maria",
  telefone: "92999990000",
  cpf: "12345678901",
  email: "maria@exemplo.com",
  enderecos: [],
  quantidadePedidos: 0,
  valorTotalCompras: 0,
  ticketMedio: 0,
  criadoEm: "2026-11-01T12:00:00.000Z",
  atualizadoEm: "2026-11-01T12:00:00.000Z",
  ativo: true,
} as unknown as Cliente;

function executarTestes(): void {
  const novo = aplicarEdicao(base, { nome: "  Maria Silva ", email: "maria.silva@exemplo.com" });

  verificar(novo.nome === "Maria Silva", "nome é aparado");
  verificar(novo.email === "maria.silva@exemplo.com", "e-mail novo");
  verificar(novo.telefone === base.telefone && novo.cpf === base.cpf, "telefone e CPF não mudam");
  verificar(novo.atualizadoEm !== base.atualizadoEm, "data de atualização muda");

  verificar(aplicarEdicao(base, { email: null }).email === undefined, "e-mail pode ser apagado");
  verificar(aplicarEdicao(base, { dataNascimento: "1990-05-20" }).dataNascimento === "1990-05-20", "data de nascimento válida");
  verificar(aplicarEdicao(base, { ativo: false }).ativo === false, "inativar");
  verificar(aplicarEdicao(base, {}).nome === "Maria", "sem campos, nada muda");

  verificar(recusa(() => aplicarEdicao(base, { nome: " " })).includes("nome"), "nome vazio é recusado");
  verificar(recusa(() => aplicarEdicao(base, { email: "sem-arroba" })).includes("E-mail"), "e-mail inválido é recusado");
  verificar(recusa(() => aplicarEdicao(base, { dataNascimento: "20/05/1990" })).includes("inválida"), "data fora do formato é recusada");
}

executarTestes();

console.log(`✅ Testes da consulta de clientes passaram (${verificacoes} verificações).`);
