"use client";

import {
  EntradaPedido,
  FormaPagamento,
  CanalPedido,
  StatusPagamento,
} from "@/modules/pedidos/types/pedido";

import {
  AddressSearchResult,
} from "@/core/address/addressTypes";

import {
  DeliveryCalculation,
} from "@/core/delivery/deliveryTypes";

import {
  Cliente,
  EnderecoCliente,
  RotuloEndereco,
} from "@/modules/clientes/types/cliente";

import {
  ItemComanda,
} from "../types/pdv";

interface Props {
  itens: ItemComanda[];

  origem: CanalPedido;

  entrada: EntradaPedido;

  cliente: string;

  telefone: string;

  clienteEncontrado: boolean;

  clienteCompleto:
    | Cliente
    | null;

  enderecoSelecionado:
    | AddressSearchResult
    | null;

  numero: string;

  complemento: string;

  distanciaEntregaKm:
    | number
    | null;

  taxaEntrega: number;

  entrega: DeliveryCalculation;

  formaPagamento: FormaPagamento;

  statusPagamento:
    StatusPagamento;

  cobrancaNoPdvHabilitada:
    boolean;

  pedidoPodeSerLancado:
    boolean;

  onBuscarCliente: () => void;

  onCadastrarCliente: () => void;

  onSelecionarEnderecoSalvo: (
    endereco: EnderecoCliente
  ) => void;

  onNovoEndereco: () => void;

  onOrigemChange: (
    origem: CanalPedido
  ) => void;

  onEntradaChange: (
    entrada: EntradaPedido
  ) => void;

  onClienteChange: (
    valor: string
  ) => void;

  onTelefoneChange: (
    valor: string
  ) => void;

  onFormaPagamentoChange: (
    valor: FormaPagamento
  ) => void;

  onStatusPagamentoChange: (
    valor: StatusPagamento
  ) => void;

  onAlterarQuantidade: (
    produtoId: string,
    quantidade: number
  ) => void;

  onRemover: (
    produtoId: string
  ) => void;

  onLancarPedido: () => void;
}

function normalizarTexto(
  valor?: string
): string {
  return (
    valor
      ?.trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      ) ?? ""
  );
}

function nomeRotulo(
  rotulo: RotuloEndereco
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
  }
}

function obterNomeEntrada(
  entrada: EntradaPedido
) {
  switch (entrada) {
    case "MANUAL":
      return "Manual";

    case "IA":
      return "IA";

    case "ONLINE":
      return "Cardápio Online";

    case "API":
      return "Integração";

    default:
      return entrada;
  }
}

function obterNomeFormaPagamento(
  forma: FormaPagamento
) {
  switch (forma) {
    case "PIX":
      return "PIX";

    case "CARTAO":
      return "Cartão";

    case "DINHEIRO":
      return "Dinheiro";

    case "IFOOD":
      return "iFood";

    case "OUTRO":
      return "Outro";

    case "A_DEFINIR":
      return "A definir";

    default:
      return forma;
  }
}

function obterNomeStatusPagamento(
  status: StatusPagamento
) {
  switch (status) {
    case "PENDENTE":
      return "Pendente";

    case "COBRANCA_GERADA":
      return "Cobrança gerada";

    case "AGUARDANDO_PAGAMENTO":
      return "Aguardando pagamento";

    case "PROCESSANDO":
      return "Processando";

    case "APROVADO":
      return "Aprovado";

    case "RECUSADO":
      return "Recusado";

    case "CANCELADO":
      return "Cancelado";

    case "ESTORNADO":
      return "Estornado";

    case "EXPIRADO":
      return "Expirado";

    default:
      return status;
  }
}

function enderecoCombinaComResultado(
  endereco: EnderecoCliente,
  resultado: AddressSearchResult,
  numeroAtual: string
): boolean {
  const mesmoLogradouro =
    normalizarTexto(
      endereco.logradouro
    ) ===
    normalizarTexto(
      resultado.logradouro
    );

  const mesmoCep =
    Boolean(
      endereco.cep &&
      resultado.cep
    ) &&
    normalizarTexto(
      endereco.cep
    ) ===
    normalizarTexto(
      resultado.cep
    );

  const mesmoNumero =
    endereco.numero.trim() ===
    numeroAtual.trim();

  return (
    (mesmoCep ||
      mesmoLogradouro) &&
    mesmoNumero
  );
}

export default function PdvComanda({
  itens,
  origem,
  entrada,
  cliente,
  telefone,
  clienteEncontrado,
  clienteCompleto,
  enderecoSelecionado,
  numero,
  complemento,
  distanciaEntregaKm,
  taxaEntrega,
  entrega,
  formaPagamento,
  statusPagamento,
  cobrancaNoPdvHabilitada,
  pedidoPodeSerLancado,
  onBuscarCliente,
  onCadastrarCliente,
  onSelecionarEnderecoSalvo,
  onNovoEndereco,
  onOrigemChange,
  onEntradaChange,
  onClienteChange,
  onTelefoneChange,
  onFormaPagamentoChange,
  onStatusPagamentoChange,
  onAlterarQuantidade,
  onRemover,
  onLancarPedido,
}: Props) {
  const subtotal = itens.reduce(
    (total, item) =>
      total + item.subtotal,
    0
  );

  const total =
    subtotal + taxaEntrega;

  const pagamentoAprovado =
    statusPagamento ===
    "APROVADO";

  const enderecoSalvoSelecionado =
    Boolean(
      enderecoSelecionado &&
      clienteCompleto?.enderecos.some(
        (endereco) =>
          enderecoCombinaComResultado(
            endereco,
            enderecoSelecionado,
            numero
          )
      )
    );

  return (
    <aside className="flex h-[calc(100vh-5.5rem)] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-0 xl:w-[390px]">
      {/* CABEÇALHO */}
      <div className="shrink-0 border-b border-slate-200 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Comanda
            </h2>

            <p className="text-sm text-slate-500">
              {itens.length} item(ns)
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            NOVO
          </span>
        </div>
      </div>

      {/* CORPO */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="space-y-5">

          {/* ITENS */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Itens
              </h3>

              <span className="text-xs text-slate-400">
                {itens.length}
              </span>
            </div>

            <div className="space-y-3">
              {itens.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  Nenhum produto adicionado.
                </div>
              )}

              {itens.map((item) => (
                <div
                  key={
                    item.produtoId
                  }
                  className="rounded-xl border border-slate-200 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">
                        {item.nome}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        R${" "}
                        {item.precoUnitario.toFixed(
                          2
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        onRemover(
                          item.produtoId
                        )
                      }
                      className="shrink-0 text-xs font-semibold text-red-500"
                    >
                      Remover
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onAlterarQuantidade(
                            item.produtoId,
                            item.quantidade -
                              1
                          )
                        }
                        className="h-9 w-9 rounded-lg bg-slate-100 font-bold hover:bg-slate-200"
                      >
                        −
                      </button>

                      <span className="w-6 text-center font-semibold">
                        {
                          item.quantidade
                        }
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          onAlterarQuantidade(
                            item.produtoId,
                            item.quantidade +
                              1
                          )
                        }
                        className="h-9 w-9 rounded-lg bg-slate-100 font-bold hover:bg-slate-200"
                      >
                        +
                      </button>
                    </div>

                    <strong className="shrink-0 text-orange-600">
                      R${" "}
                      {item.subtotal.toFixed(
                        2
                      )}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* IDENTIFICAÇÃO */}
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Origem
            </p>

            <p className="mt-1 font-semibold text-slate-800">
              {origem}
            </p>

            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Entrada
            </p>

            <p className="mt-1 font-semibold text-slate-800">
              {obterNomeEntrada(
                entrada
              )}
            </p>
          </section>

          {/* SIMULAÇÃO */}
          <section className="rounded-xl border border-dashed border-orange-300 bg-orange-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-orange-600">
              Simulação
            </p>

            <p className="mt-1 text-xs leading-5 text-orange-700">
              Durante o desenvolvimento,
              origem e entrada podem ser
              simuladas. Em produção serão
              identificadas automaticamente.
            </p>

            <div className="mt-3 grid gap-3">
              <label className="text-sm font-semibold text-slate-700">
                Origem

                <select
                  value={origem}
                  onChange={(event) =>
                    onOrigemChange(
                      event.target
                        .value as CanalPedido
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3"
                >
                  <option value="PDV">
                    PDV
                  </option>

                  <option value="WHATSAPP">
                    WhatsApp
                  </option>

                  <option value="CARDAPIO_ONLINE">
                    Cardápio Online
                  </option>

                  <option value="IFOOD">
                    iFood
                  </option>

                  <option value="99FOOD">
                    99Food
                  </option>

                  <option value="KEETA">
                    Keeta
                  </option>
                </select>
              </label>

              <label className="text-sm font-semibold text-slate-700">
                Entrada

                <select
                  value={entrada}
                  onChange={(event) =>
                    onEntradaChange(
                      event.target
                        .value as EntradaPedido
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3"
                >
                  <option value="MANUAL">
                    Manual
                  </option>

                  <option value="IA">
                    IA
                  </option>

                  <option value="ONLINE">
                    Online
                  </option>

                  <option value="API">
                    Integração
                  </option>
                </select>
              </label>
            </div>
          </section>

          {/* CLIENTE */}
          <section>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
              Cliente
            </h3>

            <label className="block text-sm font-semibold text-slate-700">
              Telefone *

              <div className="mt-1 flex gap-2">
                <input
                  value={telefone}
                  onChange={(event) =>
                    onTelefoneChange(
                      event.target.value
                    )
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      event.preventDefault();

                      onBuscarCliente();
                    }
                  }}
                  placeholder="(92) 99999-9999"
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-orange-500"
                />

                <button
                  type="button"
                  onClick={
                    onBuscarCliente
                  }
                  className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
                >
                  Buscar
                </button>
              </div>
            </label>

            {clienteEncontrado &&
            clienteCompleto ? (
              <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-green-600">
                  Cliente encontrado
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {
                    clienteCompleto.nome
                  }
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {
                    clienteCompleto.quantidadePedidos
                  }{" "}
                  pedido(s)
                </p>
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-600">
                  Cliente não localizado.
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Após a busca, o cadastro será aberto automaticamente.
                </p>
              </div>
            )}
          </section>

          {/* ENDEREÇOS */}
          {clienteEncontrado &&
          clienteCompleto && (
            <section className="border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                  Endereço de entrega
                </h3>

                <button
                  type="button"
                  onClick={
                    onNovoEndereco
                  }
                  className="text-xs font-bold text-orange-600"
                >
                  + Novo endereço
                </button>
              </div>

              {clienteCompleto.enderecos
                .length > 0 ? (
                <div className="mt-3 space-y-2">
                  {clienteCompleto.enderecos.map(
                    (endereco) => {
                      const selecionado =
                        enderecoSalvoSelecionado &&
                        enderecoSelecionado &&
                        normalizarTexto(
                          endereco.logradouro
                        ) ===
                          normalizarTexto(
                            enderecoSelecionado.logradouro
                          ) &&
                        endereco.numero.trim() ===
                          numero.trim();

                      return (
                        <button
                          key={
                            endereco.id
                          }
                          type="button"
                          onClick={() =>
                            onSelecionarEnderecoSalvo(
                              endereco
                            )
                          }
                          className={`w-full rounded-xl border p-4 text-left transition ${
                            selecionado
                              ? "border-orange-400 bg-orange-50"
                              : "border-slate-200 bg-white hover:border-orange-300"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800">
                                  {nomeRotulo(
                                    endereco.rotulo
                                  )}
                                </span>

                                {endereco.principal && (
                                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">
                                    PRINCIPAL
                                  </span>
                                )}
                              </div>

                              <p className="mt-1 text-sm text-slate-600">
                                {
                                  endereco.logradouro
                                }
                                ,{" "}
                                {
                                  endereco.numero
                                }
                              </p>

                              <p className="text-xs text-slate-400">
                                {
                                  endereco.bairro
                                }{" "}
                                —{" "}
                                {
                                  endereco.cidade
                                }
                                /
                                {
                                  endereco.estado
                                }
                              </p>
                            </div>

                            <span className="text-xs text-orange-600">
                              {selecionado
                                ? "Selecionado"
                                : "Usar"}
                            </span>
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  Este cliente ainda não possui
                  endereços cadastrados.
                </div>
              )}

              {/* ENDEREÇO NOVO DO PEDIDO */}
              {enderecoSelecionado &&
              !enderecoSalvoSelecionado ? (
                <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-orange-600">
                    Endereço deste pedido
                  </p>

                  <p className="mt-1 font-semibold text-slate-800">
                    {
                      enderecoSelecionado.logradouro
                    }
                    , {numero}
                  </p>

                  {complemento && (
                    <p className="mt-1 text-sm text-slate-600">
                      {complemento}
                    </p>
                  )}

                  <p className="mt-1 text-xs text-slate-500">
                    {
                      enderecoSelecionado.bairro
                    }{" "}
                    —{" "}
                    {
                      enderecoSelecionado.cidade
                    }
                    /
                    {
                      enderecoSelecionado.estado
                    }
                  </p>

                  <p className="mt-2 text-xs font-semibold text-orange-700">
                    Este endereço está sendo usado nesta venda.
                  </p>

                  <button
                    type="button"
                    onClick={
                      onNovoEndereco
                    }
                    className="mt-3 text-xs font-bold text-orange-700"
                  >
                    Alterar endereço
                  </button>
                </div>
              ) : null}
            </section>
          )}

          {/* ENTREGA */}
          <section className="border-t border-slate-200 pt-4">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
              Entrega
            </h3>

            {!enderecoSelecionado ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>
                    Distância
                  </span>

                  <strong className="text-slate-400">
                    —
                  </strong>
                </div>

                <div className="mt-2 flex justify-between text-sm text-slate-500">
                  <span>
                    Taxa
                  </span>

                  <strong className="text-slate-400">
                    —
                  </strong>
                </div>

                <p className="mt-3 text-xs text-slate-400">
                  Selecione um endereço para calcular a distância e a taxa.
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>
                      Distância
                    </span>

                    <strong className="text-slate-800">
                      {distanciaEntregaKm !==
                      null
                        ? `${distanciaEntregaKm.toFixed(
                            2
                          )} km`
                        : "A calcular"}
                    </strong>
                  </div>

                  <div
                    className={`mt-3 rounded-xl px-4 py-3 text-sm font-semibold ${
                      entrega.status ===
                      "CALCULADO"
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {
                      entrega.mensagem
                    }
                  </div>

                  {entrega.regraAplicada && (
                    <p className="mt-2 text-xs text-slate-400">
                      {
                        entrega.regraAplicada
                      }
                    </p>
                  )}
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>
                      Taxa de entrega
                    </span>

                    <strong className="text-slate-800">
                      R${" "}
                      {taxaEntrega.toFixed(
                        2
                      )}
                    </strong>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* PAGAMENTO */}
          <section className="border-t border-slate-200 pt-4">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
              Pagamento
            </h3>

            {cobrancaNoPdvHabilitada ? (
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700">
                  Forma de pagamento *

                  <select
                    value={
                      formaPagamento
                    }
                    onChange={(event) =>
                      onFormaPagamentoChange(
                        event.target
                          .value as FormaPagamento
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3"
                  >
                    <option value="PIX">
                      PIX
                    </option>

                    <option value="CARTAO">
                      Cartão
                    </option>

                    <option value="DINHEIRO">
                      Dinheiro
                    </option>

                    <option value="OUTRO">
                      Outro
                    </option>
                  </select>
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Status

                  <select
                    value={
                      statusPagamento
                    }
                    onChange={(event) =>
                      onStatusPagamentoChange(
                        event.target
                          .value as StatusPagamento
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3"
                  >
                    <option value="PENDENTE">
                      Pendente
                    </option>

                    <option value="PROCESSANDO">
                      Processando
                    </option>

                    <option value="APROVADO">
                      Aprovado
                    </option>

                    <option value="RECUSADO">
                      Recusado
                    </option>

                    <option value="CANCELADO">
                      Cancelado
                    </option>
                  </select>
                </label>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Pagamento eletrônico
                    </p>

                    <p className="mt-1 font-semibold text-slate-800">
                      {
                        obterNomeFormaPagamento(
                          formaPagamento
                        )
                      }
                    </p>
                  </div>

                  <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600">
                    🔒 Bloqueado
                  </span>
                </div>

                <p className="mt-3 text-sm font-semibold text-slate-700">
                  {
                    obterNomeStatusPagamento(
                      statusPagamento
                    )
                  }
                </p>
              </div>
            )}

            <div
              className={`mt-3 rounded-xl px-4 py-3 text-sm font-semibold ${
                pagamentoAprovado
                  ? "bg-green-50 text-green-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {pagamentoAprovado
                ? "Pagamento aprovado."
                : "Aguardando pagamento aprovado."}
            </div>
          </section>
        </div>
      </div>

      {/* RODAPÉ */}
      <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-4">
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Subtotal
          </span>

          <span>
            R${" "}
            {subtotal.toFixed(
              2
            )}
          </span>
        </div>

        <div className="mt-1 flex items-center justify-between text-sm text-slate-500">
          <span>
            Entrega
          </span>

          <span>
            R${" "}
            {taxaEntrega.toFixed(
              2
            )}
          </span>
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-3">
          <span className="text-lg font-bold text-slate-900">
            Total
          </span>

          <span className="text-2xl font-bold text-orange-600">
            R${" "}
            {total.toFixed(
              2
            )}
          </span>
        </div>

        <button
          type="button"
          disabled={
            !pedidoPodeSerLancado
          }
          onClick={
            onLancarPedido
          }
          className="mt-4 w-full rounded-xl bg-orange-500 px-4 py-4 font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {pedidoPodeSerLancado
            ? "Lançar pedido"
            : "Preencha os dados para continuar"}
        </button>
      </div>
    </aside>
  );
}