import {
  Prisma,
} from "@/lib/generated/prisma/client";

import {
  prisma,
} from "@/lib/prisma";

import {
  EmpresaContext,
} from "@/core/context/empresaContext";

import {
  ClienteRepositoryPort,
} from "../clienteRepositoryPort";

import {
  Cliente,
  EnderecoCliente,
} from "../../types/cliente";

function normalizarTelefone(
  telefone: string
): string {
  return telefone.replace(
    /\D/g,
    ""
  );
}

function normalizarCpf(
  cpf: string
): string {
  return cpf.replace(
    /\D/g,
    ""
  );
}

function mapearEndereco(
  endereco: Prisma.EnderecoGetPayload<{}>,
): EnderecoCliente {
  return {
    id:
      endereco.id,

    rotulo:
      endereco.rotulo as EnderecoCliente["rotulo"],

    principal:
      endereco.principal,

    cep:
      endereco.cep ??
      undefined,

    logradouro:
      endereco.logradouro,

    numero:
      endereco.numero,

    complemento:
      endereco.complemento ??
      undefined,

    bairro:
      endereco.bairro,

    cidade:
      endereco.cidade,

    estado:
      endereco.estado,

    latitude:
      endereco.latitude !== null
        ? Number(
            endereco.latitude
          )
        : undefined,

    longitude:
      endereco.longitude !==
      null
        ? Number(
            endereco.longitude
          )
        : undefined,

    criadoEm:
      endereco.criadoEm.toISOString(),

    atualizadoEm:
      endereco.atualizadoEm.toISOString(),
  };
}

function mapearCliente(
  cliente: Prisma.ClienteGetPayload<{
    include: {
      enderecos: true;
    };
  }>,
): Cliente {
  return {
    id:
      cliente.id,

    nome:
      cliente.nome,

    telefone:
      cliente.telefone,

    cpf:
      cliente.cpf,

    email:
      cliente.email ??
      undefined,

    dataNascimento:
      cliente.dataNascimento
        ?.toISOString(),

    origemPrimeiroPedido:
      cliente.origemPrimeiroPedido as Cliente["origemPrimeiroPedido"],

    enderecos:
      cliente.enderecos.map(
        mapearEndereco
      ),

    ultimoPedidoEm:
      cliente.ultimoPedidoEm
        ?.toISOString(),

    quantidadePedidos:
      cliente.quantidadePedidos,

    valorTotalCompras:
      Number(
        cliente.valorTotalCompras
      ),

    ticketMedio:
      Number(
        cliente.ticketMedio
      ),

    criadoEm:
      cliente.criadoEm.toISOString(),

    atualizadoEm:
      cliente.atualizadoEm.toISOString(),

    ativo:
      cliente.ativo,
  };
}

export class ClienteRepositoryPostgres
  implements ClienteRepositoryPort
{
  constructor(
    private readonly contexto:
      EmpresaContext,
  ) {}

  async criar(
    cliente: Cliente,
  ): Promise<Cliente> {
    const telefone =
      normalizarTelefone(
        cliente.telefone
      );

    const cpf =
      normalizarCpf(
        cliente.cpf
      );

    const existente =
      await prisma.cliente.findUnique({
        where: {
          empresaId_telefone: {
            empresaId:
              this.contexto.empresaId,

            telefone,
          },
        },
      });

    if (existente) {
      throw new Error(
        "Já existe um cliente cadastrado com este telefone."
      );
    }

    const criado =
      await prisma.cliente.create({
        data: {
          id:
            cliente.id,

          empresaId:
            this.contexto.empresaId,

          nome:
            cliente.nome,

          telefone,

          cpf,

          email:
            cliente.email ??
            null,

          dataNascimento:
            cliente.dataNascimento
              ? new Date(
                  cliente.dataNascimento
                )
              : null,

          origemPrimeiroPedido:
            cliente.origemPrimeiroPedido ??
            null,

          ultimoPedidoEm:
            cliente.ultimoPedidoEm
              ? new Date(
                  cliente.ultimoPedidoEm
                )
              : null,

          quantidadePedidos:
            cliente.quantidadePedidos,

          valorTotalCompras:
            cliente.valorTotalCompras,

          ticketMedio:
            cliente.ticketMedio,

          ativo:
            cliente.ativo,

          criadoEm:
            new Date(
              cliente.criadoEm
            ),

          atualizadoEm:
            new Date(
              cliente.atualizadoEm
            ),

          enderecos: {
            create:
              cliente.enderecos.map(
                (
                  endereco
                ) => ({
                  id:
                    endereco.id,

                  rotulo:
                    endereco.rotulo,

                  principal:
                    endereco.principal,

                  cep:
                    endereco.cep ??
                    null,

                  logradouro:
                    endereco.logradouro,

                  numero:
                    endereco.numero,

                  complemento:
                    endereco.complemento ??
                    null,

                  bairro:
                    endereco.bairro,

                  cidade:
                    endereco.cidade,

                  estado:
                    endereco.estado,

                  latitude:
                    endereco.latitude ??
                    null,

                  longitude:
                    endereco.longitude ??
                    null,

                  criadoEm:
                    new Date(
                      endereco.criadoEm
                    ),

                  atualizadoEm:
                    new Date(
                      endereco.atualizadoEm
                    ),
                })
              ),
          },
        },

        include: {
          enderecos: true,
        },
      });

    return mapearCliente(
      criado
    );
  }

  async buscarPorId(
    id: string,
  ): Promise<
    Cliente | undefined
  > {
    const cliente =
      await prisma.cliente.findFirst({
        where: {
          id,

          empresaId:
            this.contexto.empresaId,
        },

        include: {
          enderecos: true,
        },
      });

    return cliente
      ? mapearCliente(cliente)
      : undefined;
  }

  async buscarPorTelefone(
    telefone: string,
  ): Promise<
    Cliente | undefined
  > {
    const cliente =
      await prisma.cliente.findUnique({
        where: {
          empresaId_telefone: {
            empresaId:
              this.contexto.empresaId,

            telefone:
              normalizarTelefone(
                telefone
              ),
          },
        },

        include: {
          enderecos: true,
        },
      });

    return cliente
      ? mapearCliente(cliente)
      : undefined;
  }

  async buscarPorCpf(
    cpf: string,
  ): Promise<
    Cliente | undefined
  > {
    const cliente =
      await prisma.cliente.findFirst({
        where: {
          empresaId:
            this.contexto.empresaId,

          cpf:
            normalizarCpf(
              cpf
            ),
        },

        include: {
          enderecos: true,
        },
      });

    return cliente
      ? mapearCliente(cliente)
      : undefined;
  }

  async listar(): Promise<
    Cliente[]
  > {
    const clientes =
      await prisma.cliente.findMany({
        where: {
          empresaId:
            this.contexto.empresaId,
        },

        include: {
          enderecos: true,
        },

        orderBy: {
          criadoEm: "desc",
        },
      });

    return clientes.map(
      mapearCliente
    );
  }

  async atualizar(
    cliente: Cliente,
  ): Promise<Cliente> {
    const existente =
      await prisma.cliente.findFirst({
        where: {
          id:
            cliente.id,

          empresaId:
            this.contexto.empresaId,
        },
      });

    if (!existente) {
      throw new Error(
        "Cliente não encontrado."
      );
    }

    const atualizado =
      await prisma.cliente.update({
        where: {
          id:
            cliente.id,
        },

        data: {
          nome:
            cliente.nome,

          telefone:
            normalizarTelefone(
              cliente.telefone
            ),

          cpf:
            normalizarCpf(
              cliente.cpf
            ),

          email:
            cliente.email ??
            null,

          dataNascimento:
            cliente.dataNascimento
              ? new Date(
                  cliente.dataNascimento
                )
              : null,

          origemPrimeiroPedido:
            cliente.origemPrimeiroPedido ??
            null,

          ultimoPedidoEm:
            cliente.ultimoPedidoEm
              ? new Date(
                  cliente.ultimoPedidoEm
                )
              : null,

          quantidadePedidos:
            cliente.quantidadePedidos,

          valorTotalCompras:
            cliente.valorTotalCompras,

          ticketMedio:
            cliente.ticketMedio,

          ativo:
            cliente.ativo,
        },

        include: {
          enderecos: true,
        },
      });

    return mapearCliente(
      atualizado
    );
  }

  async remover(
    id: string,
  ): Promise<void> {
    const existente =
      await prisma.cliente.findFirst({
        where: {
          id,

          empresaId:
            this.contexto.empresaId,
        },
      });

    if (!existente) {
      throw new Error(
        "Cliente não encontrado."
      );
    }

    await prisma.cliente.delete({
      where: {
        id,
      },
    });
  }
}