"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import type {
  PedidoDetalhe,
  PedidoListado,
  ResumoDePedidos,
} from "../types/consultaPedido";

const CLASSE_CAMPO =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500";

const STATUS: { chave: string; rotulo: string; cor: string }[] = [
  { chave: "NOVO", rotulo: "Novo", cor: "bg-sky-100 text-sky-800" },
  { chave: "EM_PREPARO", rotulo: "Em preparo", cor: "bg-amber-100 text-amber-800" },
  { chave: "PRONTO", rotulo: "Pronto", cor: "bg-emerald-100 text-emerald-800" },
  { chave: "EM_ROTA", rotulo: "Em rota", cor: "bg-violet-100 text-violet-800" },
  { chave: "ENTREGUE", rotulo: "Entregue", cor: "bg-slate-200 text-slate-700" },
  { chave: "CANCELADO", rotulo: "Cancelado", cor: "bg-red-100 text-red-800" },
];

const CANAIS = ["PDV", "WHATSAPP", "CARDAPIO_ONLINE", "IFOOD", "99FOOD", "KEETA"];

function moeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function texto(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, "0");

  const dia = String(data.getDate()).padStart(2, "0");

  return `${data.getFullYear()}-${mes}-${dia}`;
}

function diasAtras(dias: number): string {
  const data = new Date();

  data.setDate(data.getDate() - dias);

  return texto(data);
}

function EtiquetaDeStatus({ status }: { status: string }) {
  const item = STATUS.find((s) => s.chave === status);

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item?.cor ?? "bg-slate-100 text-slate-700"}`}>
      {item?.rotulo ?? status}
    </span>
  );
}

// Consulta de pedidos (todas as situações). Mudar a situação e cancelar
// continuam na Cozinha, que exige o motivo e cuida do estoque.
export default function PedidosPage() {
  const [filtros, setFiltros] = useState({
    busca: "",
    status: "",
    canal: "",
    de: diasAtras(6),
    ate: texto(new Date()),
  });

  const [pedidos, setPedidos] = useState<PedidoListado[]>([]);

  const [resumo, setResumo] = useState<ResumoDePedidos | null>(null);

  const [limitado, setLimitado] = useState(false);

  const [erro, setErro] = useState("");

  const [carregando, setCarregando] = useState(true);

  const [aberto, setAberto] = useState<string | null>(null);

  const [detalhe, setDetalhe] = useState<PedidoDetalhe | null>(null);

  const carregar = useCallback(async () => {
    const parametros = new URLSearchParams();

    for (const [chave, valor] of Object.entries(filtros)) {
      if (valor) {
        parametros.set(chave, valor);
      }
    }

    const resposta = await fetch(`/api/pedidos/historico?${parametros.toString()}`, {
      cache: "no-store",
    });

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      throw new Error(dados.mensagem || "Não foi possível consultar os pedidos.");
    }

    setPedidos(dados.pedidos ?? []);
    setResumo(dados.resumo ?? null);
    setLimitado(Boolean(dados.limitado));
  }, [filtros]);

  useEffect(() => {
    void (async () => {
      try {
        await carregar();

        setErro("");
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível consultar os pedidos.");
      } finally {
        setCarregando(false);
      }
    })();
  }, [carregar]);

  async function abrir(pedido: PedidoListado) {
    if (aberto === pedido.id) {
      setAberto(null);

      return;
    }

    setAberto(pedido.id);
    setDetalhe(null);

    try {
      const resposta = await fetch(`/api/pedidos/${pedido.id}`, { cache: "no-store" });

      const dados = await resposta.json();

      if (!resposta.ok || !dados.sucesso) {
        throw new Error(dados.mensagem || "Não foi possível ler o pedido.");
      }

      setDetalhe(dados.pedido);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível ler o pedido.");
    }
  }

  function mudar(campo: keyof typeof filtros, valor: string) {
    setFiltros({ ...filtros, [campo]: valor });
  }

  const atalhos = [
    { rotulo: "Hoje", de: texto(new Date()), ate: texto(new Date()) },
    { rotulo: "7 dias", de: diasAtras(6), ate: texto(new Date()) },
    { rotulo: "30 dias", de: diasAtras(29), ate: texto(new Date()) },
    { rotulo: "Tudo", de: "", ate: "" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">Módulo</p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Pedidos</h1>

          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Todos os pedidos, de qualquer situação. Para iniciar o preparo, marcar como pronto, despachar ou
            cancelar, use a Cozinha.
          </p>
        </div>

        <Link href="/cozinha" className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
          Abrir a Cozinha
        </Link>
      </div>

      {erro && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {atalhos.map((atalho) => (
            <button
              key={atalho.rotulo}
              type="button"
              onClick={() => setFiltros({ ...filtros, de: atalho.de, ate: atalho.ate })}
              className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-semibold ${
                filtros.de === atalho.de && filtros.ate === atalho.ate
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {atalho.rotulo}
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          <div className="md:col-span-2">
            <label htmlFor="filtro-busca" className="mb-1 block text-xs font-semibold text-slate-600">Número, cliente ou telefone</label>

            <input id="filtro-busca" value={filtros.busca} onChange={(evento) => mudar("busca", evento.target.value)} placeholder="Buscar..." className={CLASSE_CAMPO} />
          </div>

          <div>
            <label htmlFor="filtro-status" className="mb-1 block text-xs font-semibold text-slate-600">Situação</label>

            <select id="filtro-status" value={filtros.status} onChange={(evento) => mudar("status", evento.target.value)} className={CLASSE_CAMPO}>
              <option value="">Todas</option>

              {STATUS.map((item) => (
                <option key={item.chave} value={item.chave}>{item.rotulo}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filtro-canal" className="mb-1 block text-xs font-semibold text-slate-600">Canal</label>

            <select id="filtro-canal" value={filtros.canal} onChange={(evento) => mudar("canal", evento.target.value)} className={CLASSE_CAMPO}>
              <option value="">Todos</option>

              {CANAIS.map((canal) => (
                <option key={canal} value={canal}>{canal}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="filtro-de" className="mb-1 block text-xs font-semibold text-slate-600">De</label>

              <input id="filtro-de" type="date" value={filtros.de} onChange={(evento) => mudar("de", evento.target.value)} className={CLASSE_CAMPO} />
            </div>

            <div>
              <label htmlFor="filtro-ate" className="mb-1 block text-xs font-semibold text-slate-600">Até</label>

              <input id="filtro-ate" type="date" value={filtros.ate} onChange={(evento) => mudar("ate", evento.target.value)} className={CLASSE_CAMPO} />
            </div>
          </div>
        </div>
      </section>

      {resumo && (
        <p className="text-sm text-slate-600">
          <strong>{resumo.quantidade}</strong> pedido(s) · vendido <strong>{moeda(resumo.valorTotal)}</strong> (sem os
          cancelados) · ticket médio <strong>{moeda(resumo.ticketMedio)}</strong>
          {limitado ? " · mostrando só os mais recentes; refine o filtro para ver os outros" : ""}
        </p>
      )}

      {carregando && <p className="p-6 text-center text-sm text-slate-500">Carregando pedidos...</p>}

      {!carregando && pedidos.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">Nenhum pedido com esses filtros.</p>
      )}

      {pedidos.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white text-sm shadow-sm">
          {pedidos.map((pedido) => (
            <li key={pedido.id}>
              <button
                type="button"
                onClick={() => void abrir(pedido)}
                className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-3 px-5 py-3 text-left hover:bg-slate-50"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    #{pedido.numero} <span className="font-normal text-slate-500">· {pedido.cliente.nome}</span>
                  </p>

                  <p className="text-xs text-slate-500">
                    {dataHora(pedido.criadoEm)} · {pedido.canal}{pedido.codigoExterno ? ` (código ${pedido.codigoExterno})` : ""} · {pedido.quantidadeItens} item(ns)
                    {pedido.formaPagamento ? ` · ${pedido.formaPagamento}${pedido.pagamentoStatus ? ` (${pedido.pagamentoStatus.toLowerCase()})` : ""}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900">{moeda(pedido.total)}</span>

                  <EtiquetaDeStatus status={pedido.status} />
                </div>
              </button>

              {aberto === pedido.id && (
                <div className="space-y-4 border-t border-slate-100 bg-slate-50 px-5 py-4">
                  {!detalhe && <p className="text-xs text-slate-500">Carregando o pedido...</p>}

                  {detalhe && detalhe.id === pedido.id && (
                    <>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Itens</h3>

                          <ul className="mt-1 space-y-1">
                            {detalhe.itens.map((item) => (
                              <li key={item.id} className="flex justify-between gap-3">
                                <span>
                                  {item.quantidade}× {item.nome}
                                  {item.observacao && <span className="block text-xs text-amber-700">obs.: {item.observacao}</span>}
                                </span>

                                <span className="text-slate-700">{moeda(item.subtotal)}</span>
                              </li>
                            ))}
                          </ul>

                          <dl className="mt-3 space-y-0.5 border-t border-slate-200 pt-2 text-xs text-slate-600">
                            <div className="flex justify-between"><dt>Subtotal</dt><dd>{moeda(detalhe.subtotal)}</dd></div>

                            {detalhe.descontos > 0 && <div className="flex justify-between"><dt>Descontos</dt><dd>− {moeda(detalhe.descontos)}</dd></div>}

                            <div className="flex justify-between"><dt>Entrega{detalhe.distanciaEntregaKm !== undefined ? ` (${detalhe.distanciaEntregaKm} km)` : ""}</dt><dd>{moeda(detalhe.taxaEntrega)}</dd></div>

                            <div className="flex justify-between text-sm font-bold text-slate-900"><dt>Total</dt><dd>{moeda(detalhe.total)}</dd></div>
                          </dl>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Cliente e entrega</h3>

                            {detalhe.codigoExterno ? (
                              <>
                                <p>{detalhe.canal} · código {detalhe.codigoExterno}{detalhe.nomeClienteExterno ? ` · ${detalhe.nomeClienteExterno}` : ""}</p>

                                <p className="text-xs text-slate-600">
                                  {detalhe.entregaPor === "MARKETPLACE" ? "Entrega pela plataforma" : "Entrega própria"}
                                  {detalhe.liquidoEsperado !== undefined ? ` · repasse esperado ${moeda(detalhe.liquidoEsperado)}` : ""}
                                  {detalhe.conferenciaStatus === "CONFERIDO" && detalhe.valorRecebido !== undefined ? ` · conferido: recebido ${moeda(detalhe.valorRecebido)}` : detalhe.conferenciaStatus === "AGUARDANDO" ? " · aguardando conferência" : ""}
                                </p>
                              </>
                            ) : (
                              <>
                                <p>{detalhe.cliente.nome} · {detalhe.cliente.telefone}</p>

                                <p className="text-xs text-slate-600">{detalhe.endereco || "Sem endereço"}</p>
                              </>
                            )}
                          </div>

                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Pagamento</h3>

                            {detalhe.pagamentos.map((pagamento) => (
                              <p key={pagamento.id} className="text-xs text-slate-600">
                                {pagamento.forma} · {pagamento.status.toLowerCase()} · {moeda(pagamento.valor)}
                                {pagamento.aprovadoEm ? ` · aprovado em ${dataHora(pagamento.aprovadoEm)}` : ""}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Histórico</h3>

                        {detalhe.atividades.length === 0 ? (
                          <p className="text-xs text-slate-400">Sem registros.</p>
                        ) : (
                          <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                            {detalhe.atividades.map((atividade) => (
                              <li key={atividade.id}>
                                {dataHora(atividade.criadoEm)}
                                {atividade.operador ? ` · ${atividade.operador}` : ""} · {atividade.resumo}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
