import {
  Cliente,
} from "../types/cliente";

const CHAVE_CLIENTES =
  "beatus_os_clientes";

export interface ClienteRepository {
  criar(
    cliente: Cliente
  ): Cliente;

  listar(): Cliente[];

  buscarPorId(
    id: string
  ): Cliente | undefined;

  buscarPorTelefone(
    telefone: string
  ): Cliente | undefined;

  buscarPorCpf(
    cpf: string
  ): Cliente | undefined;

  atualizar(
    cliente: Cliente
  ): Cliente;
}

function ambienteBrowser(): boolean {
  return (
    typeof window !==
    "undefined"
  );
}

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

function carregarClientes(): Cliente[] {
  if (!ambienteBrowser()) {
    return [];
  }

  try {
    const dados =
      window.localStorage.getItem(
        CHAVE_CLIENTES
      );

    if (!dados) {
      return [];
    }

    const clientes =
      JSON.parse(dados) as Cliente[];

    return Array.isArray(
      clientes
    )
      ? clientes
      : [];
  } catch (error) {
    console.error(
      "Erro ao carregar clientes:",
      error
    );

    return [];
  }
}

function salvarClientes(
  clientes: Cliente[]
): void {
  if (!ambienteBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(
      CHAVE_CLIENTES,
      JSON.stringify(clientes)
    );
  } catch (error) {
    console.error(
      "Erro ao salvar clientes:",
      error
    );
  }
}

const mockRepository: ClienteRepository =
  {
    criar(cliente) {
      const clientes =
        carregarClientes();

      const existente =
        clientes.find(
          (item) =>
            item.id ===
            cliente.id
        );

      if (existente) {
        return this.atualizar(
          cliente
        );
      }

      salvarClientes([
        ...clientes,
        cliente,
      ]);

      return cliente;
    },

    listar() {
      return carregarClientes();
    },

    buscarPorId(id) {
      return carregarClientes().find(
        (cliente) =>
          cliente.id === id
      );
    },

    buscarPorTelefone(
      telefone
    ) {
      const telefoneNormalizado =
        normalizarTelefone(
          telefone
        );

      if (
        !telefoneNormalizado
      ) {
        return undefined;
      }

      return carregarClientes().find(
        (cliente) =>
          normalizarTelefone(
            cliente.telefone
          ) ===
          telefoneNormalizado
      );
    },

    buscarPorCpf(cpf) {
      const cpfNormalizado =
        normalizarCpf(cpf);

      if (!cpfNormalizado) {
        return undefined;
      }

      return carregarClientes().find(
        (cliente) =>
          normalizarCpf(
            cliente.cpf
          ) ===
          cpfNormalizado
      );
    },

    atualizar(cliente) {
      const clientes =
        carregarClientes();

      const atualizados =
        clientes.map(
          (item) =>
            item.id ===
            cliente.id
              ? cliente
              : item
        );

      salvarClientes(
        atualizados
      );

      return cliente;
    },
  };

export function getClienteRepository(): ClienteRepository {
  return mockRepository;
}