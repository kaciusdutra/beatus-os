"use client";

import { useCallback, useEffect, useState } from "react";

import { ROTULO_DO_MOVIMENTO, ROTULO_DO_LOCAL, type LocalDoEstoque } from "@/modules/estoque/types/estoque";

import type { AjusteDoDia } from "@/modules/operacao/services/ajustes";

import { chamarApi, numeroDoCampo } from "@/shared/api/chamarApi";

import type { ConteudoDoQr } from "../services/qr";

import type { ConferenciaDoItem, FichaDoInsumo, FichaDoLote } from "../types/qr";

const CLASSE_CAMPO =
  "w-full rounded-xl border border-slate-300 px-3 py-3 text-base outline-none focus:border-slate-500";

const CLASSE_BOTAO =
  "cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50";

// Para onde cada cartão pode andar (do descongelado não se volta ao freezer).
const PROXIMOS: Record<LocalDoEstoque, { para: LocalDoEstoque; rotulo: string }[]> = {
  FREEZER: [{ para: "DESCONGELANDO", rotulo: "Descer para a geladeira" }],
  GELADEIRA: [{ para: "COZINHA", rotulo: "Levar para a cozinha" }],
  DESCONGELANDO: [{ para: "COZINHA", rotulo: "Levar para a cozinha" }],
  SOBRA: [{ para: "COZINHA", rotulo: "Levar para a cozinha" }],
  COZINHA: [{ para: "SOBRA", rotulo: "Sobrou (guardar na geladeira)" }],
};

function numero(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function dataHora(iso?: string): string {
  return iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";
}

function Conferido({ conferencia }: { conferencia?: ConferenciaDoItem }) {
  if (!conferencia) {
    return null;
  }

  return (
    <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
      ✅ Conferido hoje às {hora(conferencia.em)}
      {conferencia.por ? ` por ${conferencia.por}` : ""}
    </p>
  );
}

function AjustesPendentes({ ajustes, onResolver }: { ajustes: AjusteDoDia[]; onResolver: (id: string) => void }) {
  if (ajustes.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <h3 className="text-sm font-bold text-amber-900">Anotado de outro dia para este item</h3>

      <ul className="space-y-2">
        {ajustes.map((ajuste) => (
          <li key={ajuste.id} className="flex items-start justify-between gap-3 text-sm text-amber-900">
            <span>
              {ajuste.texto}
              <span className="block text-xs text-amber-700">
                {dataHora(ajuste.criadoEm)}
                {ajuste.criadoPor ? ` · ${ajuste.criadoPor}` : ""}
              </span>
            </span>

            <button type="button" onClick={() => onResolver(ajuste.id)} className="cursor-pointer text-xs font-bold underline">
              Resolvido
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AnotarAjuste({
  item,
  onSalvo,
  onErro,
}: {
  item: { itemTipo: string; itemId: string; itemNome: string };
  onSalvo: () => void;
  onErro: (mensagem: string) => void;
}) {
  const [texto, setTexto] = useState("");

  async function salvar() {
    try {
      await chamarApi("/api/operacao/ajustes", { corpo: { texto, ...item }, falha: "Não foi possível anotar o ajuste." });

      setTexto("");

      onSalvo();
    } catch (error) {
      onErro(error instanceof Error ? error.message : "Não foi possível anotar o ajuste.");
    }
  }

  return (
    <div className="space-y-2">
      <input
        aria-label="Ajuste para amanhã"
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
        placeholder="O que fazer amanhã? (ex.: repor, produzir mais, descongelar antes)"
        className={CLASSE_CAMPO}
      />

      <button type="button" onClick={() => void salvar()} disabled={!texto.trim()} className={CLASSE_BOTAO}>
        Anotar para amanhã
      </button>
    </div>
  );
}

type ModoDoInsumo = "CONTAR" | "PERDA" | "ANOTAR" | null;

function FichaDoInsumoPainel({ id, onMudou }: { id: string; onMudou?: () => void }) {
  const [ficha, setFicha] = useState<FichaDoInsumo | null>(null);

  const [erro, setErro] = useState("");

  const [aviso, setAviso] = useState("");

  const [modo, setModo] = useState<ModoDoInsumo>(null);

  const [quantidade, setQuantidade] = useState("");

  const [motivo, setMotivo] = useState("");

  const carregar = useCallback(async () => {
    const dados = await chamarApi<{ ficha: FichaDoInsumo }>(`/api/qr/insumo/${id}`, { falha: "Não foi possível abrir a ficha." });

    setFicha(dados.ficha);
  }, [id]);

  useEffect(() => {
    void (async () => {
      try {
        await carregar();
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível abrir a ficha.");
      }
    })();
  }, [carregar]);

  async function executar(acao: () => Promise<void>, sucesso: string) {
    try {
      setErro("");
      setAviso("");

      await acao();

      setAviso(sucesso);
      setModo(null);
      setQuantidade("");
      setMotivo("");

      await carregar();

      onMudou?.();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível concluir.");
    }
  }

  if (!ficha) {
    return erro ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p> : <p className="text-sm text-slate-500">Abrindo a ficha...</p>;
  }

  const { item } = ficha;

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {item.itemTipo === "INSUMO" ? "Insumo" : "Preparação"}
          {item.categoria && item.itemTipo === "INSUMO" ? ` · ${item.categoria}` : ""}
        </p>

        <h2 className="text-2xl font-bold text-slate-900">{item.nome}</h2>

        <p className={`mt-1 text-3xl font-extrabold ${item.abaixoDoMinimo ? "text-amber-700" : "text-slate-900"}`}>
          {numero(item.saldo)} {item.unidade}
        </p>

        {item.minimo !== undefined && (
          <p className={`text-sm ${item.abaixoDoMinimo ? "font-semibold text-amber-700" : "text-slate-500"}`}>
            {item.abaixoDoMinimo ? "⚠ Abaixo do mínimo" : "Mínimo"}: {numero(item.minimo)} {item.unidade}
          </p>
        )}
      </header>

      {erro && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>}

      {aviso && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{aviso}</p>}

      <Conferido conferencia={ficha.conferidoHoje} />

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => void executar(() => chamarApi("/api/qr/conferencia", { corpo: { itemTipo: item.itemTipo, itemId: item.id }, falha: "Não foi possível registrar." }).then(() => undefined), "Conferido.")}
          className={CLASSE_BOTAO}
        >
          ✅ Está certo
        </button>

        <button type="button" onClick={() => setModo(modo === "CONTAR" ? null : "CONTAR")} className={CLASSE_BOTAO}>
          🔢 Contar
        </button>

        <button type="button" onClick={() => setModo(modo === "PERDA" ? null : "PERDA")} className={CLASSE_BOTAO}>
          🗑 Perda
        </button>

        <button type="button" onClick={() => setModo(modo === "ANOTAR" ? null : "ANOTAR")} className={CLASSE_BOTAO}>
          📝 Anotar para amanhã
        </button>
      </div>

      {modo === "CONTAR" && (
        <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
          <label className="block text-sm font-semibold text-slate-700">Quanto tem agora? ({item.unidade})</label>

          <input inputMode="decimal" value={quantidade} onChange={(evento) => setQuantidade(evento.target.value)} className={CLASSE_CAMPO} />

          <input value={motivo} onChange={(evento) => setMotivo(evento.target.value)} placeholder="Motivo (opcional; padrão: contagem pelo QR)" className={CLASSE_CAMPO} />

          <button
            type="button"
            disabled={!quantidade.trim()}
            onClick={() =>
              void executar(
                () =>
                  chamarApi("/api/estoque/contagem", {
                    corpo: { itemTipo: item.itemTipo, id: item.id, contado: numeroDoCampo(quantidade), motivo: motivo.trim() || "Contagem pelo QR" },
                    falha: "Não foi possível registrar a contagem.",
                  }).then(() => undefined),
                "Contagem registrada."
              )
            }
            className={CLASSE_BOTAO}
          >
            Salvar a contagem
          </button>
        </div>
      )}

      {modo === "PERDA" && (
        <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
          <label className="block text-sm font-semibold text-slate-700">Quanto se perdeu? ({item.unidade})</label>

          <input inputMode="decimal" value={quantidade} onChange={(evento) => setQuantidade(evento.target.value)} className={CLASSE_CAMPO} />

          <input value={motivo} onChange={(evento) => setMotivo(evento.target.value)} placeholder="Motivo (obrigatório: estragou, caiu, venceu...)" className={CLASSE_CAMPO} />

          <button
            type="button"
            disabled={!quantidade.trim() || !motivo.trim()}
            onClick={() =>
              void executar(
                () =>
                  chamarApi("/api/estoque/perda", {
                    corpo: { itemTipo: item.itemTipo, id: item.id, quantidade: numeroDoCampo(quantidade), motivo },
                    falha: "Não foi possível registrar a perda.",
                  }).then(() => undefined),
                "Perda registrada."
              )
            }
            className={CLASSE_BOTAO}
          >
            Registrar a perda
          </button>
        </div>
      )}

      {modo === "ANOTAR" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <AnotarAjuste
            item={{ itemTipo: item.itemTipo, itemId: item.id, itemNome: item.nome }}
            onSalvo={() => {
              setAviso("Anotado para amanhã.");
              setModo(null);

              void carregar();

              onMudou?.();
            }}
            onErro={setErro}
          />
        </div>
      )}

      <AjustesPendentes
        ajustes={ficha.ajustes}
        onResolver={(ajusteId) =>
          void executar(() => chamarApi(`/api/operacao/ajustes/${ajusteId}/resolver`, { corpo: {}, falha: "Não foi possível resolver." }).then(() => undefined), "Ajuste resolvido.")
        }
      />

      {ficha.historico.length > 0 && (
        <section className="space-y-1">
          <h3 className="text-sm font-bold text-slate-700">Últimos movimentos</h3>

          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white text-sm">
            {ficha.historico.map((movimento) => (
              <li key={movimento.id} className="flex items-center justify-between gap-3 px-4 py-2">
                <span>
                  {ROTULO_DO_MOVIMENTO[movimento.tipo] ?? movimento.tipo}
                  {movimento.motivo ? <span className="block text-xs text-slate-400">{movimento.motivo}</span> : null}
                </span>

                <span className="text-right">
                  <span className={movimento.quantidade < 0 ? "font-semibold text-red-700" : "font-semibold text-emerald-700"}>
                    {movimento.quantidade > 0 ? "+" : ""}
                    {numero(movimento.quantidade)} {movimento.unidade}
                  </span>

                  <span className="block text-xs text-slate-400">{dataHora(movimento.criadoEm)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

type AcaoDoCartao =
  | { chave: string; tipo: "MOVER"; para: LocalDoEstoque }
  | { chave: string; tipo: "DESCARTAR" };

function FichaDoLotePainel({ id, onMudou }: { id: string; onMudou?: () => void }) {
  const [ficha, setFicha] = useState<FichaDoLote | null>(null);

  const [erro, setErro] = useState("");

  const [aviso, setAviso] = useState("");

  const [acao, setAcao] = useState<AcaoDoCartao | null>(null);

  const [quantidade, setQuantidade] = useState("");

  const [motivo, setMotivo] = useState("");

  const [anotando, setAnotando] = useState(false);

  const carregar = useCallback(async () => {
    const dados = await chamarApi<{ ficha: FichaDoLote }>(`/api/qr/lote/${id}`, { falha: "Não foi possível abrir a ficha." });

    setFicha(dados.ficha);
  }, [id]);

  useEffect(() => {
    void (async () => {
      try {
        await carregar();
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível abrir a ficha.");
      }
    })();
  }, [carregar]);

  async function executar(acaoDeRede: () => Promise<void>, sucesso: string) {
    try {
      setErro("");
      setAviso("");

      await acaoDeRede();

      setAviso(sucesso);
      setAcao(null);
      setMotivo("");

      await carregar();

      onMudou?.();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível concluir.");
    }
  }

  if (!ficha) {
    return erro ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p> : <p className="text-sm text-slate-500">Abrindo a ficha...</p>;
  }

  function abrirAcao(nova: AcaoDoCartao, quantidadeDoCartao: number, vencido: boolean) {
    setAcao(nova);
    setQuantidade(String(quantidadeDoCartao).replace(".", ","));
    setMotivo(nova.tipo === "DESCARTAR" && vencido ? "Vencido" : "");
    setErro("");
    setAviso("");
  }

  function confirmar(cartao: FichaDoLote["cartoes"][number]) {
    if (!acao) {
      return;
    }

    const base = {
      fichaTecnicaId: cartao.fichaTecnicaId,
      producaoLoteId: cartao.producaoLoteId,
      gavetaId: cartao.gavetaId,
      quantidade: numeroDoCampo(quantidade),
    };

    void executar(
      () =>
        chamarApi(acao.tipo === "MOVER" ? "/api/estoque/quadro/mover" : "/api/estoque/quadro/descartar", {
          corpo: acao.tipo === "MOVER" ? { ...base, deLocal: cartao.local, paraLocal: acao.para } : { ...base, local: cartao.local, motivo },
          falha: "Não foi possível concluir.",
        }).then(() => undefined),
      acao.tipo === "MOVER" ? "Cartão movido." : "Descarte registrado."
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Lote{ficha.loteCodigo ? ` ${ficha.loteCodigo}` : ""}</p>

        <h2 className="text-2xl font-bold text-slate-900">{ficha.nome}</h2>
      </header>

      {erro && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>}

      {aviso && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{aviso}</p>}

      <Conferido conferencia={ficha.conferidoHoje} />

      {ficha.cartoes.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">Este lote não tem mais saldo: foi usado ou descartado.</p>}

      <ul className="space-y-3">
        {ficha.cartoes.map((cartao) => {
          const emAcao = acao?.chave === cartao.chave;

          const cor =
            cartao.situacao === "VENCIDO"
              ? "border-red-300 bg-red-50"
              : cartao.situacao === "VENCE_LOGO"
                ? "border-amber-300 bg-amber-50"
                : "border-slate-200 bg-white";

          return (
            <li key={cartao.chave} className={`space-y-2 rounded-2xl border p-4 ${cor}`}>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                {ROTULO_DO_LOCAL[cartao.local]}
                {cartao.gaveta ? ` · ${cartao.gaveta}` : ""}
              </p>

              <p className="text-2xl font-extrabold text-slate-900">
                {numero(cartao.quantidade)} {cartao.unidade}
              </p>

              <p className="text-sm text-slate-600">
                Validade: {dataHora(cartao.validadeAte)}
                {cartao.situacao === "VENCIDO" ? " · VENCIDO" : cartao.situacao === "VENCE_LOGO" ? " · vence logo" : ""}
              </p>

              {cartao.descongeladoEm && <p className="text-sm text-slate-600">Descongelado: {dataHora(cartao.descongeladoEm)}</p>}

              <div className="flex flex-wrap gap-2">
                {PROXIMOS[cartao.local].map((proximo) => (
                  <button key={proximo.para} type="button" onClick={() => abrirAcao({ chave: cartao.chave, tipo: "MOVER", para: proximo.para }, cartao.quantidade, false)} className={CLASSE_BOTAO}>
                    {proximo.rotulo}
                  </button>
                ))}

                <button type="button" onClick={() => abrirAcao({ chave: cartao.chave, tipo: "DESCARTAR" }, cartao.quantidade, cartao.situacao === "VENCIDO")} className={CLASSE_BOTAO}>
                  🗑 Descartar
                </button>

                {cartao.local !== "COZINHA" && (
                  <a
                    href={`/estoque/etiqueta?fichaTecnicaId=${cartao.fichaTecnicaId}&local=${cartao.local}${cartao.producaoLoteId ? `&producaoLoteId=${cartao.producaoLoteId}` : ""}${cartao.gavetaId ? `&gavetaId=${cartao.gavetaId}` : ""}`}
                    className={`${CLASSE_BOTAO} inline-block`}
                  >
                    🏷 Etiqueta
                  </a>
                )}
              </div>

              {emAcao && acao && (
                <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                  <label className="block text-sm font-semibold text-slate-700">
                    {acao.tipo === "MOVER" ? `Quanto levar? (${cartao.unidade})` : `Quanto descartar? (${cartao.unidade})`}
                  </label>

                  <input inputMode="decimal" value={quantidade} onChange={(evento) => setQuantidade(evento.target.value)} className={CLASSE_CAMPO} />

                  {acao.tipo === "DESCARTAR" && <input value={motivo} onChange={(evento) => setMotivo(evento.target.value)} placeholder="Motivo (obrigatório)" className={CLASSE_CAMPO} />}

                  <div className="flex gap-2">
                    <button type="button" onClick={() => confirmar(cartao)} disabled={!quantidade.trim() || (acao.tipo === "DESCARTAR" && !motivo.trim())} className={CLASSE_BOTAO}>
                      Confirmar
                    </button>

                    <button type="button" onClick={() => setAcao(null)} className="cursor-pointer px-3 text-sm font-semibold text-slate-500 underline">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => void executar(() => chamarApi("/api/qr/conferencia", { corpo: { itemTipo: "LOTE", itemId: ficha.loteId }, falha: "Não foi possível registrar." }).then(() => undefined), "Conferido.")}
          className={CLASSE_BOTAO}
        >
          ✅ Está certo
        </button>

        <button type="button" onClick={() => setAnotando(!anotando)} className={CLASSE_BOTAO}>
          📝 Anotar para amanhã
        </button>
      </div>

      {anotando && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <AnotarAjuste
            item={{ itemTipo: "LOTE", itemId: ficha.loteId, itemNome: `${ficha.nome}${ficha.loteCodigo ? ` (${ficha.loteCodigo})` : ""}` }}
            onSalvo={() => {
              setAviso("Anotado para amanhã.");
              setAnotando(false);

              void carregar();

              onMudou?.();
            }}
            onErro={setErro}
          />
        </div>
      )}

      <AjustesPendentes
        ajustes={ficha.ajustes}
        onResolver={(ajusteId) =>
          void executar(() => chamarApi(`/api/operacao/ajustes/${ajusteId}/resolver`, { corpo: {}, falha: "Não foi possível resolver." }).then(() => undefined), "Ajuste resolvido.")
        }
      />
    </div>
  );
}

interface Props {
  conteudo: ConteudoDoQr;
  // Chamado quando algo mudou na ficha (conferiu, contou, moveu...), para quem a abriu atualizar.
  onMudou?: () => void;
}

// A ficha que o QR abre: do insumo ou do lote. Serve para a página do QR e para o
// checklist (conferir o item sem sair da tela).
export default function PainelDoQr({ conteudo, onMudou }: Props) {
  return conteudo.tipo === "insumo" ? (
    <FichaDoInsumoPainel key={conteudo.id} id={conteudo.id} onMudou={onMudou} />
  ) : (
    <FichaDoLotePainel key={conteudo.id} id={conteudo.id} onMudou={onMudou} />
  );
}
