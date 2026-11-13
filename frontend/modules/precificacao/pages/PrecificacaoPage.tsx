"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Link from "next/link";

import {
  calcularCustoFichaTecnica,
  type ResultadoCustoFichaTecnica,
} from "@/modules/fichasTecnicas/services/calcularCustoFichaTecnica";

import {
  carregarDadosFichas,
  formatarMoeda,
  montarContextoCusto,
  type DadosFichas,
} from "@/modules/fichasTecnicas/pages/dadosFichas";

import {
  custoTotalDoProduto,
  precoComercial,
  precoParaMargem,
  resultadoDoPreco,
} from "../services/calcularPreco";

import {
  avisoDeImpacto,
  parametrosDoCanal,
} from "../services/calcularPromocao";

import AlertasDeImpacto, {
  type AlertaDeImpacto,
} from "./AlertasDeImpacto";

import SimuladorDePromocao, {
  type LinhaSimulavel,
} from "./SimuladorDePromocao";

import {
  CANAIS_DE_VENDA,
  type CanalDeVenda,
  type CanalPrecificacaoDados,
  type ParametrosPrecificacao,
  type PrecoDoProduto,
} from "../types/precificacao";

const CLASSE_CAMPO =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

interface DadosPrecificacao {
  parametros: ParametrosPrecificacao;
  canais: CanalPrecificacaoDados[];
  precos: PrecoDoProduto[];
  custoFixoPorPedido: number;
}

interface FormParametros {
  imposto: string;
  taxaPagamento: string;
  embalagem: string;
  itens: string;
  margens: string;
  minima: string;
}

interface FormCanal {
  comissao: string;
  taxaMensal: string;
  pedidos: string;
}

function numero(texto: string): number {
  return Number(texto.replace(",", ".") || 0);
}

function texto(valor: number): string {
  return String(valor).replace(".", ",");
}

function percentualTexto(valor: number): string {
  return `${valor.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })}%`;
}

export default function PrecificacaoPage() {
  const [fichas, setFichas] = useState<DadosFichas | null>(null);

  const [dados, setDados] = useState<DadosPrecificacao | null>(null);

  const [erro, setErro] = useState("");

  const [aviso, setAviso] = useState("");

  const [canalAtivo, setCanalAtivo] = useState<CanalDeVenda>("SITE");

  const [formParametros, setFormParametros] =
    useState<FormParametros | null>(null);

  const [formCanais, setFormCanais] = useState<
    Record<string, FormCanal>
  >({});

  // Preço praticado digitado, por "produtoId|canal".
  const [precosDigitados, setPrecosDigitados] = useState<
    Record<string, string>
  >({});

  const [mostrarParametros, setMostrarParametros] = useState(false);

  const carregar = useCallback(async () => {
    const [resposta, dadosFichas] = await Promise.all([
      fetch("/api/precificacao", { cache: "no-store" }).then((r) =>
        r.json()
      ),
      carregarDadosFichas(),
    ]);

    if (!resposta.sucesso) {
      throw new Error(
        resposta.mensagem || "Não foi possível carregar a precificação."
      );
    }

    const carregados: DadosPrecificacao = {
      parametros: resposta.parametros,
      canais: resposta.canais,
      precos: resposta.precos,
      custoFixoPorPedido: resposta.custoFixoPorPedido,
    };

    setFichas(dadosFichas);

    setDados(carregados);

    setFormParametros({
      imposto: texto(carregados.parametros.impostoPercentual),
      taxaPagamento: texto(carregados.parametros.taxaPagamentoPercentual),
      embalagem: texto(carregados.parametros.embalagemPedido),
      itens: texto(carregados.parametros.itensPorPedidoEstimados),
      margens: carregados.parametros.margensCenario.join(", "),
      minima: texto(carregados.parametros.margemMinimaPercentual),
    });

    setFormCanais(
      Object.fromEntries(
        carregados.canais.map((canal) => [
          canal.canal,
          {
            comissao: texto(canal.comissaoPercentual),
            taxaMensal: texto(canal.taxaMensal),
            pedidos: String(canal.pedidosMensaisEstimados),
          },
        ])
      )
    );

    setPrecosDigitados(
      Object.fromEntries(
        carregados.precos.map((preco) => [
          `${preco.produtoId}|${preco.canal}`,
          texto(preco.preco),
        ])
      )
    );
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await carregar();
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar a precificação."
        );
      }
    })();
  }, [carregar]);

  async function enviar(
    url: string,
    corpo: unknown,
    padrao: string
  ): Promise<void> {
    const resposta = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });

    const retorno = await resposta.json();

    if (!resposta.ok || !retorno.sucesso) {
      throw new Error(retorno.mensagem || padrao);
    }
  }

  async function salvarParametrosECanais() {
    if (!formParametros) {
      return;
    }

    try {
      setErro("");
      setAviso("");

      await enviar(
        "/api/precificacao/parametros",
        {
          impostoPercentual: numero(formParametros.imposto),
          taxaPagamentoPercentual: numero(formParametros.taxaPagamento),
          embalagemPedido: numero(formParametros.embalagem),
          itensPorPedidoEstimados: numero(formParametros.itens),
          margensCenario: formParametros.margens,
          margemMinimaPercentual: numero(formParametros.minima),
        },
        "Não foi possível salvar os parâmetros."
      );

      for (const canal of CANAIS_DE_VENDA) {
        const form = formCanais[canal.chave];

        if (!form) {
          continue;
        }

        await enviar(
          "/api/precificacao/canais",
          {
            canal: canal.chave,
            comissaoPercentual: numero(form.comissao),
            taxaMensal: numero(form.taxaMensal),
            pedidosMensaisEstimados: Number(form.pedidos || 0),
            ativo: true,
          },
          "Não foi possível salvar os canais."
        );
      }

      await carregar();

      setAviso("Parâmetros e canais salvos.");
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar."
      );
    }
  }

  async function salvarPreco(
    produtoId: string,
    valor: string,
    referencia?: { custo: number; margem: number },
    opcoes?: { canal?: CanalDeVenda; forcar?: boolean }
  ) {
    const canal = opcoes?.canal ?? canalAtivo;

    // Sair do campo sem mudar o preço não pode apagar a referência do aviso.
    const anterior = dados?.precos.find(
      (preco) => preco.produtoId === produtoId && preco.canal === canal
    );

    if (
      !opcoes?.forcar &&
      valor.trim() !== "" &&
      anterior &&
      anterior.preco === Math.round(numero(valor) * 100) / 100
    ) {
      return;
    }

    if (!opcoes?.forcar && valor.trim() === "" && !anterior) {
      return;
    }

    try {
      setErro("");
      setAviso("");

      await enviar(
        "/api/precificacao/precos",
        {
          produtoId,
          canal,
          preco: valor.trim() === "" ? null : numero(valor),
          custoReferencia: referencia?.custo ?? null,
          margemReferencia: referencia?.margem ?? null,
        },
        "Não foi possível salvar o preço."
      );

      await carregar();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o preço."
      );
    }
  }

  function usarPreco(
    produtoId: string,
    preco: number,
    referencia?: { custo: number; margem: number }
  ) {
    const valor = texto(preco);

    setPrecosDigitados((anterior) => ({
      ...anterior,
      [`${produtoId}|${canalAtivo}`]: valor,
    }));

    void salvarPreco(produtoId, valor, referencia);
  }

  // Custo de cada ficha de produto, com os insumos atuais.
  const custos = useMemo(() => {
    const mapa = new Map<string, ResultadoCustoFichaTecnica>();

    if (!fichas) {
      return mapa;
    }

    const contexto = montarContextoCusto(fichas, fichas.fichas);

    const cache = new Map<string, ResultadoCustoFichaTecnica>();

    for (const ficha of fichas.fichas) {
      mapa.set(
        ficha.id,
        calcularCustoFichaTecnica(ficha, contexto, [], cache)
      );
    }

    return mapa;
  }, [fichas]);

  const linhas = useMemo(() => {
    if (!fichas) {
      return [];
    }

    return fichas.fichas
      .filter(
        (ficha) =>
          ficha.tipo === "PRODUTO" && ficha.ativo && ficha.produtoId
      )
      .map((ficha) => ({
        ficha,
        produtoId: ficha.produtoId as string,
        custo: custos.get(ficha.id),
      }))
      .sort((a, b) => a.ficha.nome.localeCompare(b.ficha.nome, "pt-BR"));
  }, [fichas, custos]);

  if (erro && !dados) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {erro}
      </p>
    );
  }

  if (!dados || !formParametros || !fichas) {
    return (
      <p className="p-10 text-center text-sm text-slate-500">
        Carregando precificação...
      </p>
    );
  }

  const parametros = dados.parametros;

  const canal =
    dados.canais.find((item) => item.canal === canalAtivo) ??
    dados.canais[0];

  // Produtos de cada combo: itens da ficha que são fichas de outro produto.
  const linhasSimulaveis: LinhaSimulavel[] = (() => {
    if (!fichas) {
      return [];
    }

    return linhas.map(({ ficha, produtoId, custo }) => ({
      produtoId,
      nome: ficha.nome,
      custoFicha: custo?.completo ? custo.custoTotal : undefined,
      componentes: ficha.itens.flatMap((item) => {
        const usada =
          item.tipo === "PREPARACAO"
            ? fichas.fichas.find(
                (candidata) => candidata.id === item.preparacaoId
              )
            : undefined;

        return usada?.tipo === "PRODUTO" && usada.produtoId
          ? [
              {
                produtoId: usada.produtoId,
                nome: usada.nome,
                quantidade: item.quantidade,
              },
            ]
          : [];
      }),
    }));
  })();

  // Aviso de impacto: o custo mudou desde que o preço foi fixado.
  const alertas: AlertaDeImpacto[] = (() => {
    if (!dados) {
      return [];
    }

    const lista: AlertaDeImpacto[] = [];

    for (const preco of dados.precos) {
      const linha = linhas.find(
        (item) => item.produtoId === preco.produtoId
      );

      const canalDoPreco = dados.canais.find(
        (item) => item.canal === preco.canal
      );

      if (!linha || !linha.custo?.completo || !canalDoPreco) {
        continue;
      }

      const parametrosCanal = parametrosDoCanal(
        dados.parametros,
        canalDoPreco
      );

      const custosPedido = {
        custoFicha: linha.custo.custoTotal,
        embalagemPedido: dados.parametros.embalagemPedido,
        custoFixoPorPedido: dados.custoFixoPorPedido,
        itensPorPedido: dados.parametros.itensPorPedidoEstimados,
        taxaCanalPorPedido: parametrosCanal.taxaCanalPorPedido,
      };

      const resultadoAtual = resultadoDoPreco(
        preco.preco,
        custosPedido,
        parametrosCanal.percentuais
      );

      if (!resultadoAtual) {
        continue;
      }

      const custoAtual = custoTotalDoProduto(custosPedido);

      const aviso = avisoDeImpacto({
        custoReferencia: preco.custoReferencia,
        margemReferencia: preco.margemReferencia,
        custoAtual,
        margemAtual: resultadoAtual.margemPercentual,
        margemMinimaPercentual: dados.parametros.margemMinimaPercentual,
      });

      if (aviso) {
        lista.push({
          chave: `${preco.produtoId}|${preco.canal}`,
          produtoId: preco.produtoId,
          canal: preco.canal,
          nome: linha.ficha.nome,
          preco: preco.preco,
          custoReferencia: preco.custoReferencia,
          custoAtual,
          margemReferencia: preco.margemReferencia,
          margemAtual: resultadoAtual.margemPercentual,
          aviso,
        });
      }
    }

    return lista;
  })();

  const taxaCanalPorPedido =
    canal.pedidosMensaisEstimados > 0
      ? canal.taxaMensal / canal.pedidosMensaisEstimados
      : 0;

  const percentuais = {
    comissaoPercentual: canal.comissaoPercentual,
    impostoPercentual: parametros.impostoPercentual,
    taxaPagamentoPercentual: parametros.taxaPagamentoPercentual,
  };

  const semPercentuais =
    parametros.impostoPercentual === 0 &&
    parametros.taxaPagamentoPercentual === 0 &&
    dados.canais.every((item) => item.comissaoPercentual === 0);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/financeiro"
          className="text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          ← Financeiro
        </Link>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Precificação
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          O preço sai do custo das suas fichas, mais a embalagem do
          pedido, o custo fixo e as taxas do canal. A margem é
          líquida: o lucro que sobra do preço depois de todos os
          custos, da comissão, do imposto e da taxa de pagamento.
          Digite um preço para ver a margem na hora, inclusive para
          promoções.
        </p>
      </div>

      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      {aviso && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {aviso}
        </div>
      )}

      {semPercentuais && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Os percentuais ainda estão em zero (imposto, taxa de
          pagamento e comissões). Preencha em &quot;Parâmetros e
          canais&quot; para os preços refletirem a realidade.
        </div>
      )}

      <AlertasDeImpacto
        alertas={alertas}
        onAceitar={(alerta) =>
          void salvarPreco(
            alerta.produtoId,
            texto(alerta.preco),
            {
              custo: alerta.custoAtual,
              margem: alerta.margemAtual,
            },
            { canal: alerta.canal, forcar: true }
          )
        }
      />

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setMostrarParametros((valor) => !valor)}
          className="flex w-full cursor-pointer items-center justify-between p-5 text-left"
        >
          <span className="text-lg font-bold text-slate-900">
            Parâmetros e canais
          </span>

          <span className="text-sm text-slate-500">
            {mostrarParametros ? "Esconder" : "Mostrar"}
          </span>
        </button>

        {mostrarParametros && (
          <div className="space-y-6 border-t border-slate-200 p-5">
            <div className="grid gap-4 md:grid-cols-3">
              {(
                [
                  ["imposto", "Imposto sobre a venda (%)"],
                  ["taxaPagamento", "Taxa de pagamento (%)"],
                  ["embalagem", "Embalagem do pedido (R$)"],
                  ["itens", "Produtos por pedido (média)"],
                  ["margens", "Margens para comparar (%)"],
                  ["minima", "Margem mínima (%)"],
                ] as const
              ).map(([chave, rotulo]) => (
                <div key={chave}>
                  <label
                    htmlFor={`par-${chave}`}
                    className="mb-1 block text-xs font-semibold text-slate-600"
                  >
                    {rotulo}
                  </label>

                  <input
                    id={`par-${chave}`}
                    value={formParametros[chave]}
                    onChange={(evento) =>
                      setFormParametros({
                        ...formParametros,
                        [chave]: evento.target.value,
                      })
                    }
                    className={CLASSE_CAMPO}
                  />
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-500">
              Custo fixo por pedido (da tela{" "}
              <Link
                href="/financeiro/custos-fixos"
                className="font-semibold text-sky-700 underline"
              >
                Custos fixos
              </Link>
              ): {formatarMoeda(dados.custoFixoPorPedido)}. Ele é
              dividido pelos produtos por pedido, assim como a
              embalagem do pedido.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">Canal</th>
                    <th className="py-2 pr-4">Comissão (%)</th>
                    <th className="py-2 pr-4">Taxa por mês (R$)</th>
                    <th className="py-2">Pedidos por mês no canal</th>
                  </tr>
                </thead>

                <tbody>
                  {CANAIS_DE_VENDA.map((item) => (
                    <tr key={item.chave}>
                      <td className="py-1 pr-4 font-medium text-slate-800">
                        {item.rotulo}
                      </td>

                      {(
                        ["comissao", "taxaMensal", "pedidos"] as const
                      ).map((campo) => (
                        <td key={campo} className="py-1 pr-4">
                          <input
                            aria-label={`${item.rotulo} ${campo}`}
                            value={formCanais[item.chave]?.[campo] ?? ""}
                            onChange={(evento) =>
                              setFormCanais({
                                ...formCanais,
                                [item.chave]: {
                                  ...(formCanais[item.chave] ?? {
                                    comissao: "",
                                    taxaMensal: "",
                                    pedidos: "",
                                  }),
                                  [campo]: evento.target.value,
                                },
                              })
                            }
                            className={`${CLASSE_CAMPO} max-w-36`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={() => void salvarParametrosECanais()}
              className="cursor-pointer rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Salvar parâmetros e canais
            </button>
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        {CANAIS_DE_VENDA.map((item) => (
          <button
            key={item.chave}
            type="button"
            onClick={() => setCanalAtivo(item.chave)}
            className={`cursor-pointer rounded-xl border px-4 py-2 text-sm font-semibold ${
              canalAtivo === item.chave
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {item.rotulo}
          </button>
        ))}
      </div>

      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3 text-right">Custo da ficha</th>
              <th className="px-4 py-3 text-right">Custo total</th>
              <th className="px-4 py-3">Preço praticado</th>
              <th className="px-4 py-3 text-right">Margem</th>
              <th className="px-4 py-3 text-right">CMV</th>
              <th className="px-4 py-3 text-right">Markup</th>
              {parametros.margensCenario.map((margem) => (
                <th key={margem} className="px-4 py-3 text-right">
                  Preço p/ {percentualTexto(margem)}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {linhas.length === 0 && (
              <tr>
                <td
                  colSpan={7 + parametros.margensCenario.length}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  Nenhum produto com ficha técnica ativa ainda. Monte
                  as fichas em{" "}
                  <Link
                    href="/fichas"
                    className="font-semibold text-sky-700 underline"
                  >
                    Fichas técnicas
                  </Link>
                  .
                </td>
              </tr>
            )}

            {linhas.map(({ ficha, produtoId, custo }) => {
              const completo = Boolean(custo?.completo);

              const custos = completo
                ? {
                    custoFicha: custo?.custoTotal ?? 0,
                    embalagemPedido: parametros.embalagemPedido,
                    custoFixoPorPedido: dados.custoFixoPorPedido,
                    itensPorPedido: parametros.itensPorPedidoEstimados,
                    taxaCanalPorPedido,
                  }
                : undefined;

              const digitado =
                precosDigitados[`${produtoId}|${canalAtivo}`] ?? "";

              const resultado =
                custos && digitado.trim() !== ""
                  ? resultadoDoPreco(
                      numero(digitado),
                      custos,
                      percentuais
                    )
                  : undefined;

              const referenciaDe = (preco: number) => {
                const resultadoDoValor = custos
                  ? resultadoDoPreco(preco, custos, percentuais)
                  : undefined;

                return custos && resultadoDoValor
                  ? {
                      custo: custoTotalDoProduto(custos),
                      margem: resultadoDoValor.margemPercentual,
                    }
                  : undefined;
              };

              const abaixoDaMinima =
                resultado !== undefined &&
                resultado.margemPercentual <
                  parametros.margemMinimaPercentual;

              return (
                <tr key={ficha.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <Link
                      href={`/fichas/${ficha.id}`}
                      className="hover:underline"
                    >
                      {ficha.nome}
                    </Link>

                    {!completo && (
                      <p className="text-xs font-normal text-amber-700">
                        Ficha incompleta: falta custo em algum item.
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right text-slate-700">
                    {custos ? formatarMoeda(custos.custoFicha) : "—"}
                  </td>

                  <td className="px-4 py-3 text-right text-slate-700">
                    {custos
                      ? formatarMoeda(custoTotalDoProduto(custos))
                      : "—"}
                  </td>

                  <td className="px-4 py-3">
                    <input
                      aria-label={`Preço de ${ficha.nome}`}
                      value={digitado}
                      onChange={(evento) =>
                        setPrecosDigitados((anterior) => ({
                          ...anterior,
                          [`${produtoId}|${canalAtivo}`]:
                            evento.target.value,
                        }))
                      }
                      onBlur={(evento) =>
                        void salvarPreco(
                          produtoId,
                          evento.target.value,
                          referenciaDe(numero(evento.target.value))
                        )
                      }
                      placeholder="R$"
                      className={`${CLASSE_CAMPO} w-28`}
                    />
                  </td>

                  <td className="px-4 py-3 text-right">
                    {resultado ? (
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          resultado.margemPercentual < 0
                            ? "bg-red-100 text-red-800"
                            : abaixoDaMinima
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {percentualTexto(resultado.margemPercentual)}
                        {resultado.margemPercentual < 0
                          ? " · prejuízo"
                          : abaixoDaMinima
                            ? " · promoção"
                            : ""}
                      </span>
                    ) : (
                      "—"
                    )}

                    {resultado && (
                      <p className="mt-1 text-xs text-slate-500">
                        lucro {formatarMoeda(resultado.lucro)}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right text-slate-700">
                    {resultado
                      ? percentualTexto(resultado.cmvPercentual)
                      : "—"}
                  </td>

                  <td className="px-4 py-3 text-right text-slate-700">
                    {resultado?.markupPercentual !== undefined
                      ? percentualTexto(resultado.markupPercentual)
                      : "—"}
                  </td>

                  {parametros.margensCenario.map((margem) => {
                    const exato = custos
                      ? precoParaMargem(
                          custoTotalDoProduto(custos),
                          percentuais,
                          margem
                        )
                      : undefined;

                    return (
                      <td
                        key={margem}
                        className="px-4 py-3 text-right text-slate-800"
                      >
                        {exato !== undefined ? (
                          <button
                            type="button"
                            title="Usar este preço"
                            onClick={() =>
                              usarPreco(
                                produtoId,
                                precoComercial(exato),
                                referenciaDe(precoComercial(exato))
                              )
                            }
                            className="cursor-pointer rounded-lg px-2 py-1 font-semibold hover:bg-slate-100"
                          >
                            {formatarMoeda(precoComercial(exato))}
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <SimuladorDePromocao
        linhas={linhasSimulaveis}
        parametros={parametros}
        canais={dados.canais}
        precos={dados.precos}
        custoFixoPorPedido={dados.custoFixoPorPedido}
      />

      <p className="text-xs text-slate-500">
        Os preços das colunas &quot;Preço p/ margem&quot; sobem até o
        próximo final ,90. Clique em um deles para usar como preço
        praticado. Abaixo de{" "}
        {percentualTexto(parametros.margemMinimaPercentual)} de margem
        o preço aparece como promoção.
      </p>
    </div>
  );
}
