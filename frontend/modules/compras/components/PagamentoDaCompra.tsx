"use client";

import { somarDias, textoDaData } from "@/modules/financeiro/services/calcularCapitalDeGiro";

import type { TipoDeTitulo } from "@/modules/financeiro/types/contasAPagar";

export interface ParcelaEmEdicao {
  vencimento: string;
  valor: string;
}

export interface PagamentoDaCompraEstado {
  condicao: "A_VISTA" | "A_PRAZO";
  forma: string;
  tipo: TipoDeTitulo;
  quantidade: string;
  primeiroVencimento: string;
  intervaloDias: string;
  parcelas: ParcelaEmEdicao[];
}

export function pagamentoInicial(): PagamentoDaCompraEstado {
  return {
    condicao: "A_VISTA",
    forma: "PIX",
    tipo: "BOLETO",
    quantidade: "1",
    primeiroVencimento: somarDias(textoDaData(new Date()), 30),
    intervaloDias: "30",
    parcelas: [],
  };
}

// Corpo enviado à confirmação da compra.
export function corpoDoPagamento(estado: PagamentoDaCompraEstado) {
  if (estado.condicao === "A_VISTA") {
    return { formaPagamento: estado.forma };
  }

  return {
    titulos: estado.parcelas.map((parcela) => ({
      tipo: estado.tipo,
      vencimento: parcela.vencimento,
      valor: parcela.valor,
    })),
  };
}

const CLASSE_CAMPO =
  "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500";

function numero(texto: string): number {
  return Number(texto.replace(",", "."));
}

function moeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PagamentoDaCompra({
  valorTotal,
  estado,
  aoMudar,
}: {
  valorTotal: number;
  estado: PagamentoDaCompraEstado;
  aoMudar: (novo: PagamentoDaCompraEstado) => void;
}) {
  function gerarParcelas() {
    const quantidade = Math.max(1, Math.min(48, Math.floor(numero(estado.quantidade) || 1)));

    const intervalo = Math.max(1, Math.floor(numero(estado.intervaloDias) || 30));

    const centavos = Math.round(valorTotal * 100);

    const base = Math.floor(centavos / quantidade);

    const resto = centavos - base * quantidade;

    const parcelas: ParcelaEmEdicao[] = Array.from({ length: quantidade }, (_, indice) => ({
      vencimento: somarDias(estado.primeiroVencimento, indice * intervalo),
      // O resto em centavos vai para a primeira parcela.
      valor: ((base + (indice === 0 ? resto : 0)) / 100).toFixed(2),
    }));

    aoMudar({ ...estado, parcelas });
  }

  function mudarParcela(indice: number, campo: keyof ParcelaEmEdicao, valor: string) {
    aoMudar({
      ...estado,
      parcelas: estado.parcelas.map((parcela, posicao) =>
        posicao === indice ? { ...parcela, [campo]: valor } : parcela
      ),
    });
  }

  const soma = estado.parcelas.reduce((total, parcela) => total + (numero(parcela.valor) || 0), 0);

  const diferenca = Math.round((soma - valorTotal) * 100) / 100;

  return (
    <div className="space-y-3">
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="condicao-pagamento"
            checked={estado.condicao === "A_VISTA"}
            onChange={() => aoMudar({ ...estado, condicao: "A_VISTA" })}
          />
          Pago à vista
        </label>

        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="condicao-pagamento"
            checked={estado.condicao === "A_PRAZO"}
            onChange={() => aoMudar({ ...estado, condicao: "A_PRAZO" })}
          />
          A prazo (boleto, duplicata)
        </label>
      </div>

      {estado.condicao === "A_VISTA" && (
        <div className="max-w-xs">
          <label htmlFor="forma-pagamento-compra" className="mb-1 block text-xs font-semibold text-slate-700">
            Pago com
          </label>

          <select
            id="forma-pagamento-compra"
            value={estado.forma}
            onChange={(evento) => aoMudar({ ...estado, forma: evento.target.value })}
            className={CLASSE_CAMPO}
          >
            <option value="PIX">Pix</option>

            <option value="DINHEIRO">Dinheiro</option>

            <option value="CARTAO">Cartão</option>
          </select>
        </div>
      )}

      {estado.condicao === "A_PRAZO" && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-600">
            Cada parcela vira um título em Financeiro → Contas a pagar. A saída do caixa acontece quando você
            pagar o título, não agora.
          </p>

          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label htmlFor="tipo-titulo" className="mb-1 block text-xs font-semibold text-slate-700">Tipo</label>

              <select
                id="tipo-titulo"
                value={estado.tipo}
                onChange={(evento) => aoMudar({ ...estado, tipo: evento.target.value as TipoDeTitulo })}
                className={CLASSE_CAMPO}
              >
                <option value="BOLETO">Boleto</option>

                <option value="DUPLICATA">Duplicata</option>

                <option value="OUTRO">Outro</option>
              </select>
            </div>

            <div>
              <label htmlFor="qtd-parcelas" className="mb-1 block text-xs font-semibold text-slate-700">Parcelas</label>

              <input id="qtd-parcelas" inputMode="numeric" value={estado.quantidade} onChange={(evento) => aoMudar({ ...estado, quantidade: evento.target.value })} className={CLASSE_CAMPO} />
            </div>

            <div>
              <label htmlFor="primeiro-vencimento" className="mb-1 block text-xs font-semibold text-slate-700">1º vencimento</label>

              <input id="primeiro-vencimento" type="date" value={estado.primeiroVencimento} onChange={(evento) => aoMudar({ ...estado, primeiroVencimento: evento.target.value })} className={CLASSE_CAMPO} />
            </div>

            <div>
              <label htmlFor="intervalo-dias" className="mb-1 block text-xs font-semibold text-slate-700">Intervalo (dias)</label>

              <input id="intervalo-dias" inputMode="numeric" value={estado.intervaloDias} onChange={(evento) => aoMudar({ ...estado, intervaloDias: evento.target.value })} className={CLASSE_CAMPO} />
            </div>
          </div>

          <button
            type="button"
            onClick={gerarParcelas}
            className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Gerar parcelas
          </button>

          {estado.parcelas.length > 0 && (
            <div className="space-y-2">
              {estado.parcelas.map((parcela, indice) => (
                <div key={indice} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="w-20 text-xs font-semibold text-slate-600">
                    Parcela {indice + 1}/{estado.parcelas.length}
                  </span>

                  <input
                    type="date"
                    aria-label={`Vencimento da parcela ${indice + 1}`}
                    value={parcela.vencimento}
                    onChange={(evento) => mudarParcela(indice, "vencimento", evento.target.value)}
                    className={`${CLASSE_CAMPO} max-w-44`}
                  />

                  <input
                    inputMode="decimal"
                    aria-label={`Valor da parcela ${indice + 1}`}
                    value={parcela.valor}
                    onChange={(evento) => mudarParcela(indice, "valor", evento.target.value)}
                    className={`${CLASSE_CAMPO} max-w-32 text-right`}
                  />
                </div>
              ))}

              <p className={`text-xs font-semibold ${diferenca === 0 ? "text-emerald-700" : "text-red-700"}`}>
                Soma das parcelas: {moeda(soma)} de {moeda(valorTotal)}
                {diferenca !== 0 ? ` (diferença de ${moeda(Math.abs(diferenca))})` : " ✓"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
