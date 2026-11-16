"use client";

import LinkDePagamento from "../components/LinkDePagamento";

import { useEffect, useRef, useState } from "react";

import type {
  MemoriaDoCliente,
  MensagemDaConversa,
  RascunhoDePedido,
  RespostaDaBeatriz,
  UsoDoModelo,
} from "../types/beatriz";

type RespostaComUso = RespostaDaBeatriz & { modelo: string; uso: UsoDoModelo; memoria?: MemoriaDoCliente };

const ROTULO_PENDENCIA: Record<string, string> = {
  ITENS: "falta o pedido",
  NOME: "falta o nome",
  ENDERECO: "falta o endereço",
  CONFIRMACAO: "falta a confirmação",
};

function moeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Tela para a equipe conversar com a Beatriz como se fosse o cliente: serve para
// testar o atendimento e para o modo assistido (a Beatriz sugere a resposta e o
// pedido; uma pessoa confere antes de lançar no PDV).
export default function BeatrizPage() {
  const [conversa, setConversa] = useState<MensagemDaConversa[]>([]);

  const [texto, setTexto] = useState("");

  // Telefone de quem está "falando": liga a memória do cliente (etiquetas, último pedido). Aqui a equipe é quem confirma.
  const [telefone, setTelefone] = useState("");

  const [ultima, setUltima] = useState<RespostaComUso | null>(null);

  const [carregando, setCarregando] = useState(false);

  const [erro, setErro] = useState("");

  const [estado, setEstado] = useState<{ configurada: boolean; modelo: string } | null>(null);

  const fim = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void (async () => {
      try {
        const resposta = await fetch("/api/beatriz/estado", { cache: "no-store" });

        const dados = await resposta.json();

        setEstado({ configurada: Boolean(dados.configurada), modelo: dados.modelo });
      } catch {
        setEstado(null);
      }
    })();
  }, []);

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversa]);

  async function enviar() {
    const mensagem = texto.trim();

    if (!mensagem || carregando) {
      return;
    }

    const nova: MensagemDaConversa[] = [...conversa, { papel: "cliente", texto: mensagem }];

    setConversa(nova);
    setTexto("");
    setErro("");
    setCarregando(true);

    try {
      const resposta = await fetch("/api/beatriz/responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensagens: nova,
          canal: "WHATSAPP",
          rascunhoAtual: ultima?.rascunho as RascunhoDePedido | undefined,
          telefoneIdentificado: telefone.trim() || undefined,
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok || !dados.sucesso) {
        throw new Error(dados.mensagem || "A Beatriz não conseguiu responder.");
      }

      setUltima(dados.resposta);
      setConversa([...nova, { papel: "beatriz", texto: dados.resposta.resposta }]);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "A Beatriz não conseguiu responder.");
    } finally {
      setCarregando(false);
    }
  }

  function novaConversa() {
    setConversa([]);
    setUltima(null);
    setErro("");
    setTexto("");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">Inteligência</p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Beatriz</h1>

          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            A atendente por conversa do Beatus. Ela entende o cliente, tira dúvidas do cardápio e anota o pedido. Quem decide o
            que existe, o preço e o total é o sistema: tudo o que ela anota é conferido com o cardápio. Uma pessoa confere o pedido
            antes de lançá-lo no PDV. Aqui você conversa como se fosse o cliente, para testar.
          </p>
        </div>

        <button type="button" onClick={novaConversa} className="cursor-pointer rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
          Nova conversa
        </button>
      </div>

      {estado && !estado.configurada && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          A Beatriz ainda não está ligada: falta a <strong>ANTHROPIC_API_KEY</strong> no arquivo .env do servidor. Quando ela for preenchida,
          reinicie o sistema e a conversa funciona. O custo é por mensagem, pelo uso da IA.
        </div>
      )}

      {estado?.configurada && <p className="text-xs text-slate-500">IA ligada · modelo {estado.modelo}</p>}

      {erro && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <label htmlFor="telefone-do-cliente" className="block text-xs font-semibold text-slate-600">
          Telefone do cliente (opcional)
        </label>

        <input
          id="telefone-do-cliente"
          value={telefone}
          onChange={(evento) => setTelefone(evento.target.value)}
          placeholder="Ex.: 92988880001 (liga a memória: último pedido, gostos e etiquetas)"
          inputMode="tel"
          className="mt-1 w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />

        <p className="mt-1 text-xs text-slate-500">
          Com o telefone de um cliente cadastrado, a Beatriz lembra dele. Com um número novo, ela guarda o que aprender por 30 dias e passa para o cadastro quando ele fizer o primeiro pedido.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="flex min-h-[28rem] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {conversa.length === 0 && (
              <p className="text-sm text-slate-400">Escreva a primeira mensagem do cliente, por exemplo: &quot;oi, quero um burger&quot;.</p>
            )}

            {conversa.map((mensagem, indice) => (
              <div key={indice} className={`flex ${mensagem.papel === "cliente" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${mensagem.papel === "cliente" ? "bg-emerald-100 text-emerald-950" : "bg-slate-100 text-slate-900"}`}>
                  <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {mensagem.papel === "cliente" ? "Cliente" : "Beatriz"}
                  </p>

                  {mensagem.texto}
                </div>
              </div>
            ))}

            {carregando && <p className="text-xs text-slate-400">A Beatriz está respondendo...</p>}

            <div ref={fim} />
          </div>

          <div className="flex gap-2 border-t border-slate-100 p-4">
            <textarea
              aria-label="Mensagem do cliente"
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              onKeyDown={(evento) => {
                if (evento.key === "Enter" && !evento.shiftKey) {
                  evento.preventDefault();

                  void enviar();
                }
              }}
              rows={2}
              placeholder="Mensagem do cliente (Enter envia)"
              className="flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />

            <button type="button" disabled={carregando || !texto.trim()} onClick={() => void enviar()} className="cursor-pointer rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
              Enviar
            </button>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Pedido anotado</h2>

            {!ultima || ultima.rascunho.itens.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">Nada anotado ainda.</p>
            ) : (
              <>
                <ul className="mt-2 space-y-2 text-sm">
                  {ultima.rascunho.itens.map((item) => (
                    <li key={`${item.produtoId}-${item.observacao ?? ""}`}>
                      <div className="flex justify-between gap-2">
                        <span>
                          {item.quantidade}× {item.nome}
                        </span>

                        <span className="text-slate-700">{moeda(item.precoUnitario * item.quantidade)}</span>
                      </div>

                      {item.adicionais.map((adicional) => (
                        <p key={adicional.produtoId} className="pl-3 text-xs text-slate-500">
                          + {adicional.quantidade}× {adicional.nome}
                        </p>
                      ))}

                      {item.observacao && <p className="pl-3 text-xs text-amber-700">obs.: {item.observacao}</p>}
                    </li>
                  ))}
                </ul>

                <p className="mt-3 flex justify-between border-t border-slate-100 pt-2 text-sm font-bold text-slate-900">
                  <span>Subtotal</span>

                  <span>{moeda(ultima.rascunho.subtotal)}</span>
                </p>

                <p className="text-xs text-slate-400">A entrega é somada pelo endereço.</p>
              </>
            )}
          </div>

          {ultima?.memoria && (
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">O que ela sabe do cliente</h2>

              <p className="text-xs text-slate-600">
                {ultima.memoria.conhecido ? `Cliente cadastrado${ultima.memoria.nome ? `: ${ultima.memoria.nome}` : ""} · ${ultima.memoria.quantidadeDePedidos} pedido(s)` : "Ainda não é cliente cadastrado"}
                {ultima.memoria.aceitaClube ? " · aceitou o clube" : ""}
              </p>

              {ultima.memoria.ultimoPedido && (
                <p className="text-xs text-slate-600">
                  Último pedido há {ultima.memoria.ultimoPedido.diasAtras} dia(s): {ultima.memoria.ultimoPedido.itens.map((item) => `${item.quantidade}× ${item.nome}`).join(", ")}
                </p>
              )}

              {ultima.memoria.favoritos.length > 0 && <p className="text-xs text-slate-600">Mais pede: {ultima.memoria.favoritos.join(", ")}</p>}

              <div className="flex flex-wrap gap-1.5">
                {ultima.memoria.etiquetas.length === 0 && <span className="text-xs text-slate-400">Nenhuma etiqueta ainda.</span>}

                {ultima.memoria.etiquetas.map((etiqueta) => (
                  <span key={etiqueta} className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800">
                    #{etiqueta}
                  </span>
                ))}
              </div>

              {(ultima.etiquetas.adicionar.length > 0 || ultima.etiquetas.remover.length > 0 || ultima.etiquetas.recusadas.length > 0) && (
                <p className="text-xs text-slate-500">
                  Nesta mensagem: {ultima.etiquetas.adicionar.length > 0 ? `aprendeu ${ultima.etiquetas.adicionar.map((e) => `#${e}`).join(" ")}` : ""}
                  {ultima.etiquetas.remover.length > 0 ? ` esqueceu ${ultima.etiquetas.remover.map((e) => `#${e}`).join(" ")}` : ""}
                  {ultima.etiquetas.recusadas.length > 0 ? ` · o sistema recusou ${ultima.etiquetas.recusadas.length} (dado sensível ou pessoal)` : ""}
                </p>
              )}
            </div>
          )}

          {ultima && (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Para a equipe</h2>

              <p className="text-sm text-slate-700">{ultima.resumoParaOperador}</p>

              {ultima.precisaDeHumano && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
                  Precisa de uma pessoa{ultima.motivoHumano ? `: ${ultima.motivoHumano}` : "."}
                </div>
              )}

              {ultima.pedidoConfirmadoPeloCliente && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                  O cliente confirmou o pedido. Gere o link de pagamento abaixo e envie ao cliente: pago, o pedido entra sozinho na cozinha.
                </div>
              )}

              {ultima.pedidoConfirmadoPeloCliente && ultima.rascunho.itens.length > 0 && !ultima.precisaDeHumano && (
                <LinkDePagamento rascunho={ultima.rascunho} />
              )}

              <div className="flex flex-wrap gap-1.5">
                {ultima.pendencias.map((pendencia) => (
                  <span key={pendencia} className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                    {ROTULO_PENDENCIA[pendencia] ?? pendencia}
                  </span>
                ))}
              </div>

              {(ultima.cliente.nome || ultima.cliente.endereco) && (
                <dl className="space-y-0.5 text-xs text-slate-600">
                  {ultima.cliente.nome && <div><dt className="inline font-semibold">Nome: </dt><dd className="inline">{ultima.cliente.nome}</dd></div>}

                  {ultima.cliente.endereco && <div><dt className="inline font-semibold">Endereço: </dt><dd className="inline">{ultima.cliente.endereco}</dd></div>}

                  {ultima.cliente.referencia && <div><dt className="inline font-semibold">Referência: </dt><dd className="inline">{ultima.cliente.referencia}</dd></div>}
                </dl>
              )}

              {ultima.avisos.length > 0 && (
                <ul className="space-y-0.5 text-xs text-amber-700">
                  {ultima.avisos.map((aviso) => (
                    <li key={aviso}>• {aviso}</li>
                  ))}
                </ul>
              )}

              <p className="text-[11px] text-slate-400">
                {ultima.modelo} · {ultima.uso.entrada} tokens de entrada, {ultima.uso.saida} de saída
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
