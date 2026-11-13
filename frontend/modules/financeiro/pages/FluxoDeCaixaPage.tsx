"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import type {
  FluxoDeCaixa,
  LancamentoManual,
  MovimentoDeCaixa,
  TotalPorChave,
} from "../types/fluxoDeCaixa";

import {
  CATEGORIAS_DE_ENTRADA,
  CATEGORIAS_DE_SAIDA,
} from "../types/fluxoDeCaixa";

const CLASSE_CAMPO =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500";

const ROTULO_FORMA: Record<string, string> = {
  PIX: "Pix",
  DINHEIRO: "Dinheiro",
  CARTAO: "Cartão",
};

function texto(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, "0");

  const dia = String(data.getDate()).padStart(2, "0");

  return `${data.getFullYear()}-${mes}-${dia}`;
}

function moeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataLegivel(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function diasAtras(dias: number): string {
  const data = new Date();

  data.setDate(data.getDate() - dias);

  return texto(data);
}

function periodoDoMes(deslocamento: number): { de: string; ate: string } {
  const agora = new Date();

  const primeiro = new Date(agora.getFullYear(), agora.getMonth() + deslocamento, 1);

  const ultimo = new Date(agora.getFullYear(), agora.getMonth() + deslocamento + 1, 0);

  return { de: texto(primeiro), ate: texto(ultimo) };
}

function linkDoMovimento(movimento: MovimentoDeCaixa): string | null {
  if (movimento.origem === "COMPRA" && movimento.referenciaId) {
    return `/compras/entradas/${movimento.referenciaId}`;
  }

  return null;
}

function Quadro({ titulo, itens }: { titulo: string; itens: TotalPorChave[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-slate-700">{titulo}</h3>

      {itens.length === 0 ? (
        <p className="mt-2 text-xs text-slate-400">Nada no período.</p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100 text-sm">
          {itens.map((item) => (
            <li key={item.chave} className="flex justify-between gap-3 py-1.5">
              <span className="text-slate-600">{ROTULO_FORMA[item.chave] ?? item.chave}</span>

              <span className="font-semibold text-slate-900">{moeda(item.valor)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function FluxoDeCaixaPage() {
  const [periodo, setPeriodo] = useState(() => {
    const hoje = texto(new Date());

    return { de: hoje, ate: hoje };
  });

  const [fluxo, setFluxo] = useState<FluxoDeCaixa | null>(null);

  const [lancamentos, setLancamentos] = useState<LancamentoManual[]>([]);

  const [erro, setErro] = useState("");

  const [carregando, setCarregando] = useState(true);

  const [formAberto, setFormAberto] = useState(false);

  const [tipo, setTipo] = useState<"ENTRADA" | "SAIDA">("SAIDA");

  const [categoria, setCategoria] = useState(CATEGORIAS_DE_SAIDA[0]);

  const [descricao, setDescricao] = useState("");

  const [valor, setValor] = useState("");

  const [dataLancamento, setDataLancamento] = useState(() => texto(new Date()));

  const [forma, setForma] = useState("PIX");

  const [observacao, setObservacao] = useState("");

  const [cancelando, setCancelando] = useState<string | null>(null);

  const [motivo, setMotivo] = useState("");

  const carregar = useCallback(async () => {
    const resposta = await fetch(
      `/api/financeiro/fluxo?de=${periodo.de}&ate=${periodo.ate}`,
      { cache: "no-store" }
    );

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      throw new Error(dados.mensagem || "Não foi possível carregar o fluxo de caixa.");
    }

    setFluxo(dados.fluxo);
    setLancamentos(dados.lancamentos ?? []);
  }, [periodo]);

  useEffect(() => {
    void (async () => {
      try {
        await carregar();

        setErro("");
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível carregar o fluxo de caixa.");
      } finally {
        setCarregando(false);
      }
    })();
  }, [carregar]);

  async function lancar() {
    try {
      setErro("");

      const resposta = await fetch("/api/financeiro/lancamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          categoria,
          descricao,
          valor,
          data: dataLancamento,
          forma,
          observacao,
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok || !dados.sucesso) {
        throw new Error(dados.mensagem || "Não foi possível lançar.");
      }

      setDescricao("");
      setValor("");
      setObservacao("");
      setFormAberto(false);

      // Se a data lançada ficou fora do período mostrado, abre o dia dela.
      if (dataLancamento < periodo.de || dataLancamento > periodo.ate) {
        setPeriodo({ de: dataLancamento, ate: dataLancamento });
      } else {
        await carregar();
      }
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível lançar.");
    }
  }

  async function cancelar(id: string) {
    try {
      setErro("");

      const resposta = await fetch(`/api/financeiro/lancamentos/${id}/cancelar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo }),
      });

      const dados = await resposta.json();

      if (!resposta.ok || !dados.sucesso) {
        throw new Error(dados.mensagem || "Não foi possível cancelar.");
      }

      setCancelando(null);
      setMotivo("");

      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível cancelar.");
    }
  }

  function trocarTipo(novo: "ENTRADA" | "SAIDA") {
    setTipo(novo);
    setCategoria(novo === "ENTRADA" ? CATEGORIAS_DE_ENTRADA[0] : CATEGORIAS_DE_SAIDA[0]);
  }

  const atalhos = [
    { rotulo: "Hoje", valor: { de: texto(new Date()), ate: texto(new Date()) } },
    {
      rotulo: "Últimos 7 dias",
      valor: { de: diasAtras(6), ate: texto(new Date()) },
    },
    { rotulo: "Este mês", valor: periodoDoMes(0) },
    { rotulo: "Mês passado", valor: periodoDoMes(-1) },
  ];

  const canceladas = lancamentos.filter((lancamento) => lancamento.cancelado);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">Financeiro</p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Fluxo de caixa</h1>

          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            O que entrou e o que saiu no período. As entradas vêm dos pagamentos
            aprovados dos pedidos; as saídas vêm das compras confirmadas e dos
            lançamentos avulsos. Pedido cancelado não conta.
          </p>
        </div>

        <div className="flex gap-3">
          <Link href="/financeiro/custos-fixos" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
            Custos fixos
          </Link>

          <button
            type="button"
            onClick={() => setFormAberto(!formAberto)}
            className="cursor-pointer rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            + Lançamento avulso
          </button>
        </div>
      </div>

      {erro && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}

      <section className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {atalhos.map((atalho) => (
          <button
            key={atalho.rotulo}
            type="button"
            onClick={() => setPeriodo(atalho.valor)}
            className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-semibold ${
              periodo.de === atalho.valor.de && periodo.ate === atalho.valor.ate
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {atalho.rotulo}
          </button>
        ))}

        <div>
          <label htmlFor="periodo-de" className="mb-1 block text-xs font-semibold text-slate-600">De</label>

          <input id="periodo-de" type="date" value={periodo.de} onChange={(evento) => evento.target.value && setPeriodo({ ...periodo, de: evento.target.value })} className={CLASSE_CAMPO} />
        </div>

        <div>
          <label htmlFor="periodo-ate" className="mb-1 block text-xs font-semibold text-slate-600">Até</label>

          <input id="periodo-ate" type="date" value={periodo.ate} onChange={(evento) => evento.target.value && setPeriodo({ ...periodo, ate: evento.target.value })} className={CLASSE_CAMPO} />
        </div>
      </section>

      {formAberto && (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Lançamento avulso</h2>

          <p className="text-xs text-slate-500">
            Para o que não vem de pedido nem de compra: gás pago fora da nota, aporte, ajuste de caixa.
            Depois de lançado, só se cancela (com motivo); não se apaga.
          </p>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label htmlFor="l-tipo" className="mb-1 block text-xs font-semibold text-slate-600">Tipo</label>

              <select id="l-tipo" value={tipo} onChange={(evento) => trocarTipo(evento.target.value as "ENTRADA" | "SAIDA")} className={CLASSE_CAMPO}>
                <option value="SAIDA">Despesa (saiu dinheiro)</option>

                <option value="ENTRADA">Receita (entrou dinheiro)</option>
              </select>
            </div>

            <div>
              <label htmlFor="l-categoria" className="mb-1 block text-xs font-semibold text-slate-600">Categoria</label>

              <select id="l-categoria" value={categoria} onChange={(evento) => setCategoria(evento.target.value)} className={CLASSE_CAMPO}>
                {(tipo === "ENTRADA" ? CATEGORIAS_DE_ENTRADA : CATEGORIAS_DE_SAIDA).map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="l-forma" className="mb-1 block text-xs font-semibold text-slate-600">Forma</label>

              <select id="l-forma" value={forma} onChange={(evento) => setForma(evento.target.value)} className={CLASSE_CAMPO}>
                <option value="PIX">Pix</option>

                <option value="DINHEIRO">Dinheiro</option>

                <option value="CARTAO">Cartão</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="l-descricao" className="mb-1 block text-xs font-semibold text-slate-600">Descrição</label>

              <input id="l-descricao" value={descricao} onChange={(evento) => setDescricao(evento.target.value)} placeholder="Ex.: botijão de gás" className={CLASSE_CAMPO} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="l-valor" className="mb-1 block text-xs font-semibold text-slate-600">Valor (R$)</label>

                <input id="l-valor" value={valor} onChange={(evento) => setValor(evento.target.value)} placeholder="0,00" inputMode="decimal" className={CLASSE_CAMPO} />
              </div>

              <div>
                <label htmlFor="l-data" className="mb-1 block text-xs font-semibold text-slate-600">Data</label>

                <input id="l-data" type="date" value={dataLancamento} onChange={(evento) => setDataLancamento(evento.target.value)} className={CLASSE_CAMPO} />
              </div>
            </div>

            <div className="md:col-span-3">
              <label htmlFor="l-obs" className="mb-1 block text-xs font-semibold text-slate-600">Observação (opcional)</label>

              <input id="l-obs" value={observacao} onChange={(evento) => setObservacao(evento.target.value)} className={CLASSE_CAMPO} />
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => void lancar()} className="cursor-pointer rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
              Lançar
            </button>

            <button type="button" onClick={() => setFormAberto(false)} className="cursor-pointer rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Fechar
            </button>
          </div>
        </section>
      )}

      {carregando && <p className="p-6 text-center text-sm text-slate-500">Carregando...</p>}

      {fluxo && (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Entradas</p>

              <p className="mt-1 text-2xl font-bold text-emerald-900">{moeda(fluxo.entradas)}</p>
            </div>

            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-red-800">Saídas</p>

              <p className="mt-1 text-2xl font-bold text-red-900">{moeda(fluxo.saidas)}</p>
            </div>

            <div className={`rounded-2xl border p-5 ${fluxo.saldo >= 0 ? "border-slate-200 bg-white" : "border-red-300 bg-red-50"}`}>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Saldo do período</p>

              <p className={`mt-1 text-2xl font-bold ${fluxo.saldo >= 0 ? "text-slate-900" : "text-red-800"}`}>{moeda(fluxo.saldo)}</p>

              {fluxo.custosFixosPrevistos !== undefined && fluxo.saldoComPrevisto !== undefined && (
                <p className="mt-2 text-xs text-slate-500">
                  Com os custos fixos do mês ({moeda(fluxo.custosFixosPrevistos)}, ainda não pagos): <strong>{moeda(fluxo.saldoComPrevisto)}</strong>
                </p>
              )}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <Quadro titulo="Entradas por canal" itens={fluxo.entradasPorCanal} />

            <Quadro titulo="Entradas por forma de pagamento" itens={fluxo.entradasPorForma} />

            <Quadro titulo="Saídas por categoria" itens={fluxo.saidasPorCategoria} />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-bold text-slate-700">
              Movimentos ({fluxo.movimentos.length})
            </h2>

            {fluxo.movimentos.length === 0 ? (
              <p className="p-5 text-sm text-slate-400">Nenhum movimento no período.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {fluxo.movimentos.map((movimento) => {
                  const link = linkDoMovimento(movimento);

                  const lancamento = movimento.origem === "LANCAMENTO" ? lancamentos.find((item) => item.id === movimento.referenciaId) : undefined;

                  return (
                    <li key={movimento.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                      <div>
                        <p className="font-medium text-slate-900">
                          {link ? (
                            <Link href={link} className="underline">{movimento.descricao}</Link>
                          ) : (
                            movimento.descricao
                          )}
                        </p>

                        <p className="text-xs text-slate-500">
                          {dataLegivel(movimento.data)} · {movimento.categoria}
                          {movimento.canal ? ` · ${movimento.canal}` : ""}
                          {movimento.forma ? ` · ${ROTULO_FORMA[movimento.forma] ?? movimento.forma}` : ""}
                        </p>

                        {lancamento?.observacao && <p className="text-xs text-slate-400">{lancamento.observacao}</p>}
                      </div>

                      <div className="flex items-center gap-4">
                        <span className={`font-bold ${movimento.tipo === "ENTRADA" ? "text-emerald-700" : "text-red-700"}`}>
                          {movimento.tipo === "ENTRADA" ? "+" : "−"} {moeda(movimento.valor)}
                        </span>

                        {lancamento && (
                          <button type="button" onClick={() => { setCancelando(lancamento.id); setMotivo(""); }} className="cursor-pointer text-xs font-semibold text-red-700 hover:text-red-900">
                            Cancelar
                          </button>
                        )}
                      </div>

                      {cancelando === movimento.referenciaId && lancamento && (
                        <div className="flex w-full flex-wrap items-center gap-2 rounded-lg bg-red-50 p-3">
                          <input value={motivo} onChange={(evento) => setMotivo(evento.target.value)} placeholder="Motivo do cancelamento" aria-label="Motivo do cancelamento" className={`${CLASSE_CAMPO} max-w-sm`} />

                          <button type="button" onClick={() => void cancelar(lancamento.id)} className="cursor-pointer rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white hover:bg-red-800">
                            Confirmar cancelamento
                          </button>

                          <button type="button" onClick={() => setCancelando(null)} className="cursor-pointer text-xs font-semibold text-slate-600">
                            Voltar
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {canceladas.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
              <p className="font-semibold">Lançamentos cancelados no período (não contam no saldo)</p>

              <ul className="mt-1 space-y-1">
                {canceladas.map((lancamento) => (
                  <li key={lancamento.id}>
                    {lancamento.descricao}, {moeda(lancamento.valor)}. Motivo: {lancamento.motivoCancelamento}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
