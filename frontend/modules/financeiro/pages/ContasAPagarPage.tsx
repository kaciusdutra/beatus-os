"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { situacaoDoTitulo, textoDaData } from "../services/calcularCapitalDeGiro";

import type { ContaPagar, SituacaoDoTitulo } from "../types/contasAPagar";

const CLASSE_CAMPO =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500";

const FILTROS = [
  { chave: "ABERTO", rotulo: "Em aberto" },
  { chave: "PAGO", rotulo: "Pagos" },
  { chave: "CANCELADO", rotulo: "Cancelados" },
  { chave: "TODOS", rotulo: "Todos" },
] as const;

const COR_SITUACAO: Record<SituacaoDoTitulo, string> = {
  ABERTO: "bg-slate-100 text-slate-700",
  VENCE_HOJE: "bg-amber-100 text-amber-800",
  VENCIDO: "bg-red-100 text-red-800",
  PAGO: "bg-emerald-100 text-emerald-800",
  CANCELADO: "bg-slate-200 text-slate-500",
};

const ROTULO_SITUACAO: Record<SituacaoDoTitulo, string> = {
  ABERTO: "A vencer",
  VENCE_HOJE: "Vence hoje",
  VENCIDO: "Vencido",
  PAGO: "Pago",
  CANCELADO: "Cancelado",
};

function moeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataCurta(texto: string): string {
  const [ano, mes, dia] = texto.split("-");

  return `${dia}/${mes}/${ano}`;
}

export default function ContasAPagarPage() {
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["chave"]>("ABERTO");

  const [titulos, setTitulos] = useState<ContaPagar[]>([]);

  const [erro, setErro] = useState("");

  const [carregando, setCarregando] = useState(true);

  const [pagando, setPagando] = useState<ContaPagar | null>(null);

  const [pagoEm, setPagoEm] = useState(() => textoDaData(new Date()));

  const [valorPago, setValorPago] = useState("");

  const [forma, setForma] = useState("PIX");

  const [cancelando, setCancelando] = useState<string | null>(null);

  const [motivo, setMotivo] = useState("");

  const hoje = textoDaData(new Date());

  const carregar = useCallback(async () => {
    const resposta = await fetch(
      `/api/financeiro/contas-a-pagar${filtro === "TODOS" ? "" : `?status=${filtro}`}`,
      { cache: "no-store" }
    );

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      throw new Error(dados.mensagem || "Não foi possível carregar as contas a pagar.");
    }

    setTitulos(dados.titulos ?? []);
  }, [filtro]);

  useEffect(() => {
    void (async () => {
      try {
        await carregar();

        setErro("");
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível carregar as contas a pagar.");
      } finally {
        setCarregando(false);
      }
    })();
  }, [carregar]);

  function abrirPagamento(titulo: ContaPagar) {
    setPagando(titulo);
    setCancelando(null);
    setPagoEm(textoDaData(new Date()));
    setValorPago(titulo.valor.toFixed(2));
    setForma("PIX");
  }

  async function enviar(url: string, corpo: object, falha: string): Promise<boolean> {
    try {
      setErro("");

      const resposta = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });

      const dados = await resposta.json();

      if (!resposta.ok || !dados.sucesso) {
        throw new Error(dados.mensagem || falha);
      }

      await carregar();

      return true;
    } catch (error) {
      setErro(error instanceof Error ? error.message : falha);

      return false;
    }
  }

  async function confirmarPagamento() {
    if (!pagando) {
      return;
    }

    const ok = await enviar(
      `/api/financeiro/contas-a-pagar/${pagando.id}/pagar`,
      { pagoEm, valorPago, forma },
      "Não foi possível pagar o título."
    );

    if (ok) {
      setPagando(null);
    }
  }

  async function confirmarCancelamento(id: string) {
    const ok = await enviar(
      `/api/financeiro/contas-a-pagar/${id}/cancelar`,
      { motivo },
      "Não foi possível cancelar o título."
    );

    if (ok) {
      setCancelando(null);
      setMotivo("");
    }
  }

  const totalAberto = titulos
    .filter((titulo) => titulo.status === "ABERTO")
    .reduce((soma, titulo) => soma + titulo.valor, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">Financeiro</p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Contas a pagar</h1>

          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Boletos e duplicatas das compras a prazo. Ao confirmar uma entrada de compra, escolha &quot;A prazo&quot;
            e informe as parcelas. A saída do caixa acontece na data em que o título é pago.
          </p>
        </div>

        <Link href="/financeiro/capital-de-giro" className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
          Capital de giro
        </Link>
      </div>

      {erro && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}

      <div className="flex flex-wrap items-center gap-2">
        {FILTROS.map((item) => (
          <button
            key={item.chave}
            type="button"
            onClick={() => setFiltro(item.chave)}
            className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-semibold ${
              filtro === item.chave ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {item.rotulo}
          </button>
        ))}

        {totalAberto > 0 && (
          <span className="ml-auto text-sm font-semibold text-slate-700">Em aberto na lista: {moeda(totalAberto)}</span>
        )}
      </div>

      {carregando && <p className="p-6 text-center text-sm text-slate-500">Carregando...</p>}

      {!carregando && titulos.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">Nenhum título nesta lista.</p>
      )}

      {titulos.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white text-sm shadow-sm">
          {titulos.map((titulo) => {
            const situacao = situacaoDoTitulo(titulo, hoje);

            return (
              <li key={titulo.id} className="space-y-3 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {titulo.fornecedor}{" "}
                      <span className="font-normal text-slate-500">
                        · {titulo.tipo.toLowerCase()} {titulo.parcela}/{titulo.totalParcelas}
                        {titulo.numeroDocumento ? ` · doc. ${titulo.numeroDocumento}` : ""}
                      </span>
                    </p>

                    <p className="text-xs text-slate-500">
                      Vence em {dataCurta(titulo.vencimento)}
                      {titulo.pagoEm ? ` · pago em ${dataCurta(titulo.pagoEm)}${titulo.valorPago !== undefined && titulo.valorPago !== titulo.valor ? ` por ${moeda(titulo.valorPago)}` : ""}` : ""}
                      {titulo.motivoCancelamento ? ` · ${titulo.motivoCancelamento}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900">{moeda(titulo.valor)}</span>

                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${COR_SITUACAO[situacao]}`}>{ROTULO_SITUACAO[situacao]}</span>

                    {titulo.status === "ABERTO" && (
                      <>
                        <button type="button" onClick={() => abrirPagamento(titulo)} className="cursor-pointer rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
                          Pagar
                        </button>

                        <button type="button" onClick={() => { setCancelando(titulo.id); setPagando(null); setMotivo(""); }} className="cursor-pointer text-xs font-semibold text-red-700 hover:text-red-900">
                          Cancelar
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {pagando?.id === titulo.id && (
                  <div className="flex flex-wrap items-end gap-3 rounded-xl bg-emerald-50 p-3">
                    <div>
                      <label htmlFor="pago-em" className="mb-1 block text-xs font-semibold text-slate-700">Pago em</label>

                      <input id="pago-em" type="date" value={pagoEm} onChange={(evento) => setPagoEm(evento.target.value)} className={CLASSE_CAMPO} />
                    </div>

                    <div>
                      <label htmlFor="valor-pago" className="mb-1 block text-xs font-semibold text-slate-700">Valor pago (R$)</label>

                      <input id="valor-pago" inputMode="decimal" value={valorPago} onChange={(evento) => setValorPago(evento.target.value)} className={CLASSE_CAMPO} />
                    </div>

                    <div>
                      <label htmlFor="forma-titulo" className="mb-1 block text-xs font-semibold text-slate-700">Forma</label>

                      <select id="forma-titulo" value={forma} onChange={(evento) => setForma(evento.target.value)} className={CLASSE_CAMPO}>
                        <option value="PIX">Pix</option>

                        <option value="DINHEIRO">Dinheiro</option>

                        <option value="CARTAO">Cartão</option>
                      </select>
                    </div>

                    <button type="button" onClick={() => void confirmarPagamento()} className="cursor-pointer rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800">
                      Confirmar pagamento
                    </button>

                    <button type="button" onClick={() => setPagando(null)} className="cursor-pointer text-xs font-semibold text-slate-600">
                      Voltar
                    </button>

                    <p className="w-full text-xs text-slate-500">
                      Se pagou juros, multa ou teve desconto, ajuste o valor: a diferença aparece à parte no fluxo de caixa.
                    </p>
                  </div>
                )}

                {cancelando === titulo.id && (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl bg-red-50 p-3">
                    <input value={motivo} onChange={(evento) => setMotivo(evento.target.value)} placeholder="Motivo do cancelamento" aria-label="Motivo do cancelamento" className={`${CLASSE_CAMPO} max-w-sm`} />

                    <button type="button" onClick={() => void confirmarCancelamento(titulo.id)} className="cursor-pointer rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white hover:bg-red-800">
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
    </div>
  );
}
