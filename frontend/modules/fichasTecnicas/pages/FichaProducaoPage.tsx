"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  converterSeCompativel,
} from "../services/conversaoUnidade";

import {
  escalarQuantidade,
  fatorDeEscala,
  formatarQuantidadeProducao,
  passosDoTexto,
} from "../services/fichaProducao";

import {
  carregarDadosFichas,
  ehInsumoDeEmbalagem,
  type DadosFichas,
} from "./dadosFichas";

interface Props {
  fichaId: string;
  // Quanto fazer (vem do link da ficha que usa esta).
  quantoInicial?: number;
}

interface LinhaProducao {
  id: string;
  nome: string;
  quantidade: string;
  embalagem: boolean;
  // Quando o item é outra ficha: link para a ficha de produção dela.
  link?: string;
}

// Ficha de produção: o que o funcionário lê na cozinha. NÃO mostra custo
// nem preço (regra 7.21).
export default function FichaProducaoPage({
  fichaId,
  quantoInicial,
}: Props) {
  const [dados, setDados] =
    useState<DadosFichas | null>(null);

  const [erro, setErro] = useState("");

  const [quanto, setQuanto] = useState(
    quantoInicial !== undefined
      ? String(quantoInicial)
      : ""
  );

  useEffect(() => {
    void carregarDadosFichas()
      .then((carregados) => {
        setDados(carregados);

        const ficha = carregados.fichas.find(
          (item) => item.id === fichaId
        );

        // Sem valor vindo do link, começa pela receita base.
        if (ficha && quantoInicial === undefined) {
          setQuanto(
            String(
              ficha.tipo === "PREPARACAO"
                ? (ficha.rendimento ?? 1)
                : 1
            )
          );
        }
      })
      .catch((error) =>
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar a ficha."
        )
      );
  }, [fichaId, quantoInicial]);

  const ficha = dados?.fichas.find(
    (item) => item.id === fichaId
  );

  const ehProduto = ficha?.tipo === "PRODUTO";

  const rendimentoBase = ehProduto
    ? 1
    : (ficha?.rendimento ?? 0);

  const unidadeBase = ehProduto
    ? "un"
    : (ficha?.unidadeRendimento ?? "");

  const fator = fatorDeEscala(
    Number(quanto),
    rendimentoBase
  );

  const linhas: LinhaProducao[] = useMemo(() => {
    if (!ficha || !dados) {
      return [];
    }

    return ficha.itens.map((item) => {
      const quantidadeEscalada = escalarQuantidade(
        item.quantidade,
        fator
      );

      const quantidade = formatarQuantidadeProducao(
        quantidadeEscalada,
        item.unidade
      );

      if (item.tipo === "INSUMO") {
        const insumo = dados.insumos.find(
          (candidato) => candidato.id === item.insumoId
        );

        return {
          id: item.id,
          nome: insumo?.nome ?? "Insumo não encontrado",
          quantidade,
          embalagem: insumo
            ? ehInsumoDeEmbalagem(
                insumo,
                dados.categorias
              )
            : false,
        };
      }

      const usada = dados.fichas.find(
        (candidata) => candidata.id === item.preparacaoId
      );

      // Quanto fazer da ficha usada, na unidade dela.
      const unidadeUsada =
        usada?.tipo === "PRODUTO"
          ? "un"
          : (usada?.unidadeRendimento ?? item.unidade);

      const naUnidade =
        converterSeCompativel(
          quantidadeEscalada,
          item.unidade,
          unidadeUsada
        ) ?? quantidadeEscalada;

      return {
        id: item.id,
        nome: usada?.nome ?? "Ficha não encontrada",
        quantidade,
        embalagem: false,
        link: usada
          ? `/fichas/${usada.id}/producao?quanto=${Math.round(naUnidade * 100) / 100}`
          : undefined,
      };
    });
  }, [dados, fator, ficha]);

  if (erro) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {erro}
      </p>
    );
  }

  if (!dados) {
    return (
      <p className="p-10 text-center text-sm text-slate-500">
        Carregando ficha...
      </p>
    );
  }

  if (!ficha) {
    return (
      <div className="space-y-4">
        <Link
          href="/fichas"
          className="text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          ← Fichas técnicas
        </Link>

        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Ficha técnica não encontrada.
        </p>
      </div>
    );
  }

  const ingredientes = linhas.filter(
    (linha) => !linha.embalagem
  );

  const embalagens = linhas.filter(
    (linha) => linha.embalagem
  );

  const passos = passosDoTexto(ficha.modoPreparo);

  const montagem = passosDoTexto(ficha.montagem);

  return (
    <div className="mx-auto max-w-3xl space-y-6 print:max-w-none print:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/fichas/${ficha.id}`}
          className="text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          ← Ficha técnica (com custos)
        </Link>

        <button
          type="button"
          onClick={() => window.print()}
          className="cursor-pointer rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          🖨️ Imprimir
        </button>
      </div>

      <header className="space-y-3">
        <p className="text-sm font-medium text-slate-500">
          {ehProduto ? "Produto" : "Preparação"} · ficha de
          produção
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {ficha.nome}
        </h1>

        <div className="flex flex-wrap gap-2 text-sm">
          {!ehProduto && ficha.rendimento !== undefined && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
              Receita base rende{" "}
              {formatarQuantidadeProducao(
                ficha.rendimento,
                ficha.unidadeRendimento ?? ""
              )}
            </span>
          )}

          {ficha.tempoPreparoMin !== undefined && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
              Tempo de preparo: {ficha.tempoPreparoMin} min
            </span>
          )}

          {ficha.validadeDias !== undefined && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
              Validade depois de pronto: {ficha.validadeDias}{" "}
              {ficha.validadeDias === 1 ? "dia" : "dias"}
            </span>
          )}

          {ficha.porcaoQuantidade !== undefined && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
              Porção:{" "}
              {formatarQuantidadeProducao(
                ficha.porcaoQuantidade,
                ficha.porcaoUnidade ?? ""
              )}
            </span>
          )}
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 print:border-slate-400">
        <label
          htmlFor="quanto"
          className="block text-sm font-semibold text-slate-700"
        >
          {ehProduto
            ? "Quantas unidades vou fazer?"
            : "Quanto vou fazer?"}
        </label>

        <div className="mt-2 flex items-center gap-3">
          <input
            id="quanto"
            type="number"
            min="0"
            step="any"
            value={quanto}
            onChange={(evento) =>
              setQuanto(evento.target.value)
            }
            className="w-36 rounded-xl border border-slate-300 px-4 py-2.5 text-lg font-semibold outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 print:border-0 print:px-0"
          />

          <span className="text-lg font-semibold text-slate-700">
            {unidadeBase}
          </span>

          {fator !== 1 && (
            <span className="text-sm text-slate-500">
              (receita multiplicada por{" "}
              {fator.toLocaleString("pt-BR", {
                maximumFractionDigits: 3,
              })}
              )
            </span>
          )}
        </div>

        <p className="mt-2 text-xs text-slate-500 print:hidden">
          As quantidades abaixo já vêm multiplicadas.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900">
          Ingredientes
        </h2>

        <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white print:border-slate-400">
          {ingredientes.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-500">
              Nenhum ingrediente cadastrado.
            </li>
          )}

          {ingredientes.map((linha) => (
            <li
              key={linha.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <span className="text-base text-slate-900">
                {linha.nome}
                {linha.link && (
                  <Link
                    href={linha.link}
                    className="ml-3 text-sm font-semibold text-sky-700 underline underline-offset-2 print:hidden"
                  >
                    Ver como fazer
                  </Link>
                )}
              </span>

              <span className="text-base font-semibold text-slate-900">
                {linha.quantidade}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {embalagens.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">
            Embalagem
          </h2>

          <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white print:border-slate-400">
            {embalagens.map((linha) => (
              <li
                key={linha.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <span className="text-base text-slate-900">
                  {linha.nome}
                </span>

                <span className="text-base font-semibold text-slate-900">
                  {linha.quantidade}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {passos.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">
            Modo de preparo
          </h2>

          <ol className="space-y-3">
            {passos.map((passo, indice) => (
              <li key={indice} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white print:border print:border-slate-900 print:bg-white print:text-slate-900">
                  {indice + 1}
                </span>

                <span className="pt-0.5 text-base text-slate-800">
                  {passo}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {montagem.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">
            Montagem
          </h2>

          <ol className="space-y-3">
            {montagem.map((passo, indice) => (
              <li key={indice} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-white print:border print:border-slate-900 print:bg-white print:text-slate-900">
                  {indice + 1}
                </span>

                <span className="pt-0.5 text-base text-slate-800">
                  {passo}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {ficha.observacoes && (
        <section className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">
            Observações
          </h2>

          <p className="whitespace-pre-line rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-slate-800 print:border-slate-400 print:bg-white">
            {ficha.observacoes}
          </p>
        </section>
      )}

      {passos.length === 0 &&
        montagem.length === 0 &&
        !ficha.observacoes && (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 print:hidden">
            Esta ficha ainda não tem modo de preparo nem
            montagem. Preencha na ficha técnica.
          </p>
        )}
    </div>
  );
}
