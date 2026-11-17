"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";

import type { RascunhoDePedido } from "@/modules/beatriz/types/beatriz";

import { linkDoWhatsappDaCasa } from "../conteudo/contato";

interface Mensagem {
  papel: "cliente" | "beatriz";
  texto: string;
}

interface ConversaGuardada {
  mensagens: Mensagem[];
  rascunho?: RascunhoDePedido;
  linkDePagamento?: string;
  chamarPessoa?: boolean;
  salvoEm: number;
}

const CHAVE = "beatus.site.beatriz";

// A conversa fica só neste aparelho, por 24 horas. Nada dela é guardada no servidor.
const VALIDADE_MS = 24 * 60 * 60 * 1000;

const TAMANHO_MAXIMO = 500;

const SAUDACAO: Mensagem = {
  papel: "beatriz",
  texto: "Oi! Eu sou a Beatriz, a atendente virtual do Beatus. Posso te ajudar a escolher o hambúrguer e montar o seu pedido. Por onde a gente começa?",
};

function lerConversa(): ConversaGuardada | null {
  try {
    const bruto = localStorage.getItem(CHAVE);

    if (!bruto) {
      return null;
    }

    const dados = JSON.parse(bruto) as ConversaGuardada;

    if (!Array.isArray(dados.mensagens) || Date.now() - dados.salvoEm > VALIDADE_MS) {
      return null;
    }

    return dados;
  } catch {
    return null;
  }
}

// A Beatriz no cardápio do site: atendente virtual (IA) que tira dúvidas e monta o pedido. Quem confere itens,
// preço e total é o sistema; fechado o pedido, o cliente segue para o pagamento. Só aparece se a IA estiver ligada.
export default function ChatDaBeatriz() {
  const [disponivel, setDisponivel] = useState(false);

  const [aberto, setAberto] = useState(false);

  const [mensagens, setMensagens] = useState<Mensagem[]>([SAUDACAO]);

  const [rascunho, setRascunho] = useState<RascunhoDePedido | undefined>();

  const [linkDePagamento, setLinkDePagamento] = useState<string | undefined>();

  const [chamarPessoa, setChamarPessoa] = useState(false);

  const [texto, setTexto] = useState("");

  const [carregando, setCarregando] = useState(false);

  const [erro, setErro] = useState("");

  const fim = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void (async () => {
      try {
        const resposta = await fetch("/api/publico/beatriz", { cache: "no-store" });

        const dados = await resposta.json();

        setDisponivel(Boolean(dados.disponivel));
      } catch {
        setDisponivel(false);
      }

      const guardada = lerConversa();

      if (guardada && guardada.mensagens.length > 0) {
        setMensagens(guardada.mensagens);
        setRascunho(guardada.rascunho);
        setLinkDePagamento(guardada.linkDePagamento);
        setChamarPessoa(Boolean(guardada.chamarPessoa));
      }
    })();
  }, []);

  useEffect(() => {
    if (aberto) {
      fim.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [mensagens, aberto, carregando]);

  function guardar(proximas: Mensagem[], novoRascunho: RascunhoDePedido | undefined, link: string | undefined, pessoa: boolean) {
    try {
      localStorage.setItem(CHAVE, JSON.stringify({ mensagens: proximas, rascunho: novoRascunho, linkDePagamento: link, chamarPessoa: pessoa, salvoEm: Date.now() } satisfies ConversaGuardada));
    } catch {
      // sem armazenamento: a conversa continua, só não volta depois
    }
  }

  async function enviar() {
    const mensagem = texto.trim();

    if (!mensagem || carregando) {
      return;
    }

    const proximas: Mensagem[] = [...mensagens, { papel: "cliente", texto: mensagem }];

    setMensagens(proximas);
    setTexto("");
    setErro("");
    setCarregando(true);

    try {
      // A saudação é só da tela: a conversa que vai para a IA começa na primeira fala do cliente.
      const enviadas = proximas.filter((item, indice) => !(indice === 0 && item === SAUDACAO) && item.texto !== SAUDACAO.texto);

      const resposta = await fetch("/api/publico/beatriz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagens: enviadas, rascunho }),
      });

      const dados = await resposta.json();

      if (!resposta.ok || !dados.sucesso) {
        if (dados.pausada || resposta.status === 429 || resposta.status === 502 || resposta.status === 503) {
          setChamarPessoa(true);
        }

        throw new Error(dados.mensagem || "A Beatriz não conseguiu responder agora.");
      }

      const comResposta: Mensagem[] = [...proximas, { papel: "beatriz", texto: dados.resposta }];

      setMensagens(comResposta);
      setRascunho(dados.rascunho);
      setLinkDePagamento(dados.linkDePagamento);
      setChamarPessoa(Boolean(dados.chamarPessoa));

      guardar(comResposta, dados.rascunho, dados.linkDePagamento, Boolean(dados.chamarPessoa));
    } catch (error) {
      setErro(error instanceof Error ? error.message : "A Beatriz não conseguiu responder agora.");
    } finally {
      setCarregando(false);
    }
  }

  function novaConversa() {
    setMensagens([SAUDACAO]);
    setRascunho(undefined);
    setLinkDePagamento(undefined);
    setChamarPessoa(false);
    setErro("");
    setTexto("");

    try {
      localStorage.removeItem(CHAVE);
    } catch {
      // sem armazenamento
    }
  }

  if (!disponivel) {
    return null;
  }

  const resumoDoPedido = rascunho?.itens.map((item) => `${item.quantidade}× ${item.nome}`).join(", ");

  const whatsapp = linkDoWhatsappDaCasa(`Oi! Estava conversando com a Beatriz no site e preciso de ajuda${resumoDoPedido ? ` com o meu pedido: ${resumoDoPedido}` : ""}.`);

  return (
    <>
      {!aberto && (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="fixed bottom-4 left-4 z-30 flex cursor-pointer items-center gap-2 rounded-full border border-ouro/60 bg-black px-4 py-3 text-sm font-bold text-ouro shadow-xl hover:bg-[#101010]"
        >
          <span aria-hidden="true">💬</span>
          Falar com a Beatriz
        </button>
      )}

      {aberto && (
        <section
          role="dialog"
          aria-label="Conversa com a Beatriz"
          className="fixed bottom-0 left-0 z-40 flex h-[min(80dvh,38rem)] w-full flex-col overflow-hidden border border-white/10 bg-[#101010] text-slate-100 shadow-2xl sm:bottom-4 sm:left-4 sm:w-[24rem] sm:rounded-2xl"
        >
          <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <h2 className="font-display text-lg font-bold text-ouro">Beatriz</h2>

              <p className="text-xs text-slate-400">Atendente virtual do Beatus</p>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={novaConversa} className="cursor-pointer text-xs text-slate-400 underline hover:text-white">
                Nova conversa
              </button>

              <button type="button" onClick={() => setAberto(false)} aria-label="Fechar a conversa" className="cursor-pointer rounded-lg px-2 text-2xl text-slate-300 hover:text-white">
                ×
              </button>
            </div>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {mensagens.map((mensagem, indice) => (
              <div key={indice} className={`flex ${mensagem.papel === "cliente" ? "justify-end" : "justify-start"}`}>
                <p className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${mensagem.papel === "cliente" ? "bg-ouro text-black" : "bg-white/10 text-slate-100"}`}>{mensagem.texto}</p>
              </div>
            ))}

            {carregando && <p className="text-xs text-slate-400">A Beatriz está escrevendo...</p>}

            {erro && <p className="rounded-lg border border-red-400/40 bg-red-950/40 px-3 py-2 text-xs text-red-200">{erro}</p>}

            {linkDePagamento && (
              <a href={linkDePagamento} className="block rounded-xl bg-ouro px-4 py-3 text-center text-sm font-bold text-black hover:bg-ouro-400">
                Ir para o pagamento
              </a>
            )}

            {chamarPessoa && (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-emerald-400/60 px-4 py-3 text-center text-sm font-bold text-emerald-300 hover:bg-emerald-950/40">
                Falar com a equipe no WhatsApp
              </a>
            )}

            <div ref={fim} />
          </div>

          <div className="border-t border-white/10 px-3 py-3">
            <div className="flex gap-2">
              <textarea
                aria-label="Sua mensagem para a Beatriz"
                value={texto}
                maxLength={TAMANHO_MAXIMO}
                rows={2}
                onChange={(evento) => setTexto(evento.target.value)}
                onKeyDown={(evento) => {
                  if (evento.key === "Enter" && !evento.shiftKey) {
                    evento.preventDefault();

                    void enviar();
                  }
                }}
                placeholder="Escreva aqui (Enter envia)"
                className="flex-1 resize-none rounded-xl border border-white/15 bg-black px-3 py-2 text-sm text-slate-100 outline-none focus:border-ouro"
              />

              <button type="button" disabled={carregando || !texto.trim()} onClick={() => void enviar()} className="cursor-pointer rounded-xl bg-ouro px-4 text-sm font-bold text-black hover:bg-ouro-400 disabled:cursor-not-allowed disabled:opacity-50">
                Enviar
              </button>
            </div>

            <p className="mt-2 text-[11px] leading-snug text-slate-500">
              A Beatriz é uma atendente virtual (IA): o que você escreve é enviado ao nosso provedor de IA para ela responder. Não escreva senha, CPF ou dados de cartão. Veja a{" "}
              <Link href="/cardapio/privacidade" className="underline hover:text-slate-300">
                política de privacidade
              </Link>
              . A conversa fica só neste aparelho.
            </p>
          </div>
        </section>
      )}
    </>
  );
}
