"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import Link from "next/link";

import type { PedidoDaCozinha } from "../services/server/operacaoPedidoService";

import { marcarComoVistos, pedidosNovosDaFila, textoDoAlerta, tituloDaAba } from "../services/alertaDaCozinha";

import ConsultaAutomaticaDoMarketplace from "@/modules/marketplace/components/ConsultaAutomaticaDoMarketplace";

interface ConsumoDoPedido {
  itemTipo: "INSUMO" | "PREPARACAO";
  id: string;
  nome: string;
  unidade: string;
  quantidade: number;
}

const COLUNAS = [
  { status: "NOVO", titulo: "Novos (fila)" },
  { status: "EM_PREPARO", titulo: "Em preparo" },
  { status: "PRONTO", titulo: "Prontos" },
  { status: "EM_ROTA", titulo: "Em rota (expedição)" },
] as const;

const PROXIMO: Record<string, { status: string; rotulo: string } | undefined> = {
  NOVO: { status: "EM_PREPARO", rotulo: "Iniciar preparo" },
  EM_PREPARO: { status: "PRONTO", rotulo: "Pronto" },
  PRONTO: { status: "EM_ROTA", rotulo: "Saiu para entrega" },
  EM_ROTA: { status: "ENTREGUE", rotulo: "Entregue" },
};

// A cozinha confere a fila a cada poucos segundos: o pedido pago entra sozinho, sem aceite.
const SEGUNDOS_ENTRE_CONSULTAS = 5;

const CHAVE_DO_SOM = "beatus.cozinha.som";

// Três toques curtos, sem arquivo de áudio.
function tocarAviso(contexto: AudioContext): void {
  const inicio = contexto.currentTime;

  [880, 660, 880].forEach((frequencia, indice) => {
    const oscilador = contexto.createOscillator();

    const volume = contexto.createGain();

    oscilador.type = "sine";
    oscilador.frequency.value = frequencia;

    volume.gain.setValueAtTime(0.0001, inicio + indice * 0.22);
    volume.gain.exponentialRampToValueAtTime(0.4, inicio + indice * 0.22 + 0.02);
    volume.gain.exponentialRampToValueAtTime(0.0001, inicio + indice * 0.22 + 0.18);

    oscilador.connect(volume);
    volume.connect(contexto.destination);

    oscilador.start(inicio + indice * 0.22);
    oscilador.stop(inicio + indice * 0.22 + 0.2);
  });
}

const CLASSE_CAMPO =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500";

function minutos(iso: string, agora: number): number {
  return Math.max(0, Math.floor((agora - new Date(iso).getTime()) / 60000));
}

function numero(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

export default function CozinhaPage() {
  const [pedidos, setPedidos] = useState<PedidoDaCozinha[]>([]);

  const [agora, setAgora] = useState(() => Date.now());

  const [erro, setErro] = useState("");

  const [avisos, setAvisos] = useState<string[]>([]);

  const [carregando, setCarregando] = useState(true);

  const [cancelando, setCancelando] = useState<PedidoDaCozinha | null>(null);

  const [motivo, setMotivo] = useState("");

  const [consumo, setConsumo] = useState<ConsumoDoPedido[]>([]);

  const [devolver, setDevolver] = useState<Record<string, string>>({});

  // Aviso de pedido novo
  const [somLigado, setSomLigado] = useState(true);

  const [alerta, setAlerta] = useState("");

  const [destacados, setDestacados] = useState<string[]>([]);

  const vistosRef = useRef<Set<string> | null>(null);

  const somLigadoRef = useRef(true);

  const audioRef = useRef<AudioContext | null>(null);

  // O navegador só libera o som depois de um toque na tela.
  const [somLiberado, setSomLiberado] = useState(false);

  const carregar = useCallback(async () => {
    const resposta = await fetch("/api/pedidos", { cache: "no-store" });

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      throw new Error(dados.mensagem || "Não foi possível carregar os pedidos.");
    }

    const recebidos = (dados.pedidos ?? []) as PedidoDaCozinha[];

    // Pedido que entrou desde a última conferência (a primeira não conta): avisa.
    const novos = pedidosNovosDaFila(vistosRef.current, recebidos);

    vistosRef.current = marcarComoVistos(vistosRef.current, recebidos);

    if (novos.length > 0) {
      setAlerta(textoDoAlerta(novos));
      setDestacados((atuais) => [...novos.map((pedido) => pedido.id), ...atuais].slice(0, 20));

      if (somLigadoRef.current && audioRef.current?.state === "running") {
        tocarAviso(audioRef.current);
      }
    }

    setPedidos(recebidos);
    setAgora(Date.now());
  }, []);

  // Preferência do som (lida depois de a tela abrir, para não destoar do servidor).
  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CHAVE_DO_SOM) !== "desligado";

      somLigadoRef.current = guardado;

      setSomLigado(guardado);
    } catch {
      // sem armazenamento: continua ligado
    }
  }, []);

  // O título da aba mostra quantos pedidos novos esperam na fila.
  const naFila = pedidos.filter((pedido) => pedido.statusOperacional === "NOVO").length;

  useEffect(() => {
    const original = document.title;

    document.title = tituloDaAba(naFila);

    return () => {
      document.title = original;
    };
  }, [naFila]);

  async function alternarSom() {
    try {
      if (!audioRef.current) {
        audioRef.current = new AudioContext();
      }

      if (audioRef.current.state === "suspended") {
        await audioRef.current.resume();
      }

      const novo = !somLigado || !somLiberado;

      setSomLiberado(true);
      setSomLigado(novo);

      somLigadoRef.current = novo;

      try {
        localStorage.setItem(CHAVE_DO_SOM, novo ? "ligado" : "desligado");
      } catch {
        // sem armazenamento: vale só nesta tela
      }

      if (novo) {
        tocarAviso(audioRef.current);
      }
    } catch {
      setErro("Este aparelho não liberou o som. Confira o volume e as permissões do navegador.");
    }
  }

  useEffect(() => {
    let ativo = true;

    async function ciclo() {
      try {
        await carregar();

        if (ativo) {
          setErro("");
        }
      } catch (error) {
        if (ativo) {
          setErro(error instanceof Error ? error.message : "Não foi possível carregar os pedidos.");
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    void ciclo();

    // A tela da cozinha se atualiza sozinha.
    const intervalo = setInterval(() => void ciclo(), SEGUNDOS_ENTRE_CONSULTAS * 1000);

    return () => {
      ativo = false;
      clearInterval(intervalo);
    };
  }, [carregar]);

  async function mudar(
    pedido: PedidoDaCozinha,
    status: string,
    extras: { motivo?: string; devolucoes?: { id: string; quantidade: number }[] } = {}
  ) {
    try {
      setErro("");

      const resposta = await fetch(`/api/pedidos/${pedido.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...extras }),
      });

      const dados = await resposta.json();

      if (!resposta.ok || !dados.sucesso) {
        throw new Error(dados.mensagem || "Não foi possível mudar o status.");
      }

      setAvisos(dados.avisos ?? []);

      setCancelando(null);

      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível mudar o status.");
    }
  }

  async function abrirCancelamento(pedido: PedidoDaCozinha) {
    setCancelando(pedido);
    setMotivo("");
    setDevolver({});
    setConsumo([]);

    if (pedido.statusOperacional === "EM_PREPARO" || pedido.statusOperacional === "PRONTO") {
      try {
        const resposta = await fetch(`/api/pedidos/${pedido.id}/consumo`, { cache: "no-store" });

        const dados = await resposta.json();

        setConsumo((dados.consumo ?? []).filter((item: ConsumoDoPedido) => item.itemTipo === "INSUMO"));
      } catch {
        setConsumo([]);
      }
    }
  }

  async function confirmarCancelamento() {
    if (!cancelando) {
      return;
    }

    await mudar(cancelando, "CANCELADO", {
      motivo,
      devolucoes: Object.entries(devolver)
        .filter(([, quantidade]) => Number(quantidade.replace(",", ".")) > 0)
        .map(([id, quantidade]) => ({ id, quantidade: Number(quantidade.replace(",", ".")) })),
    });
  }

  if (carregando) {
    return <p className="p-10 text-center text-sm text-slate-500">Carregando pedidos...</p>;
  }

  return (
    <div className="space-y-6">
      <ConsultaAutomaticaDoMarketplace segundos={30} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">Módulo</p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Cozinha</h1>

          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Os pedidos entram na fila quando o pagamento é aprovado. Ao
            iniciar o preparo, o estoque baixa pelas fichas. Não há etapa de
            aceite: o pedido pago aparece em &quot;Novos&quot; sozinho. A tela confere a
            fila a cada {SEGUNDOS_ENTRE_CONSULTAS} segundos e avisa quando chega pedido novo.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void alternarSom()}
            className={`cursor-pointer rounded-xl border px-5 py-3 text-sm font-semibold shadow-sm ${
              somLiberado && somLigado ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-amber-300 bg-amber-50 text-amber-800"
            }`}
          >
            {!somLiberado ? "🔕 Toque para ativar o som" : somLigado ? "🔔 Som ligado (tocar para desligar)" : "🔕 Som desligado (tocar para ligar)"}
          </button>

          <Link href="/integracoes/marketplace" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
            Marketplaces
          </Link>

          <Link href="/estoque/quadro" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
            Quadro do estoque
          </Link>

          <Link href="/producao" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
            Produção de lotes
          </Link>
        </div>
      </div>

      {alerta && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-base font-bold text-emerald-900">
          <span>🔔 {alerta}</span>

          <button type="button" onClick={() => { setAlerta(""); setDestacados([]); }} className="cursor-pointer rounded-lg border border-emerald-400 px-3 py-1 text-sm font-semibold hover:bg-emerald-100">
            Entendi
          </button>
        </div>
      )}

      {erro && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}

      {avisos.length > 0 && (
        <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {avisos.map((aviso) => (
            <p key={aviso}>{aviso}</p>
          ))}
        </div>
      )}

      {cancelando && (
        <section className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-5">
          <h2 className="text-lg font-bold text-red-900">Cancelar o pedido {cancelando.numero}</h2>

          <p className="text-sm text-red-800">
            {cancelando.statusOperacional === "NOVO"
              ? "Ainda está na fila: nada foi consumido, não há o que devolver."
              : cancelando.statusOperacional === "EM_ROTA"
                ? "Já saiu para entrega: nada volta ao estoque."
                : "Já está em preparo: o que foi consumido vira perda. Marque abaixo só o que dá para aproveitar (bebida, embalagem fechada, pão que não foi para a chapa)."}
          </p>

          {consumo.length > 0 && (
            <ul className="divide-y divide-red-100 rounded-xl bg-white text-sm">
              {consumo.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2">
                  <span>
                    {item.nome}{" "}
                    <span className="text-slate-500">(consumiu {numero(item.quantidade)} {item.unidade})</span>
                  </span>

                  <span className="flex items-center gap-2">
                    voltou
                    <input
                      aria-label={`Quanto de ${item.nome} voltou`}
                      value={devolver[item.id] ?? ""}
                      onChange={(evento) => setDevolver({ ...devolver, [item.id]: evento.target.value })}
                      placeholder="0"
                      className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-right"
                    />
                    {item.unidade}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div>
            <label htmlFor="motivo" className="mb-1 block text-xs font-semibold text-red-900">Motivo do cancelamento</label>

            <input id="motivo" value={motivo} onChange={(evento) => setMotivo(evento.target.value)} placeholder="Ex.: cliente desistiu" className={CLASSE_CAMPO} />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => void confirmarCancelamento()} className="cursor-pointer rounded-xl bg-red-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-800">
              Cancelar o pedido
            </button>

            <button type="button" onClick={() => setCancelando(null)} className="cursor-pointer rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Voltar
            </button>
          </div>
        </section>
      )}

      <div className="grid gap-4 xl:grid-cols-4">
        {COLUNAS.map((coluna) => {
          const daColuna = pedidos.filter((pedido) => pedido.statusOperacional === coluna.status);

          return (
            <div key={coluna.status} className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
                {coluna.titulo} ({daColuna.length})
              </h2>

              {daColuna.length === 0 && (
                <p className="rounded-xl border border-dashed border-slate-300 p-4 text-xs text-slate-400">Nenhum pedido</p>
              )}

              {daColuna.map((pedido) => {
                const proximo = PROXIMO[pedido.statusOperacional];

                const espera = minutos(pedido.criadoEm, agora);

                return (
                  <div
                    key={pedido.id}
                    className={`rounded-xl border p-4 text-sm shadow-sm ${
                      destacados.includes(pedido.id)
                        ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-400"
                        : pedido.statusOperacional === "NOVO" && espera >= 10
                          ? "border-amber-300 bg-amber-50"
                          : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xl font-bold text-slate-900">#{pedido.numero}</p>

                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{pedido.canal}</span>
                    </div>

                    <p className="text-xs text-slate-500">
                      {pedido.cliente.nome} · há {espera} min
                    </p>

                    <ul className="mt-2 space-y-1">
                      {pedido.itens.map((item) => (
                        <li key={item.id}>
                          <strong>{item.quantidade}×</strong> {item.nome}
                          {item.observacao && <span className="block text-xs text-amber-700">obs.: {item.observacao}</span>}
                        </li>
                      ))}
                    </ul>

                    {(pedido.statusOperacional === "PRONTO" || pedido.statusOperacional === "EM_ROTA") && pedido.endereco && (
                      <p className="mt-2 text-xs text-slate-600">📍 {pedido.endereco}</p>
                    )}

                    <p className="mt-2 text-xs text-slate-500">
                      Ticket:{" "}
                      {pedido.ticketStatus === "IMPRESSO" ? "impresso" : pedido.ticketStatus === "FALHOU" ? "falhou" : "pendente"}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                      {proximo && (
                        <button
                          type="button"
                          onClick={() => void mudar(pedido, proximo.status)}
                          className="cursor-pointer rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                        >
                          {proximo.rotulo}
                        </button>
                      )}

                      <a
                        href={`/cozinha/ticket/${pedido.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-sky-700 underline"
                      >
                        Ticket
                      </a>

                      <button type="button" onClick={() => void abrirCancelamento(pedido)} className="cursor-pointer text-xs font-semibold text-red-700 hover:text-red-900">
                        Cancelar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
