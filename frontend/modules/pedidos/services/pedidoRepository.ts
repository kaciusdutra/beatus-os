import {
  Pedido,
} from "../types/pedido";

const CHAVE_PEDIDOS =
  "beatus_os_pedidos";

const CHAVE_NUMERO_PEDIDO =
  "beatus_os_proximo_numero";

const NUMERO_INICIAL = 1001;

function ambienteBrowser(): boolean {
  return typeof window !== "undefined";
}

function carregarPedidos(): Pedido[] {
  if (!ambienteBrowser()) {
    return [];
  }

  try {
    const dados =
      window.localStorage.getItem(
        CHAVE_PEDIDOS
      );

    if (!dados) {
      return [];
    }

    const pedidos = JSON.parse(
      dados
    ) as Pedido[];

    if (!Array.isArray(pedidos)) {
      return [];
    }

    return pedidos;
  } catch (error) {
    console.error(
      "Erro ao carregar pedidos simulados:",
      error
    );

    return [];
  }
}

function salvarPedidos(
  pedidos: Pedido[]
): void {
  if (!ambienteBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(
      CHAVE_PEDIDOS,
      JSON.stringify(pedidos)
    );
  } catch (error) {
    console.error(
      "Erro ao salvar pedidos simulados:",
      error
    );
  }
}

function obterProximoNumero(): number {
  if (!ambienteBrowser()) {
    return NUMERO_INICIAL;
  }

  const numeroSalvo =
    window.localStorage.getItem(
      CHAVE_NUMERO_PEDIDO
    );

  if (!numeroSalvo) {
    window.localStorage.setItem(
      CHAVE_NUMERO_PEDIDO,
      String(
        NUMERO_INICIAL + 1
      )
    );

    return NUMERO_INICIAL;
  }

  const numero =
    Number(numeroSalvo);

  if (
    !Number.isInteger(numero) ||
    numero < NUMERO_INICIAL
  ) {
    window.localStorage.setItem(
      CHAVE_NUMERO_PEDIDO,
      String(
        NUMERO_INICIAL + 1
      )
    );

    return NUMERO_INICIAL;
  }

  window.localStorage.setItem(
    CHAVE_NUMERO_PEDIDO,
    String(numero + 1)
  );

  return numero;
}

export interface PedidoRepository {
  criar(pedido: Pedido): Pedido;

  listar(): Pedido[];

  buscarPorId(
    id: string
  ): Pedido | undefined;

  atualizar(
    pedido: Pedido
  ): Pedido;
}

const mockRepository: PedidoRepository = {
  criar(pedido) {
    const pedidos =
      carregarPedidos();

    const novosPedidos = [
      ...pedidos,
      pedido,
    ];

    salvarPedidos(
      novosPedidos
    );

    return pedido;
  },

  listar() {
    return carregarPedidos();
  },

  buscarPorId(id) {
    const pedidos =
      carregarPedidos();

    return pedidos.find(
      (pedido) =>
        pedido.id === id
    );
  },

  atualizar(pedido) {
    const pedidos =
      carregarPedidos();

    const pedidosAtualizados =
      pedidos.map(
        (item) =>
          item.id === pedido.id
            ? pedido
            : item
      );

    salvarPedidos(
      pedidosAtualizados
    );

    return pedido;
  },
};

export function getPedidoRepository(): PedidoRepository {
  return mockRepository;
}

export function gerarNumeroPedido(): number {
  return obterProximoNumero();
}