import type { MemoriaDoCliente } from "../types/beatriz";

// Porta da memória da Beatriz. O serviço só conhece esta interface; o Prisma fica na implementação em ./postgres.
// O telefone é o do cadastro (DDD + número, só dígitos).
export interface MemoriaDoClientePort {
  // O que ela sabe de quem fala: o cadastro e os pedidos de quem já é cliente; só as etiquetas, de quem
  // ainda é um contato; nada, de quem é novo.
  carregar(telefone: string): Promise<MemoriaDoCliente>;

  // Grava a mudança de etiquetas (já limpa pelo sistema) e devolve as etiquetas que ficaram.
  gravar(telefone: string, mudanca: { adicionar: string[]; remover: string[] }): Promise<string[]>;
}
