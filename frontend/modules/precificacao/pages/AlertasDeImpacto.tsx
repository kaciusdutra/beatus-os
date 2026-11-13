"use client";

import { formatarMoeda } from "@/modules/fichasTecnicas/pages/dadosFichas";

import type { AvisoDeImpacto } from "../services/calcularPromocao";

import {
  CANAIS_DE_VENDA,
  type CanalDeVenda,
} from "../types/precificacao";

export interface AlertaDeImpacto {
  chave: string;

  produtoId: string;

  canal: CanalDeVenda;

  nome: string;

  preco: number;

  custoReferencia?: number;

  custoAtual: number;

  margemReferencia?: number;

  margemAtual: number;

  aviso: AvisoDeImpacto;
}

function percentual(valor: number): string {
  return `${valor.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })}%`;
}

function rotuloCanal(canal: CanalDeVenda): string {
  return (
    CANAIS_DE_VENDA.find((item) => item.chave === canal)?.rotulo ?? canal
  );
}

function mensagem(alerta: AlertaDeImpacto): string {
  const partes: string[] = [];

  const { tipos, variacaoDoCustoPercentual } = alerta.aviso;

  if (
    tipos.includes("CUSTO_SUBIU") &&
    alerta.custoReferencia !== undefined &&
    variacaoDoCustoPercentual !== undefined
  ) {
    partes.push(
      `O custo subiu de ${formatarMoeda(alerta.custoReferencia)} para ${formatarMoeda(
        alerta.custoAtual
      )} (+${percentual(variacaoDoCustoPercentual)}).`
    );
  }

  if (tipos.includes("PREJUIZO")) {
    partes.push(
      `O preço de ${formatarMoeda(alerta.preco)} dá prejuízo (margem de ${percentual(
        alerta.margemAtual
      )}).`
    );
  } else if (alerta.margemReferencia !== undefined) {
    partes.push(
      `A margem foi de ${percentual(alerta.margemReferencia)} para ${percentual(
        alerta.margemAtual
      )}.`
    );
  } else {
    partes.push(`A margem é de ${percentual(alerta.margemAtual)}.`);
  }

  if (tipos.includes("ABAIXO_DA_MINIMA")) {
    partes.push("Está abaixo da margem mínima.");
  }

  return partes.join(" ");
}

interface Props {
  alertas: AlertaDeImpacto[];

  // Guarda o custo e a margem de agora como nova referência (o preço não muda).
  onAceitar: (alerta: AlertaDeImpacto) => void;
}

// Bloco 8H: avisa quando o custo mudou desde que o preço foi fixado.
// Nunca muda o preço sozinho (regra 7.3).
export default function AlertasDeImpacto({ alertas, onAceitar }: Props) {
  if (alertas.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm">
      <h2 className="text-lg font-bold text-amber-900">
        Aviso de impacto ({alertas.length})
      </h2>

      <p className="mt-1 text-sm text-amber-800">
        O preço de venda não muda sozinho: a decisão é sua.
      </p>

      <ul className="mt-3 space-y-3">
        {alertas.map((alerta) => (
          <li
            key={alerta.chave}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-sm text-slate-800"
          >
            <span>
              <strong>{alerta.nome}</strong> · {rotuloCanal(alerta.canal)}
              <br />
              {mensagem(alerta)}
            </span>

            <button
              type="button"
              onClick={() => onAceitar(alerta)}
              className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Aceitar novo custo
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
