"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import PdvCatalogo from "../components/PdvCatalogo";
import PdvComanda from "../components/PdvComanda";
import PdvClienteModal from "../components/PdvClienteModal";
import PdvComandaMarketplace from "../components/PdvComandaMarketplace";
import PdvNovoEnderecoModal from "../components/PdvNovoEnderecoModal";

import {
  EntradaPedido,
  FormaPagamento,
  StatusPagamento,
  CanalPedido,
  ModalidadePagamento,
} from "@/modules/pedidos/types/pedido";

import type {
  PedidoSolicitado,
} from "@/modules/pedidos/types/pedidoSolicitado";

import {
  canaisDePreco,
} from "@/modules/pedidos/services/calcularPedido";

import {
  ItemComanda,
  ProdutoPDV,
} from "../types/pdv";

import {
  calcularEntrega,
} from "@/core/delivery/deliveryService";

import {
  AddressSearchResult,
} from "@/core/address/addressTypes";

import {
  buscarPorEndereco,
} from "@/core/address/addressService";

import {
  Cliente,
  CanalOrigemCliente,
  EnderecoCliente,
} from "@/modules/clientes/types/cliente";

export default function PdvPage() {
  const [
    categoriaAtiva,
    setCategoriaAtiva,
  ] = useState("TODOS");

  const [itens, setItens] =
    useState<ItemComanda[]>([]);

  const [origem, setOrigem] =
    useState<CanalPedido>("PDV");

  const [entrada, setEntrada] =
    useState<EntradaPedido>(
      "MANUAL"
    );

  const [
    clienteId,
    setClienteId,
  ] = useState<string | null>(
    null
  );

  const [cliente, setCliente] =
    useState("");

  const [telefone, setTelefone] =
    useState("");

  const [
    clienteCompleto,
    setClienteCompleto,
  ] = useState<Cliente | null>(
    null
  );

  const [
    modalClienteAberto,
    setModalClienteAberto,
  ] = useState(false);

  const [
    modalNovoEnderecoAberto,
    setModalNovoEnderecoAberto,
  ] = useState(false);

  const [
    salvarNovoEnderecoNoCadastro,
    setSalvarNovoEnderecoNoCadastro,
  ] = useState(false);

  const [
    enderecoSelecionado,
    setEnderecoSelecionado,
  ] = useState<AddressSearchResult | null>(
    null
  );

  const [
    enderecoClienteSelecionado,
    setEnderecoClienteSelecionado,
  ] = useState<EnderecoCliente | null>(
    null
  );

  const [numero, setNumero] =
    useState("");

  const [
    complemento,
    setComplemento,
  ] = useState("");

  const [
    formaPagamento,
    setFormaPagamento,
  ] = useState<FormaPagamento>(
    "PIX"
  );

  const [
    statusPagamento,
    setStatusPagamento,
  ] = useState<StatusPagamento>(
    "PENDENTE"
  );

  const [mensagem, setMensagem] =
    useState<string | null>(
      null
    );

  // Catálogo do cadastro de produtos, com o preço da Precificação para o
  // canal do pedido (regra 6.6). O servidor recalcula tudo no lançamento.
  const [catalogo, setCatalogo] =
    useState<{
      produtos: {
        id: string;
        nome: string;
        descricao: string;
        categoria: string;
        ativo: boolean;
      }[];

      precos: {
        produtoId: string;
        canal: string;
        preco: number;
      }[];
    }>({
      produtos: [],
      precos: [],
    });

  useEffect(() => {
    void (async () => {
      try {
        const [respostaProdutos, respostaPrecos] =
          await Promise.all([
            fetch("/api/produtos", {
              cache: "no-store",
            }),

            fetch("/api/precificacao", {
              cache: "no-store",
            }),
          ]);

        const dadosProdutos =
          await respostaProdutos.json();

        const dadosPrecos =
          await respostaPrecos.json();

        setCatalogo({
          produtos:
            dadosProdutos.produtos ??
            [],

          precos:
            dadosPrecos.precos ??
            [],
        });
      } catch {
        setMensagem(
          "Não foi possível carregar o cardápio."
        );
      }
    })();
  }, []);

  const produtosAtivos = useMemo(
    () =>
      catalogo.produtos
        .filter(
          (produto) =>
            produto.ativo &&
            produto.categoria.toUpperCase() !==
              "ADICIONAL"
        )
        .flatMap((produto) => {
          const preco =
            canaisDePreco(origem)
              .map(
                (canal) =>
                  catalogo.precos.find(
                    (item) =>
                      item.produtoId ===
                        produto.id &&
                      item.canal === canal
                  )?.preco
              )
              .find(
                (valor) =>
                  valor !== undefined &&
                  valor > 0
              );

          return preco === undefined
            ? []
            : [
                {
                  ...produto,
                  preco,
                },
              ];
        }),
    [catalogo, origem]
  );

  const distanciaEntregaKm =
    enderecoSelecionado?.distanciaSimuladaKm ??
    null;

  const cobrancaNoPdvHabilitada =
    entrada === "MANUAL";

  const entrega =
    calcularEntrega(
      distanciaEntregaKm
    );

  const taxaEntrega =
    entrega.status ===
    "CALCULADO"
      ? entrega.taxa
      : 0;

  const subtotal =
    itens.reduce(
      (total, item) =>
        total + item.subtotal,
      0
    );

  const total =
    subtotal + taxaEntrega;

  const modalidadePagamento:
    ModalidadePagamento =
    "ELETRONICO";

  const pedidoPodeSerLancado =
    itens.length > 0 &&
    clienteId !== null &&
    clienteCompleto !== null &&
    enderecoSelecionado !==
      null &&
    numero.trim() !== "" &&
    distanciaEntregaKm !==
      null &&
    entrega.status ===
      "CALCULADO" &&
    statusPagamento ===
      "APROVADO";

  function adicionarProduto(
    produto: ProdutoPDV
  ) {
    setMensagem(null);

    setItens(
      (itensAtuais) => {
        const existente =
          itensAtuais.find(
            (item) =>
              item.produtoId ===
              produto.id
          );

        if (existente) {
          return itensAtuais.map(
            (item) =>
              item.produtoId ===
              produto.id
                ? {
                    ...item,
                    quantidade:
                      item.quantidade +
                      1,
                    subtotal:
                      (item.quantidade +
                        1) *
                      item.precoUnitario,
                  }
                : item
          );
        }

        return [
          ...itensAtuais,
          {
            produtoId:
              produto.id,

            nome:
              produto.nome,

            quantidade: 1,

            precoUnitario:
              produto.preco,

            subtotal:
              produto.preco,
          },
        ];
      }
    );
  }

  function alterarQuantidade(
    produtoId: string,
    quantidade: number
  ) {
    if (
      quantidade <= 0
    ) {
      removerProduto(
        produtoId
      );

      return;
    }

    setItens(
      (itensAtuais) =>
        itensAtuais.map(
          (item) =>
            item.produtoId ===
            produtoId
              ? {
                  ...item,
                  quantidade,
                  subtotal:
                    quantidade *
                    item.precoUnitario,
                }
              : item
        )
    );
  }

  function removerProduto(
    produtoId: string
  ) {
    setItens(
      (itensAtuais) =>
        itensAtuais.filter(
          (item) =>
            item.produtoId !==
            produtoId
        )
    );
  }

  const origemEhMarketplace = ["IFOOD", "99FOOD", "KEETA"].includes(origem);

  // Pedido de marketplace: sem cliente, endereço nem cobrança. O servidor usa
  // o cliente do canal, o preço do canal e o pagamento aprovado da plataforma.
  async function lancarPedidoMarketplace(dados: {
    codigo: string;
    nomeCliente: string;
  }): Promise<boolean> {
    if (itens.length === 0) {
      setMensagem("Adicione pelo menos um produto.");

      return false;
    }

    if (!dados.codigo) {
      setMensagem("Informe o código do pedido no marketplace.");

      return false;
    }

    try {
      setMensagem("Lançando pedido...");

      const resposta = await fetch("/api/pedidos", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",

          Accept: "application/json",
        },

        body: JSON.stringify({
          id: crypto.randomUUID(),

          canal: origem,

          entrada: "MANUAL",

          marketplace: {
            codigo: dados.codigo,

            nomeCliente: dados.nomeCliente || undefined,
          },

          itens: itens.map((item) => ({
            produtoId: item.produtoId,

            quantidade: item.quantidade,

            observacao: item.observacao,

            adicionais: item.adicionais?.map((adicional) => ({
              produtoId: adicional.id,

              quantidade: adicional.quantidade,
            })),
          })),
        }),
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(resultado?.mensagem ?? "Não foi possível lançar o pedido.");
      }

      setMensagem(
        `Pedido #${resultado.pedido.numero} do marketplace lançado. Ele aguarda a conferência do repasse em Financeiro.`
      );

      setItens([]);

      return true;
    } catch (error) {
      setMensagem(
        error instanceof Error ? error.message : "Não foi possível lançar o pedido."
      );

      return false;
    }
  }

  function alterarOrigem(
    novaOrigem: CanalPedido
  ) {
    setOrigem(
      novaOrigem
    );

    switch (
      novaOrigem
    ) {
      case "PDV":
        setEntrada(
          "MANUAL"
        );

        setStatusPagamento(
          "PENDENTE"
        );

        setFormaPagamento(
          "PIX"
        );

        break;

      case "WHATSAPP":
        setEntrada(
          "IA"
        );

        setStatusPagamento(
          "PENDENTE"
        );

        break;

      case "CARDAPIO_ONLINE":
        setEntrada(
          "ONLINE"
        );

        setStatusPagamento(
          "PENDENTE"
        );

        break;

      case "IFOOD":
      case "99FOOD":
      case "KEETA":
        setEntrada(
          "API"
        );

        setStatusPagamento(
          "PENDENTE"
        );

        break;
    }
  }

  function alterarEntrada(
    novaEntrada: EntradaPedido
  ) {
    setEntrada(
      novaEntrada
    );

    if (
      novaEntrada !==
      "MANUAL"
    ) {
      setStatusPagamento(
        "PENDENTE"
      );
    }
  }

  function obterCanalOrigemCliente():
    CanalOrigemCliente {
    switch (origem) {
      case "WHATSAPP":
        return "WHATSAPP";

      case "CARDAPIO_ONLINE":
        return "CARDAPIO_ONLINE";

      case "IFOOD":
        return "IFOOD";

      case "99FOOD":
        return "99FOOD";

      case "KEETA":
        return "KEETA";

      case "PDV":
      default:
        return "PDV";
    }
  }

  function limparCliente() {
    setClienteId(null);
    setCliente("");
    setTelefone("");
    setClienteCompleto(null);
    setEnderecoSelecionado(null);
    setEnderecoClienteSelecionado(null);
    setSalvarNovoEnderecoNoCadastro(
      false
    );
    setNumero("");
    setComplemento("");
  }

  function nomeRotulo(
    rotulo?: EnderecoCliente["rotulo"]
  ): string {
    switch (rotulo) {
      case "CASA":
        return "Casa";

      case "TRABALHO":
        return "Trabalho";

      case "FAMILIA":
        return "Família";

      case "OUTRO":
        return "Outro";

      default:
        return "Casa";
    }
  }

  function aplicarEnderecoSalvo(
    endereco: EnderecoCliente
  ) {
    const resultados =
      buscarPorEndereco(
        endereco.logradouro
      );

    const encontrado =
      resultados.find(
        (resultado) =>
          Boolean(
            endereco.cep
          ) &&
          resultado.cep ===
            endereco.cep
      ) ??
      resultados.find(
        (resultado) =>
          resultado.logradouro
            .toLowerCase() ===
          endereco.logradouro
            .toLowerCase()
      );

    setEnderecoClienteSelecionado(
      endereco
    );

    setSalvarNovoEnderecoNoCadastro(
      false
    );

    if (encontrado) {
      setEnderecoSelecionado(
        encontrado
      );
    } else {
      setEnderecoSelecionado({
        id: endereco.id,
        cep: endereco.cep,
        logradouro:
          endereco.logradouro,
        bairro: endereco.bairro,
        cidade: endereco.cidade,
        estado: endereco.estado,
        latitude:
          endereco.latitude,
        longitude:
          endereco.longitude,
        distanciaSimuladaKm:
          undefined,
        descricao: [
          endereco.logradouro,
          endereco.bairro,
          endereco.cidade,
          endereco.estado,
        ].join(", "),
      });
    }

    setNumero(
      endereco.numero
    );

    setComplemento(
      endereco.complemento ??
        ""
    );

    setMensagem(
      `Endereço ${nomeRotulo(
        endereco.rotulo
      )} selecionado.`
    );
  }

  async function buscarCliente() {
    if (
      !telefone.trim()
    ) {
      setMensagem(
        "Informe o telefone do cliente."
      );

      return;
    }

    setMensagem(null);

    try {
      const telefoneNormalizado =
        telefone.replace(
          /\D/g,
          ""
        );

      const resposta =
        await fetch(
          `/api/clientes?telefone=${encodeURIComponent(
            telefoneNormalizado
          )}`,
          {
            method: "GET",

            headers: {
              Accept:
                "application/json",
            },
          }
        );

      const dados =
        await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados?.mensagem ??
            "Não foi possível localizar o cliente."
        );
      }

      if (!dados.encontrado) {
        setClienteId(null);
        setClienteCompleto(
          null
        );
        setCliente("");
        setEnderecoSelecionado(
          null
        );
        setEnderecoClienteSelecionado(
          null
        );
        setSalvarNovoEnderecoNoCadastro(
          false
        );
        setNumero("");
        setComplemento("");

        setModalClienteAberto(
          true
        );

        return;
      }

      const encontrado =
        dados.cliente as Cliente;

      setClienteId(
        encontrado.id
      );

      setClienteCompleto(
        encontrado
      );

      setCliente(
        encontrado.nome
      );

      setModalClienteAberto(
        false
      );

      const enderecoPrincipal =
        encontrado.enderecos.find(
          (endereco) =>
            endereco.principal
        ) ??
        encontrado.enderecos[0];

      if (
        enderecoPrincipal
      ) {
        aplicarEnderecoSalvo(
          enderecoPrincipal
        );
      } else {
        setEnderecoSelecionado(
          null
        );

        setEnderecoClienteSelecionado(
          null
        );

        setNumero("");
        setComplemento("");
      }

      setMensagem(
        `${encontrado.nome} localizado.`
      );
    } catch (error) {
      setMensagem(
        error instanceof Error
          ? error.message
          : "Não foi possível localizar o cliente."
      );
    }
  }

  function selecionarClienteEncontrado(
  encontrado: Cliente
) {
  setClienteId(
    encontrado.id
  );

  setClienteCompleto(
    encontrado
  );

  setCliente(
    encontrado.nome
  );

  setModalClienteAberto(
    false
  );

  const enderecoPrincipal =
    encontrado.enderecos.find(
      (endereco) =>
        endereco.principal
    ) ??
    encontrado.enderecos[0];

  if (
    enderecoPrincipal
  ) {
    aplicarEnderecoSalvo(
      enderecoPrincipal
    );
  } else {
    setEnderecoSelecionado(
      null
    );

    setEnderecoClienteSelecionado(
      null
    );

    setNumero("");

    setComplemento("");
  }

  setMensagem(
    `${encontrado.nome} localizado pelo CPF.`
  );
}

  async function salvarNovoCliente(
  dados: {
    nome: string;

    cpf: string;

    email: string;

    dataNascimento: string;

    enderecoSelecionado:
      AddressSearchResult;

    numero: string;

    complemento: string;

    rotuloEndereco:
      EnderecoCliente["rotulo"];
  }
) {
    const agora =
      new Date().toISOString();

    const enderecoPrincipal:
      EnderecoCliente = {
      id:
        crypto.randomUUID(),

      rotulo:
        dados.rotuloEndereco,

      cep:
        dados.enderecoSelecionado
          .cep,

      logradouro:
        dados.enderecoSelecionado
          .logradouro,

      numero:
        dados.numero,

      complemento:
        dados.complemento ||
        undefined,

      bairro:
        dados.enderecoSelecionado
          .bairro,

      cidade:
        dados.enderecoSelecionado
          .cidade,

      estado:
        dados.enderecoSelecionado
          .estado,

      latitude:
        dados.enderecoSelecionado
          .latitude,

      longitude:
        dados.enderecoSelecionado
          .longitude,

      principal:
        true,

      criadoEm:
        agora,

      atualizadoEm:
        agora,
    };

    const novoCliente:
  Cliente = {
  id:
    crypto.randomUUID(),

  nome:
    dados.nome,

  telefone:
    telefone.trim(),

  cpf:
    dados.cpf,

  email:
    dados.email ||
    undefined,

  dataNascimento:
    dados.dataNascimento ||
    undefined,

  origemPrimeiroPedido:
    obterCanalOrigemCliente(),

  enderecos: [
    enderecoPrincipal,
  ],

  quantidadePedidos:
    0,

  valorTotalCompras:
    0,

  ticketMedio:
    0,

  criadoEm:
    agora,

  atualizadoEm:
    agora,

  ativo:
    true,
};

    setMensagem(
      "Cadastrando cliente..."
    );

    try {
      const resposta =
        await fetch(
          "/api/clientes",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body:
              JSON.stringify(
                novoCliente
              ),
          }
        );

      const resultado =
        await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          resultado?.mensagem ??
            "Não foi possível cadastrar o cliente."
        );
      }

      const salvo =
        resultado.cliente as Cliente;

      setClienteId(
        salvo.id
      );

      setClienteCompleto(
        salvo
      );

      setCliente(
        salvo.nome
      );

      const enderecoSalvo =
        salvo.enderecos.find(
          (endereco) =>
            endereco.principal
        ) ??
        salvo.enderecos[0];

      if (
        enderecoSalvo
      ) {
        setEnderecoClienteSelecionado(
          enderecoSalvo
        );
      }

      setEnderecoSelecionado(
        dados.enderecoSelecionado
      );

      setSalvarNovoEnderecoNoCadastro(
        false
      );

      setNumero(
        dados.numero
      );

      setComplemento(
        dados.complemento
      );

      setModalClienteAberto(
        false
      );

      setMensagem(
        `${salvo.nome} cadastrado com sucesso.`
      );
    } catch (error) {
      setMensagem(
        error instanceof Error
          ? error.message
          : "Não foi possível cadastrar o cliente."
      );
    }
  }

  function novoEndereco() {
    setModalNovoEnderecoAberto(
      true
    );
  }

  function usarNovoEndereco(
    dados: {
      endereco: AddressSearchResult;

      numero: string;

      complemento: string;

      rotulo:
        EnderecoCliente["rotulo"];

      salvarNoCadastro: boolean;
    }
  ) {
    setEnderecoSelecionado(
      dados.endereco
    );

    setEnderecoClienteSelecionado(
      null
    );

    setNumero(
      dados.numero
    );

    setComplemento(
      dados.complemento
    );

    setSalvarNovoEnderecoNoCadastro(
      dados.salvarNoCadastro
    );

    setModalNovoEnderecoAberto(
      false
    );

    setMensagem(
      dados.salvarNoCadastro
        ? "Novo endereço selecionado e marcado para ser salvo no cadastro."
        : "Novo endereço selecionado para esta entrega."
    );
  }

  function atualizarClienteComNovoEndereco(
    clienteAtual: Cliente,
    agora: string
  ): Cliente {
    if (
      !salvarNovoEnderecoNoCadastro ||
      !enderecoSelecionado ||
      !numero.trim()
    ) {
      return clienteAtual;
    }

    const enderecoNovo:
      EnderecoCliente = {
      id:
        crypto.randomUUID(),

      rotulo:
        "OUTRO",

      cep:
        enderecoSelecionado.cep,

      logradouro:
        enderecoSelecionado.logradouro,

      numero:
        numero.trim(),

      complemento:
        complemento.trim() ||
        undefined,

      bairro:
        enderecoSelecionado.bairro,

      cidade:
        enderecoSelecionado.cidade,

      estado:
        enderecoSelecionado.estado,

      latitude:
        enderecoSelecionado.latitude,

      longitude:
        enderecoSelecionado.longitude,

      principal:
        false,

      criadoEm:
        agora,

      atualizadoEm:
        agora,
    };

    return {
      ...clienteAtual,

      enderecos: [
        ...clienteAtual.enderecos,
        enderecoNovo,
      ],

      atualizadoEm:
        agora,
    };
  }

  function atualizarEnderecoExistente(
    clienteAtual: Cliente,
    agora: string
  ): Cliente {
    if (
      !enderecoClienteSelecionado ||
      !numero.trim()
    ) {
      return clienteAtual;
    }

    return {
      ...clienteAtual,

      enderecos:
        clienteAtual.enderecos.map(
          (endereco) =>
            endereco.id ===
            enderecoClienteSelecionado.id
              ? {
                  ...endereco,

                  numero:
                    numero.trim(),

                  complemento:
                    complemento.trim() ||
                    undefined,

                  atualizadoEm:
                    agora,
                }
              : endereco
        ),

      atualizadoEm:
        agora,
    };
  }

  async function lancarPedido() {
    setMensagem(null);

    if (
      itens.length ===
      0
    ) {
      setMensagem(
        "Adicione pelo menos um produto."
      );

      return;
    }

    if (
      !clienteCompleto ||
      !clienteId
    ) {
      setMensagem(
        "Localize ou cadastre o cliente antes de continuar."
      );

      return;
    }

    if (
      !enderecoSelecionado
    ) {
      setMensagem(
        "Selecione o endereço de entrega."
      );

      return;
    }

    if (
      !numero.trim()
    ) {
      setMensagem(
        "Informe o número do endereço."
      );

      return;
    }

    if (
      distanciaEntregaKm ===
      null
    ) {
      setMensagem(
        "Não foi possível determinar a distância de entrega."
      );

      return;
    }

    if (
      entrega.status ===
      "FORA_DA_AREA"
    ) {
      setMensagem(
        "O endereço está fora da área de entrega do Beatus."
      );

      return;
    }

    if (
      entrega.status !==
      "CALCULADO"
    ) {
      setMensagem(
        "Não foi possível calcular a entrega."
      );

      return;
    }

    if (
      statusPagamento !==
      "APROVADO"
    ) {
      setMensagem(
        "O pagamento precisa estar aprovado antes do lançamento."
      );

      return;
    }

    const agora =
      new Date().toISOString();

    let clienteAtualizado =
      clienteCompleto;

    if (
      salvarNovoEnderecoNoCadastro
    ) {
      clienteAtualizado =
        atualizarClienteComNovoEndereco(
          clienteAtualizado,
          agora
        );
    } else if (
      enderecoClienteSelecionado
    ) {
      clienteAtualizado =
        atualizarEnderecoExistente(
          clienteAtualizado,
          agora
        );
    }

    // S2: a tela só informa o que o cliente escolheu. Preço, subtotal, taxa
    // de entrega, total, número e datas são calculados pelo servidor.
    const pedido: PedidoSolicitado = {
      id: crypto.randomUUID(),

      canal: origem,

      entrada,

      clienteId: clienteAtualizado.id,

      enderecoEntrega: {
        enderecoId:
          enderecoClienteSelecionado?.id,

        rotulo:
          enderecoClienteSelecionado?.rotulo,

        cep: enderecoSelecionado.cep,

        logradouro:
          enderecoSelecionado.logradouro,

        numero: numero.trim(),

        complemento:
          complemento.trim() || undefined,

        bairro: enderecoSelecionado.bairro,

        cidade: enderecoSelecionado.cidade,

        estado: enderecoSelecionado.estado,

        latitude: enderecoSelecionado.latitude,

        longitude: enderecoSelecionado.longitude,
      },

      distanciaEntregaKm,

      itens: itens.map((item) => ({
        produtoId: item.produtoId,

        quantidade: item.quantidade,

        observacao: item.observacao,

        adicionais: item.adicionais?.map(
          (adicional) => ({
            produtoId: adicional.id,

            quantidade: adicional.quantidade,
          })
        ),
      })),

      pagamento: {
        modalidade: modalidadePagamento,

        forma: formaPagamento,

        status: statusPagamento,
      },
    };

    try {
      setMensagem(
        "Lançando pedido..."
      );

      const resposta =
        await fetch(
          "/api/pedidos",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body:
              JSON.stringify(
                pedido
              ),
          }
        );

      const resultado =
        await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          resultado?.mensagem ??
            "Não foi possível lançar o pedido."
        );
      }

      setMensagem(
        `Pedido #${resultado.pedido.numero} lançado com sucesso.`
      );

      setItens([]);

      limparCliente();

      setFormaPagamento(
        "PIX"
      );

      setStatusPagamento(
        "PENDENTE"
      );

      setOrigem(
        "PDV"
      );

      setEntrada(
        "MANUAL"
      );

      setModalNovoEnderecoAberto(
        false
      );
    } catch (error) {
      const mensagemErro =
        error instanceof Error
          ? error.message
          : "Não foi possível lançar o pedido.";

      setMensagem(
        mensagemErro
      );
    }
  }

  return (
    <>
      <main className="min-h-full bg-slate-100 px-6 py-6">
        <div className="mx-auto h-full max-w-[1600px]">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px] xl:items-start">
            <section className="min-w-0">
              <div className="mb-6">
                <p className="text-sm font-semibold uppercase tracking-wider text-orange-600">
                  Ponto de Venda
                </p>

                <h1 className="mt-1 text-3xl font-bold text-slate-900">
                  PDV
                </h1>

                <p className="mt-1 text-slate-500">
                  Entrada, validação e lançamento de pedidos no Beatus OS.
                </p>
              </div>

              {mensagem && (
                <div className="mb-5 rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 shadow-sm">
                  {mensagem}
                </div>
              )}

              {catalogo.produtos.filter(
                (produto) =>
                  produto.ativo &&
                  produto.categoria.toUpperCase() !==
                    "ADICIONAL"
              ).length >
                produtosAtivos.length && (
                <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Alguns produtos não aparecem porque ainda não têm preço
                  neste canal. Defina o preço em Financeiro → Precificação.
                </div>
              )}

              <PdvCatalogo
                produtos={
                  produtosAtivos
                }

                categoriaAtiva={
                  categoriaAtiva
                }

                onCategoriaChange={
                  setCategoriaAtiva
                }

                onAdicionar={
                  adicionarProduto
                }
              />
            </section>

            {origemEhMarketplace ? (
              <PdvComandaMarketplace
                itens={itens}
                origem={origem}
                onOrigemChange={alterarOrigem}
                onAlterarQuantidade={alterarQuantidade}
                onRemover={removerProduto}
                onLancar={lancarPedidoMarketplace}
              />
            ) : (
            <PdvComanda
              itens={
                itens
              }

              origem={
                origem
              }

              entrada={
                entrada
              }

              cliente={
                cliente
              }

              telefone={
                telefone
              }

              clienteEncontrado={
                clienteCompleto !==
                null
              }

              clienteCompleto={
                clienteCompleto
              }

              enderecoSelecionado={
                enderecoSelecionado
              }

              numero={
                numero
              }

              complemento={
                complemento
              }

              distanciaEntregaKm={
                distanciaEntregaKm
              }

              taxaEntrega={
                taxaEntrega
              }

              entrega={
                entrega
              }

              formaPagamento={
                formaPagamento
              }

              statusPagamento={
                statusPagamento
              }

              cobrancaNoPdvHabilitada={
                cobrancaNoPdvHabilitada
              }

              pedidoPodeSerLancado={
                pedidoPodeSerLancado
              }

              onBuscarCliente={
                buscarCliente
              }

              onCadastrarCliente={() =>
                setModalClienteAberto(
                  true
                )
              }

              onSelecionarEnderecoSalvo={
                aplicarEnderecoSalvo
              }

              onNovoEndereco={
                novoEndereco
              }

              onOrigemChange={
                alterarOrigem
              }

              onEntradaChange={
                alterarEntrada
              }

              onClienteChange={
                setCliente
              }

              onTelefoneChange={
                setTelefone
              }

              onFormaPagamentoChange={
                setFormaPagamento
              }

              onStatusPagamentoChange={
                setStatusPagamento
              }

              onAlterarQuantidade={
                alterarQuantidade
              }

              onRemover={
                removerProduto
              }

              onLancarPedido={
                lancarPedido
              }
            />
            )}
          </div>
        </div>
      </main>

      <PdvClienteModal
        aberto={
          modalClienteAberto
        }

        telefone={
          telefone
        }

        onFechar={() =>
          setModalClienteAberto(
            false
          )
        }

        onSalvar={
          salvarNovoCliente
        }

        onClienteEncontradoPorCpf={
          selecionarClienteEncontrado
       }
      />

      <PdvNovoEnderecoModal
        aberto={
          modalNovoEnderecoAberto
        }

        onFechar={() =>
          setModalNovoEnderecoAberto(
            false
          )
        }

        onUsarEndereco={
          usarNovoEndereco
        }
      />
    </>
  );
}