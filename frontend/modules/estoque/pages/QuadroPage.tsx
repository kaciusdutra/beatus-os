"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import {
  ROTULO_DO_LOCAL,
  type CartaoDoQuadro,
  type CartaoAProduzir,
  type LocalDoEstoque,
} from "../types/estoque";

const CLASSE_CAMPO =
  "w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-500";

// Para onde cada cartão pode andar (do descongelado não se volta ao freezer).
const PROXIMOS: Record<LocalDoEstoque, { para: LocalDoEstoque; rotulo: string }[]> = {
  FREEZER: [{ para: "DESCONGELANDO", rotulo: "Descer para a geladeira" }],
  GELADEIRA: [{ para: "COZINHA", rotulo: "Levar para a cozinha" }],
  DESCONGELANDO: [{ para: "COZINHA", rotulo: "Levar para a cozinha" }],
  SOBRA: [{ para: "COZINHA", rotulo: "Levar para a cozinha" }],
  COZINHA: [{ para: "SOBRA", rotulo: "Sobrou (guardar na geladeira)" }],
};

const COLUNAS: LocalDoEstoque[] = [
  "FREEZER",
  "GELADEIRA",
  "DESCONGELANDO",
  "COZINHA",
  "SOBRA",
];

function numero(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

function dataHora(iso?: string): string {
  return iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";
}

function corDaSituacao(situacao: CartaoDoQuadro["situacao"]): string {
  return situacao === "VENCIDO"
    ? "border-red-300 bg-red-50"
    : situacao === "VENCE_LOGO"
      ? "border-amber-300 bg-amber-50"
      : "border-slate-200 bg-white";
}

type Acao =
  | { cartao: CartaoDoQuadro; tipo: "MOVER"; para: LocalDoEstoque; rotulo: string }
  | { cartao: CartaoDoQuadro; tipo: "DESCARTAR" };

export default function QuadroPage() {
  const [cartoes, setCartoes] = useState<CartaoDoQuadro[]>([]);

  const [aProduzir, setAProduzir] = useState<CartaoAProduzir[]>([]);

  const [erro, setErro] = useState("");

  const [aviso, setAviso] = useState("");

  const [carregando, setCarregando] = useState(true);

  const [acao, setAcao] = useState<Acao | null>(null);

  const [quantidade, setQuantidade] = useState("");

  const [motivo, setMotivo] = useState("");

  const carregar = useCallback(async () => {
    const resposta = await fetch("/api/estoque/quadro", { cache: "no-store" });

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      throw new Error(dados.mensagem || "Não foi possível carregar o quadro.");
    }

    setCartoes(dados.cartoes ?? []);
    setAProduzir(dados.aProduzir ?? []);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await carregar();
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível carregar o quadro.");
      } finally {
        setCarregando(false);
      }
    })();
  }, [carregar]);

  function abrir(novaAcao: Acao) {
    setAcao(novaAcao);
    setQuantidade(String(novaAcao.cartao.quantidade).replace(".", ","));
    setMotivo(novaAcao.tipo === "DESCARTAR" && novaAcao.cartao.situacao === "VENCIDO" ? "Vencido" : "");
    setErro("");
    setAviso("");
  }

  async function confirmar() {
    if (!acao) {
      return;
    }

    const { cartao } = acao;

    const corpoBase = {
      fichaTecnicaId: cartao.fichaTecnicaId,
      producaoLoteId: cartao.producaoLoteId,
      gavetaId: cartao.gavetaId,
      quantidade: Number(quantidade.replace(",", ".")),
    };

    try {
      setErro("");

      const resposta = await fetch(
        acao.tipo === "MOVER" ? "/api/estoque/quadro/mover" : "/api/estoque/quadro/descartar",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            acao.tipo === "MOVER"
              ? { ...corpoBase, deLocal: cartao.local, paraLocal: acao.para }
              : { ...corpoBase, local: cartao.local, motivo }
          ),
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok || !dados.sucesso) {
        throw new Error(dados.mensagem || "Não foi possível concluir.");
      }

      setAviso(acao.tipo === "MOVER" ? "Cartão movido." : "Descarte registrado.");

      setAcao(null);

      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível concluir.");
    }
  }

  const vencidos = cartoes.filter((cartao) => cartao.situacao === "VENCIDO");

  const vivos = cartoes.filter((cartao) => cartao.situacao !== "VENCIDO");

  if (carregando) {
    return <p className="p-10 text-center text-sm text-slate-500">Carregando quadro...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/estoque" className="text-sm font-medium text-slate-500 hover:text-slate-700">
            ← Estoque
          </Link>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Quadro do estoque
          </h1>

          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Cada cartão é um lote em uma gaveta. Ele anda do freezer para a
            geladeira (descongelando), depois para a cozinha, e a sobra fica
            na geladeira: o que descongelou não volta ao freezer. A cor mostra
            a validade.
          </p>
        </div>

        <div className="flex gap-3">
          <Link href="/estoque/gavetas" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
            Gavetas e regras
          </Link>

          <Link href="/producao" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
            Produção
          </Link>
        </div>
      </div>

      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>
      )}

      {aviso && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{aviso}</div>
      )}

      {acao && (
        <section className="space-y-3 rounded-2xl border border-slate-300 bg-slate-50 p-5">
          <h2 className="text-lg font-bold text-slate-900">
            {acao.tipo === "MOVER" ? acao.rotulo : "Descartar"}: {acao.cartao.nome}
            {acao.cartao.gaveta ? ` (${acao.cartao.gaveta})` : ""}
          </h2>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label htmlFor="q" className="mb-1 block text-xs font-semibold text-slate-600">
                Quantidade ({acao.cartao.unidade})
              </label>

              <input id="q" value={quantidade} onChange={(evento) => setQuantidade(evento.target.value)} className={CLASSE_CAMPO} />
            </div>

            {acao.tipo === "DESCARTAR" && (
              <div className="md:col-span-2">
                <label htmlFor="m" className="mb-1 block text-xs font-semibold text-slate-600">
                  Motivo
                </label>

                <input id="m" value={motivo} onChange={(evento) => setMotivo(evento.target.value)} className={CLASSE_CAMPO} />
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => void confirmar()} className="cursor-pointer rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
              Confirmar
            </button>

            <button type="button" onClick={() => setAcao(null)} className="cursor-pointer rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white">
              Cancelar
            </button>
          </div>
        </section>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        <div className="w-64 shrink-0 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">A produzir ({aProduzir.length})</h2>

          {aProduzir.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-xs text-slate-500">
              Nada abaixo do mínimo. Defina o estoque mínimo das preparações em Estoque.
            </p>
          )}

          {aProduzir.map((item) => (
            <div key={item.fichaTecnicaId} className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm">
              <p className="font-semibold text-slate-900">{item.nome}</p>

              <p className="text-xs text-slate-600">
                saldo {numero(item.saldo)} de {numero(item.minimo)} {item.unidade}
              </p>

              <Link href="/producao" className="mt-2 inline-block text-xs font-semibold text-sky-700 underline">
                Produzir
              </Link>
            </div>
          ))}
        </div>

        {COLUNAS.map((coluna) => {
          const daColuna = vivos.filter((cartao) => cartao.local === coluna);

          return (
            <div key={coluna} className="w-64 shrink-0 space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
                {ROTULO_DO_LOCAL[coluna]} ({daColuna.length})
              </h2>

              {daColuna.length === 0 && (
                <p className="rounded-xl border border-dashed border-slate-300 p-4 text-xs text-slate-400">Vazio</p>
              )}

              {daColuna.map((cartao) => (
                <CartaoView key={cartao.chave} cartao={cartao} abrir={abrir} />
              ))}
            </div>
          );
        })}

        <div className="w-64 shrink-0 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-red-700">Descartar ({vencidos.length})</h2>

          {vencidos.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-xs text-slate-400">Nada vencido</p>
          )}

          {vencidos.map((cartao) => (
            <CartaoView key={cartao.chave} cartao={cartao} abrir={abrir} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CartaoView({
  cartao,
  abrir,
}: {
  cartao: CartaoDoQuadro;
  abrir: (acao: Acao) => void;
}) {
  const etiqueta =
    cartao.local !== "COZINHA"
      ? `/estoque/etiqueta?fichaTecnicaId=${cartao.fichaTecnicaId}&local=${cartao.local}${cartao.producaoLoteId ? `&producaoLoteId=${cartao.producaoLoteId}` : ""}${cartao.gavetaId ? `&gavetaId=${cartao.gavetaId}` : ""}`
      : undefined;

  return (
    <div className={`rounded-xl border p-3 text-sm shadow-sm ${corDaSituacao(cartao.situacao)}`}>
      <p className="font-semibold text-slate-900">{cartao.nome}</p>

      <p className="text-xs text-slate-600">
        {cartao.gaveta ? `${cartao.gaveta} · ` : ""}
        {cartao.loteCodigo ?? "sem lote"}
      </p>

      <p className="mt-1 text-base font-bold text-slate-900">
        {numero(cartao.quantidade)} {cartao.unidade}
      </p>

      <p className="text-xs text-slate-600">
        Validade: {dataHora(cartao.validadeAte)}
        {cartao.situacao === "VENCIDO" && <strong className="ml-1 text-red-700">vencido</strong>}
        {cartao.situacao === "VENCE_LOGO" && <strong className="ml-1 text-amber-700">vence logo</strong>}
      </p>

      {cartao.descongeladoEm && (
        <p className="text-xs text-slate-500">Descongelado em {dataHora(cartao.descongeladoEm)}</p>
      )}

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold">
        {cartao.situacao !== "VENCIDO" &&
          PROXIMOS[cartao.local].map((proximo) => (
            <button
              key={proximo.para}
              type="button"
              onClick={() => abrir({ cartao, tipo: "MOVER", para: proximo.para, rotulo: proximo.rotulo })}
              className="cursor-pointer text-sky-700 hover:text-sky-900"
            >
              {proximo.rotulo}
            </button>
          ))}

        <button type="button" onClick={() => abrir({ cartao, tipo: "DESCARTAR" })} className="cursor-pointer text-red-700 hover:text-red-900">
          Descartar
        </button>

        {etiqueta && (
          <a href={etiqueta} target="_blank" rel="noopener noreferrer" className="text-slate-700 underline">
            Etiqueta
          </a>
        )}
      </div>
    </div>
  );
}
