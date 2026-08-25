import {
  Cliente,
  EnderecoCliente,
} from "../types/cliente";

import {
  ClienteRepositoryPort,
} from "../repositories/clienteRepositoryPort";

import {
  getClienteRepository,
} from "../repositories/clienteRepository";

export interface CriarClienteInput {
  cliente: Cliente;
}

export interface AtualizarClienteInput {
  cliente: Cliente;
}

export interface AdicionarEnderecoInput {
  clienteId: string;

  endereco: EnderecoCliente;
}

export interface RegistrarCompraInput {
  clienteId: string;

  valorCompra: number;

  dataCompra: string;
}

export class ClienteService {
  constructor(
    private readonly repository: ClienteRepositoryPort
  ) {}

  async buscarPorId(
    clienteId: string
  ): Promise<
    Cliente | undefined
  > {
    return this.repository.buscarPorId(
      clienteId
    );
  }

  async buscarPorTelefone(
    telefone: string
  ): Promise<
    Cliente | undefined
  > {
    return this.repository.buscarPorTelefone(
      telefone
    );
  }

    async buscarPorCpf(
    cpf: string
  ): Promise<
    Cliente | undefined
  > {
    return this.repository.buscarPorCpf(
      cpf
    );
  }

  async listar(): Promise<
    Cliente[]
  > {
    return this.repository.listar();
  }

  async criarCliente(
    input: CriarClienteInput
  ): Promise<Cliente> {
    const existente =
      await this.repository.buscarPorTelefone(
        input.cliente.telefone
      );

    if (existente) {
      throw new Error(
        "Já existe um cliente cadastrado com este telefone."
      );
    }

    return this.repository.criar(
      input.cliente
    );
  }

  async atualizarCliente(
    input: AtualizarClienteInput
  ): Promise<Cliente> {
    const existente =
      await this.repository.buscarPorId(
        input.cliente.id
      );

    if (!existente) {
      throw new Error(
        "Cliente não encontrado."
      );
    }

    return this.repository.atualizar(
      input.cliente
    );
  }

  async adicionarEndereco(
    input: AdicionarEnderecoInput
  ): Promise<Cliente> {
    const cliente =
      await this.repository.buscarPorId(
        input.clienteId
      );

    if (!cliente) {
      throw new Error(
        "Cliente não encontrado."
      );
    }

    const enderecoDuplicado =
      cliente.enderecos.some(
        (endereco) =>
          endereco.cep ===
            input.endereco.cep &&
          endereco.numero ===
            input.endereco.numero &&
          endereco.logradouro
            .trim()
            .toLowerCase() ===
            input.endereco.logradouro
              .trim()
              .toLowerCase()
      );

    if (enderecoDuplicado) {
      throw new Error(
        "Este endereço já está cadastrado para o cliente."
      );
    }

    const atualizado: Cliente = {
      ...cliente,

      enderecos: [
        ...cliente.enderecos,
        input.endereco,
      ],

      atualizadoEm:
        input.endereco.atualizadoEm,
    };

    return this.repository.atualizar(
      atualizado
    );
  }

  async definirEnderecoPrincipal(
    clienteId: string,
    enderecoId: string
  ): Promise<Cliente> {
    const cliente =
      await this.repository.buscarPorId(
        clienteId
      );

    if (!cliente) {
      throw new Error(
        "Cliente não encontrado."
      );
    }

    const enderecoExiste =
      cliente.enderecos.some(
        (endereco) =>
          endereco.id ===
          enderecoId
      );

    if (!enderecoExiste) {
      throw new Error(
        "Endereço não encontrado."
      );
    }

    const agora =
      new Date().toISOString();

    const atualizado: Cliente = {
      ...cliente,

      enderecos:
        cliente.enderecos.map(
          (endereco) => ({
            ...endereco,

            principal:
              endereco.id ===
              enderecoId,

            atualizadoEm:
              agora,
          })
        ),

      atualizadoEm:
        agora,
    };

    return this.repository.atualizar(
      atualizado
    );
  }

  async registrarCompra(
    input: RegistrarCompraInput
  ): Promise<Cliente> {
    const cliente =
      await this.repository.buscarPorId(
        input.clienteId
      );

    if (!cliente) {
      throw new Error(
        "Cliente não encontrado."
      );
    }

    if (
      !Number.isFinite(
        input.valorCompra
      ) ||
      input.valorCompra < 0
    ) {
      throw new Error(
        "Valor da compra inválido."
      );
    }

    const quantidadePedidos =
      cliente.quantidadePedidos +
      1;

    const valorTotalCompras =
      cliente.valorTotalCompras +
      input.valorCompra;

    const ticketMedio =
      quantidadePedidos > 0
        ? valorTotalCompras /
          quantidadePedidos
        : 0;

    const atualizado: Cliente = {
      ...cliente,

      ultimoPedidoEm:
        input.dataCompra,

      quantidadePedidos,

      valorTotalCompras,

      ticketMedio,

      atualizadoEm:
        input.dataCompra,
    };

    return this.repository.atualizar(
      atualizado
    );
  }
}

let service:
  ClienteService | null =
  null;

export function getClienteService(
  repository?: ClienteRepositoryPort
): ClienteService {
  if (!service) {
    service =
      new ClienteService(
        repository ??
          getClienteRepository()
      );
  }

  return service;
}