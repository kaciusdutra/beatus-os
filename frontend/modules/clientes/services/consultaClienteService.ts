import type { ClienteConsultaRepositoryPort } from "../repositories/clienteConsultaRepositoryPort";

import type {
  ClienteDetalhe,
  ClienteListado,
  EdicaoDeCliente,
} from "../types/consultaCliente";

import type { Cliente } from "../types/cliente";

import type { ClienteService } from "./clienteService";

const LIMITE_PADRAO = 100;

const LIMITE_MAXIMO = 300;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DATA = /^\d{4}-\d{2}-\d{2}$/;

// Aplica a edição ao cliente carregado. O telefone e o CPF não mudam por aqui.
export function aplicarEdicao(cliente: Cliente, edicao: EdicaoDeCliente): Cliente {
  const atualizado: Cliente = { ...cliente };

  if (edicao.nome !== undefined) {
    const nome = edicao.nome.trim();

    if (nome.length < 2) {
      throw new Error("Informe o nome do cliente.");
    }

    atualizado.nome = nome;
  }

  if (edicao.email !== undefined) {
    const email = edicao.email?.trim() ?? "";

    if (email && !EMAIL.test(email)) {
      throw new Error("E-mail inválido.");
    }

    atualizado.email = email || undefined;
  }

  if (edicao.dataNascimento !== undefined) {
    const data = edicao.dataNascimento?.trim() ?? "";

    if (data && (!DATA.test(data) || Number.isNaN(new Date(`${data}T12:00:00`).getTime()))) {
      throw new Error("Data de nascimento inválida (AAAA-MM-DD).");
    }

    atualizado.dataNascimento = data || undefined;
  }

  if (edicao.ativo !== undefined) {
    atualizado.ativo = edicao.ativo;
  }

  atualizado.atualizadoEm = new Date().toISOString();

  return atualizado;
}

export class ConsultaClienteService {
  constructor(
    private readonly repository: ClienteConsultaRepositoryPort,
    private readonly clienteService: ClienteService,
    // Registro de atividades (quem editou o quê); opcional.
    private readonly registrar?: (dados: {
      acao: string;
      resumo: string;
      referenciaId: string;
      operador?: string | null;
    }) => Promise<void>
  ) {}

  async listar(busca?: string, limite?: number): Promise<ClienteListado[]> {
    const tamanho = Math.min(Math.max(Math.floor(limite ?? LIMITE_PADRAO), 1), LIMITE_MAXIMO);

    return this.repository.listar(busca?.trim() || undefined, tamanho);
  }

  async detalhe(id: string): Promise<ClienteDetalhe> {
    const cliente = await this.repository.buscarDetalhe(id);

    if (!cliente) {
      throw new Error("Cliente não encontrado.");
    }

    return cliente;
  }

  async editar(
    id: string,
    edicao: EdicaoDeCliente,
    operador?: string | null
  ): Promise<ClienteDetalhe> {
    const existente = await this.clienteService.buscarPorId(id);

    if (!existente) {
      throw new Error("Cliente não encontrado.");
    }

    await this.clienteService.atualizarCliente({
      cliente: aplicarEdicao(existente, edicao),
    });

    const detalhe = await this.detalhe(id);

    await this.registrar?.({
      acao: "EDITADO",
      resumo: `Cadastro do cliente ${detalhe.nome} atualizado${detalhe.ativo ? "" : " (inativo)"}.`,
      referenciaId: id,
      operador,
    });

    return detalhe;
  }
}
