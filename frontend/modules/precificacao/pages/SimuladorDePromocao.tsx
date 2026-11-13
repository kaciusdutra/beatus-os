"use client";

import { useState } from "react";

import { formatarMoeda } from "@/modules/fichasTecnicas/pages/dadosFichas";

import {
  compararComboComAvulso,
  descontoMaximoDoCombo,
  economiaDoCombo,
  parametrosDoCanal,
  simularPromocao,
  type Promocao,
} from "../services/calcularPromocao";

import {
  CANAIS_DE_VENDA,
  type CanalPrecificacaoDados,
  type ParametrosPrecificacao,
  type PrecoDoProduto,
} from "../types/precificacao";

export interface LinhaSimulavel {
  produtoId: string;

  nome: string;

  // Custo da ficha; indefinido quando a ficha está incompleta.
  custoFicha?: number;

  // Produtos que compõem este (quando é um combo).
  componentes: {
    produtoId: string;
    nome: string;
    quantidade: number;
    // Opção de escolha do cliente (mesmo nome = o cliente escolhe uma).
    grupo?: string;
  }[];
}

interface Props {
  linhas: LinhaSimulavel[];

  parametros: ParametrosPrecificacao;

  canais: CanalPrecificacaoDados[];

  precos: PrecoDoProduto[];

  custoFixoPorPedido: number;
}

const CLASSE_CAMPO =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

function percentual(valor: number): string {
  return `${valor.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })}%`;
}

// Bloco 8H: simula uma promoção (desconto em % ou preço) em todos os canais
// e mostra o desconto real de um combo. Não grava nada.
export default function SimuladorDePromocao({
  linhas,
  parametros,
  canais,
  precos,
  custoFixoPorPedido,
}: Props) {
  const [produtoId, setProdutoId] = useState("");

  const [tipo, setTipo] = useState<Promocao["tipo"]>("PERCENTUAL");

  const [valor, setValor] = useState("");

  const linha = linhas.find((item) => item.produtoId === produtoId);

  const numero = Number(valor.replace(",", ".") || 0);

  const promocao: Promocao = { tipo, valor: numero };

  // Em grupo de escolha, o cliente leva uma opção: conta a de maior custo,
  // como no custo do combo.
  function componentesContados(
    componentes: LinhaSimulavel["componentes"]
  ): LinhaSimulavel["componentes"] {
    const maisCaroDoGrupo = new Map<
      string,
      LinhaSimulavel["componentes"][number]
    >();

    const custoDe = (produto: string) =>
      linhas.find((outra) => outra.produtoId === produto)?.custoFicha ?? 0;

    for (const componente of componentes) {
      if (!componente.grupo) {
        continue;
      }

      const atual = maisCaroDoGrupo.get(componente.grupo);

      if (
        !atual ||
        custoDe(componente.produtoId) > custoDe(atual.produtoId)
      ) {
        maisCaroDoGrupo.set(componente.grupo, componente);
      }
    }

    return componentes.filter(
      (componente) =>
        !componente.grupo ||
        maisCaroDoGrupo.get(componente.grupo) === componente
    );
  }

  function precoPraticado(id: string, canal: string): number | undefined {
    return precos.find(
      (preco) => preco.produtoId === id && preco.canal === canal
    )?.preco;
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-bold text-slate-900">
          Simulador de promoção
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Veja o efeito de um desconto em cada canal antes de
          publicar. Nada é gravado aqui.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label
            htmlFor="sim-produto"
            className="mb-1 block text-xs font-semibold text-slate-600"
          >
            Produto ou combo
          </label>

          <select
            id="sim-produto"
            value={produtoId}
            onChange={(evento) => setProdutoId(evento.target.value)}
            className={CLASSE_CAMPO}
          >
            <option value="">Escolha...</option>

            {linhas.map((item) => (
              <option key={item.produtoId} value={item.produtoId}>
                {item.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="sim-tipo"
            className="mb-1 block text-xs font-semibold text-slate-600"
          >
            Tipo de promoção
          </label>

          <select
            id="sim-tipo"
            value={tipo}
            onChange={(evento) =>
              setTipo(evento.target.value as Promocao["tipo"])
            }
            className={CLASSE_CAMPO}
          >
            <option value="PERCENTUAL">Desconto em %</option>

            <option value="PRECO">Preço promocional (R$)</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="sim-valor"
            className="mb-1 block text-xs font-semibold text-slate-600"
          >
            {tipo === "PERCENTUAL" ? "Desconto (%)" : "Preço (R$)"}
          </label>

          <input
            id="sim-valor"
            value={valor}
            onChange={(evento) => setValor(evento.target.value)}
            placeholder={tipo === "PERCENTUAL" ? "Ex.: 15" : "Ex.: 39,90"}
            className={CLASSE_CAMPO}
          />
        </div>
      </div>

      {linha && linha.custoFicha === undefined && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          A ficha deste produto está incompleta: falta custo em algum
          item.
        </p>
      )}

      {linha && linha.custoFicha !== undefined && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-2 pr-4">Canal</th>
                <th className="py-2 pr-4 text-right">Preço normal</th>
                <th className="py-2 pr-4 text-right">Na promoção</th>
                <th className="py-2 pr-4 text-right">Margem</th>
                <th className="py-2 pr-4 text-right">Lucro por pedido</th>
                <th className="py-2 pr-4 text-right">
                  Pedidos a mais para compensar
                </th>
                <th className="py-2">Situação</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {CANAIS_DE_VENDA.map((item) => {
                const canal = canais.find((c) => c.canal === item.chave);

                const normal = precoPraticado(linha.produtoId, item.chave);

                if (!canal || normal === undefined) {
                  return (
                    <tr key={item.chave}>
                      <td className="py-2 pr-4 font-medium text-slate-800">
                        {item.rotulo}
                      </td>

                      <td
                        colSpan={6}
                        className="py-2 text-slate-400"
                      >
                        Sem preço praticado neste canal.
                      </td>
                    </tr>
                  );
                }

                const { percentuais, taxaCanalPorPedido } =
                  parametrosDoCanal(parametros, canal);

                const simulacao =
                  numero > 0
                    ? simularPromocao(
                        normal,
                        promocao,
                        {
                          custoFicha: linha.custoFicha as number,
                          embalagemPedido: parametros.embalagemPedido,
                          custoFixoPorPedido,
                          itensPorPedido:
                            parametros.itensPorPedidoEstimados,
                          taxaCanalPorPedido,
                        },
                        percentuais
                      )
                    : undefined;

                const margem = simulacao?.promocional.margemPercentual;

                return (
                  <tr key={item.chave}>
                    <td className="py-2 pr-4 font-medium text-slate-800">
                      {item.rotulo}
                    </td>

                    <td className="py-2 pr-4 text-right">
                      {formatarMoeda(normal)}
                    </td>

                    <td className="py-2 pr-4 text-right font-semibold">
                      {simulacao
                        ? `${formatarMoeda(simulacao.precoPromocional)} (−${percentual(
                            simulacao.descontoPercentual
                          )})`
                        : "—"}
                    </td>

                    <td className="py-2 pr-4 text-right">
                      {simulacao
                        ? `${percentual(
                            simulacao.normal.margemPercentual
                          )} → ${percentual(margem as number)}`
                        : "—"}
                    </td>

                    <td className="py-2 pr-4 text-right">
                      {simulacao
                        ? `${formatarMoeda(
                            simulacao.normal.lucro
                          )} → ${formatarMoeda(simulacao.promocional.lucro)}`
                        : "—"}
                    </td>

                    <td className="py-2 pr-4 text-right">
                      {simulacao
                        ? simulacao.volumeParaCompensarPercentual ===
                          undefined
                          ? "nenhum volume compensa"
                          : `+${percentual(
                              simulacao.volumeParaCompensarPercentual
                            )}`
                        : "—"}
                    </td>

                    <td className="py-2">
                      {simulacao && margem !== undefined && (
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            margem < 0
                              ? "bg-red-100 text-red-800"
                              : margem < parametros.margemMinimaPercentual
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {margem < 0
                            ? "prejuízo"
                            : margem < parametros.margemMinimaPercentual
                              ? "abaixo da mínima"
                              : "dentro da meta"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {linha && linha.componentes.length > 0 && (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-bold text-slate-800">
            Desconto do combo para o cliente
          </h3>

          <p className="text-xs text-slate-500">
            Compara o preço do combo com a soma dos itens vendidos
            separados, no mesmo canal.
          </p>

          <ul className="space-y-1 text-sm text-slate-700">
            {CANAIS_DE_VENDA.map((item) => {
              const precoCombo = precoPraticado(linha.produtoId, item.chave);

              if (precoCombo === undefined) {
                return null;
              }

              const contados = componentesContados(linha.componentes);

              const faltando = contados.filter(
                (componente) =>
                  precoPraticado(componente.produtoId, item.chave) ===
                  undefined
              );

              if (faltando.length > 0) {
                return (
                  <li key={item.chave}>
                    <strong>{item.rotulo}:</strong> falta o preço avulso de{" "}
                    {faltando.map((componente) => componente.nome).join(", ")}.
                  </li>
                );
              }

              const economia = economiaDoCombo(
                contados.flatMap((componente) =>
                  Array.from({ length: Math.max(1, componente.quantidade) }, () =>
                    precoPraticado(componente.produtoId, item.chave) as number
                  )
                ),
                precoCombo
              );

              const canalDados = canais.find((c) => c.canal === item.chave);

              const custosDe = (custoFicha: number) => ({
                custoFicha,
                embalagemPedido: parametros.embalagemPedido,
                custoFixoPorPedido,
                itensPorPedido: parametros.itensPorPedidoEstimados,
                taxaCanalPorPedido: canalDados
                  ? parametrosDoCanal(parametros, canalDados)
                      .taxaCanalPorPedido
                  : 0,
              });

              const percentuaisDoCanal = canalDados
                ? parametrosDoCanal(parametros, canalDados).percentuais
                : undefined;

              const custoDoCombo = linha.custoFicha;

              const avulsos = contados.flatMap((componente) => {
                const dadosDoComponente = linhas.find(
                  (outra) => outra.produtoId === componente.produtoId
                );

                const preco = precoPraticado(
                  componente.produtoId,
                  item.chave
                );

                return dadosDoComponente?.custoFicha !== undefined &&
                  preco !== undefined
                  ? Array.from(
                      { length: Math.max(1, componente.quantidade) },
                      () => ({
                        preco,
                        custos: custosDe(
                          dadosDoComponente.custoFicha as number
                        ),
                      })
                    )
                  : [];
              });

              const maximo =
                economia && percentuaisDoCanal && custoDoCombo !== undefined
                  ? descontoMaximoDoCombo(
                      economia.somaAvulsa,
                      custosDe(custoDoCombo),
                      percentuaisDoCanal,
                      parametros.margemMinimaPercentual
                    )
                  : undefined;

              const comparacao =
                percentuaisDoCanal && custoDoCombo !== undefined
                  ? compararComboComAvulso(
                      { preco: precoCombo, custos: custosDe(custoDoCombo) },
                      avulsos,
                      percentuaisDoCanal
                    )
                  : undefined;

              return (
                <li key={item.chave}>
                  <strong>{item.rotulo}:</strong>{" "}
                  {economia
                    ? `avulso ${formatarMoeda(economia.somaAvulsa)}, combo ${formatarMoeda(
                        economia.precoCombo
                      )}: o cliente economiza ${formatarMoeda(
                        economia.economiaReais
                      )} (${percentual(economia.economiaPercentual)}).`
                    : "sem dados para comparar."}

                  {maximo && (
                    <span className="block text-xs text-slate-500">
                      Desconto máximo mantendo a margem mínima:{" "}
                      {formatarMoeda(maximo.descontoMaximoReais)} (
                      {percentual(maximo.descontoMaximoPercentual)}); o
                      combo não deve ficar abaixo de{" "}
                      {formatarMoeda(maximo.precoMinimo)}.
                    </span>
                  )}

                  {comparacao && (
                    <span className="block text-xs text-slate-500">
                      Margem do combo {percentual(comparacao.margemCombo)}{" "}
                      contra {percentual(comparacao.margemAvulsa)} dos itens
                      vendidos separados (
                      {comparacao.diferencaEmPontos >= 0 ? "+" : ""}
                      {comparacao.diferencaEmPontos.toLocaleString("pt-BR", {
                        maximumFractionDigits: 1,
                      })}{" "}
                      pontos).
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {!linha && (
        <p className="text-sm text-slate-500">
          Escolha um produto para simular. Ele precisa ter preço
          praticado no canal.
        </p>
      )}
    </section>
  );
}
