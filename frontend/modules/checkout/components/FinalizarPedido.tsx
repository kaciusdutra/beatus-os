"use client";

import { useState, type FormEvent } from "react";

import Link from "next/link";

import { formatarCpf, formatarTelefone, somenteDigitos } from "@/modules/fornecedores/domain/documentoFornecedor";

import { useCarrinho } from "@/modules/site/components/carrinhoStore";

import { dinheiro, totalDoCarrinho, type ItemDoCarrinho } from "@/modules/site/services/carrinho";

import type { OrigemDoCheckout } from "../services/entradaDoCheckout";

import { lerCampanhaGuardada } from "@/modules/site/services/campanhaGuardada";

import { lerCodigoDaVantagem } from "@/modules/clube/vantagemGuardada";

import type { Estimativa } from "../types/checkout";

const CAMPO =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-base text-white placeholder:text-slate-500 outline-none focus:border-ouro";

const ROTULO = "mb-1 block text-sm font-semibold text-slate-200";

async function chamar<T>(url: string, corpo?: unknown): Promise<T> {
  const resposta = await fetch(url, {
    method: corpo ? "POST" : "GET",
    headers: corpo ? { "Content-Type": "application/json" } : undefined,
    body: corpo ? JSON.stringify(corpo) : undefined,
    cache: "no-store",
  });

  let dados: { sucesso?: boolean; mensagem?: string } | null = null;

  try {
    dados = await resposta.json();
  } catch {
    dados = null;
  }

  if (!resposta.ok || !dados || dados.sucesso === false) {
    throw new Error(dados?.mensagem || "Não foi possível concluir agora. Tente de novo.");
  }

  return dados as T;
}

interface Props {
  recebePedidos: boolean;
  textoDeFuncionamento: string;
  // Itens vindos do link da Beatriz (no lugar do carrinho do navegador).
  itensDoLink?: ItemDoCarrinho[];
  origem?: OrigemDoCheckout;
  telefoneDoLink?: string;
  avisoDoLink?: string;
}

export default function FinalizarPedido({ recebePedidos, textoDeFuncionamento, itensDoLink, origem = "CARDAPIO_ONLINE", telefoneDoLink, avisoDoLink }: Props) {
  const itensDoCarrinho = useCarrinho();

  const itens = itensDoLink ?? itensDoCarrinho;

  const [nome, setNome] = useState("");

  const [telefone, setTelefone] = useState(() => (telefoneDoLink ? formatarTelefone(telefoneDoLink) : ""));

  const [cpf, setCpf] = useState("");

  const [email, setEmail] = useState("");

  const [dataNascimento, setDataNascimento] = useState("");

  const [cep, setCep] = useState("");

  const [logradouro, setLogradouro] = useState("");

  const [numero, setNumero] = useState("");

  const [complemento, setComplemento] = useState("");

  const [bairro, setBairro] = useState("");

  const [cidade, setCidade] = useState("");

  const [estado, setEstado] = useState("");

  const [aceitaPolitica, setAceitaPolitica] = useState(false);

  const [aceitaMarketing, setAceitaMarketing] = useState(false);

  const [estimativa, setEstimativa] = useState<Estimativa | null>(null);

  const [erro, setErro] = useState("");

  const [aviso, setAviso] = useState("");

  const [ocupado, setOcupado] = useState(false);

  const montarCorpo = () => ({
    origem,
    // Campanha de anúncio de onde o cliente veio (o servidor limpa e confere de novo).
    origemDaCampanha: lerCampanhaGuardada(localStorage, Date.now()),
    // Clube: o cartão cuja vantagem o cliente escolheu (o servidor confere tudo no banco).
    vantagem: lerCodigoDaVantagem(localStorage) ? { codigoDoCartao: lerCodigoDaVantagem(localStorage) } : undefined,
    cliente: { nome, telefone, cpf, email, dataNascimento },
    endereco: { cep, logradouro, numero, complemento, bairro, cidade, estado },
    itens: itens.map((item) => ({ produtoId: item.id, quantidade: item.quantidade })),
    consentimentos: { aceitaPolitica, aceitaMarketing },
  });

  async function aoMudarCep(valor: string) {
    const formatado = somenteDigitos(valor).slice(0, 8);

    setCep(formatado.length > 5 ? `${formatado.slice(0, 5)}-${formatado.slice(5)}` : formatado);
    setEstimativa(null);

    if (formatado.length !== 8) {
      return;
    }

    try {
      setAviso("");

      const dados = await chamar<{ endereco: { logradouro?: string; bairro?: string; municipio: string; uf: string } }>(`/api/publico/cep/${formatado}`);

      setLogradouro(dados.endereco.logradouro ?? "");
      setBairro(dados.endereco.bairro ?? "");
      setCidade(dados.endereco.municipio);
      setEstado(dados.endereco.uf);
    } catch (error) {
      setAviso(error instanceof Error ? error.message : "Preencha o endereço à mão.");
    }
  }

  async function calcular() {
    try {
      setErro("");
      setOcupado(true);

      const dados = await chamar<{ estimativa: Estimativa }>("/api/publico/checkout/estimativa", montarCorpo());

      setEstimativa(dados.estimativa);
    } catch (error) {
      setEstimativa(null);
      setErro(error instanceof Error ? error.message : "Não foi possível calcular.");
    } finally {
      setOcupado(false);
    }
  }

  async function finalizar(evento: FormEvent) {
    evento.preventDefault();

    try {
      setErro("");
      setOcupado(true);

      const dados = await chamar<{ checkoutUrl: string }>("/api/publico/checkout", montarCorpo());

      // Vai para a página de pagamento do Mercado Pago (o cartão é digitado lá).
      window.location.assign(dados.checkoutUrl);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível finalizar.");
      setOcupado(false);
    }
  }

  if (itens.length === 0) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-16 text-center">
        <h1 className="font-display text-3xl font-bold text-ouro">Seu carrinho está vazio</h1>

        <p className="mt-2 text-slate-300">Escolha algo no cardápio para fazer o pedido.</p>

        {avisoDoLink && <p className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{avisoDoLink}</p>}

        <Link href="/cardapio" className="mt-6 inline-block rounded-xl bg-ouro px-6 py-3 font-bold text-black hover:bg-ouro-400">
          Ver o cardápio
        </Link>
      </div>
    );
  }

  const subtotalDoCarrinho = totalDoCarrinho(itens);

  return (
    <form onSubmit={(evento) => void finalizar(evento)} className="mx-auto w-full max-w-2xl space-y-8 px-4 py-10">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-ouro">Finalizar pedido</h1>

        <p className="mt-1 text-sm text-slate-400">Confira os dados. O pagamento é feito no ambiente seguro do Mercado Pago (Pix, crédito ou débito à vista).</p>
      </div>

      {avisoDoLink && <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{avisoDoLink}</p>}

      {!recebePedidos && <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">Não estamos recebendo pedidos agora. {textoDeFuncionamento}</p>}

      {erro && (
        <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {erro}
        </p>
      )}

      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-white">Seus dados</h2>

        <div>
          <label htmlFor="nome" className={ROTULO}>Nome</label>

          <input id="nome" value={nome} onChange={(evento) => setNome(evento.target.value)} autoComplete="name" className={CAMPO} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="telefone" className={ROTULO}>Telefone (WhatsApp)</label>

            <input id="telefone" inputMode="tel" value={telefone} onChange={(evento) => setTelefone(formatarTelefone(evento.target.value))} autoComplete="tel" placeholder="(92) 99999-9999" className={CAMPO} />
          </div>

          <div>
            <label htmlFor="cpf" className={ROTULO}>CPF</label>

            <input id="cpf" inputMode="numeric" value={cpf} onChange={(evento) => setCpf(formatarCpf(evento.target.value))} placeholder="000.000.000-00" className={CAMPO} />

            <p className="mt-1 text-xs text-slate-500">Exigido pelo pagamento. Não aparece para ninguém.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="email" className={ROTULO}>E-mail (opcional)</label>

            <input id="email" type="email" value={email} onChange={(evento) => setEmail(evento.target.value)} autoComplete="email" className={CAMPO} />
          </div>

          <div>
            <label htmlFor="nascimento" className={ROTULO}>Data de nascimento (opcional)</label>

            <input id="nascimento" type="date" value={dataNascimento} onChange={(evento) => setDataNascimento(evento.target.value)} autoComplete="bday" className={CAMPO} />

            <p className="mt-1 text-xs text-slate-500">Para uma surpresa no seu aniversário.</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-white">Entrega</h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="cep" className={ROTULO}>CEP</label>

            <input id="cep" inputMode="numeric" value={cep} onChange={(evento) => void aoMudarCep(evento.target.value)} autoComplete="postal-code" placeholder="00000-000" className={CAMPO} />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="logradouro" className={ROTULO}>Rua</label>

            <input id="logradouro" value={logradouro} onChange={(evento) => { setLogradouro(evento.target.value); setEstimativa(null); }} autoComplete="address-line1" className={CAMPO} />
          </div>
        </div>

        {aviso && <p className="text-sm text-amber-200">{aviso}</p>}

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="numero" className={ROTULO}>Número</label>

            <input id="numero" value={numero} onChange={(evento) => { setNumero(evento.target.value); setEstimativa(null); }} className={CAMPO} />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="complemento" className={ROTULO}>Complemento (opcional)</label>

            <input id="complemento" value={complemento} onChange={(evento) => setComplemento(evento.target.value)} placeholder="Apto, bloco, ponto de referência" className={CAMPO} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="bairro" className={ROTULO}>Bairro</label>

            <input id="bairro" value={bairro} onChange={(evento) => setBairro(evento.target.value)} className={CAMPO} />
          </div>

          <div>
            <label htmlFor="cidade" className={ROTULO}>Cidade</label>

            <input id="cidade" value={cidade} onChange={(evento) => setCidade(evento.target.value)} className={CAMPO} />
          </div>

          <div>
            <label htmlFor="estado" className={ROTULO}>Estado (UF)</label>

            <input id="estado" value={estado} maxLength={2} onChange={(evento) => setEstado(evento.target.value.toUpperCase())} className={CAMPO} />
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-display text-xl font-bold text-white">Resumo</h2>

        <ul className="space-y-1 text-sm text-slate-300">
          {itens.map((item) => (
            <li key={item.id} className="flex justify-between gap-3">
              <span>
                {item.quantidade} × {item.nome}
              </span>

              <span>{dinheiro(item.preco * item.quantidade)}</span>
            </li>
          ))}
        </ul>

        <div className="space-y-1 border-t border-white/10 pt-3 text-sm">
          <div className="flex justify-between text-slate-300">
            <span>Itens</span>

            <span>{dinheiro(estimativa?.subtotal ?? subtotalDoCarrinho)}</span>
          </div>

          {estimativa?.vantagem && (
            <div className="flex justify-between text-ouro">
              <span>Vantagem do clube{estimativa.vantagem.nome ? ` (${estimativa.vantagem.nome})` : ""}</span>

              <span>− {dinheiro(estimativa.vantagem.valorNosItens + estimativa.vantagem.valorNaEntrega)}</span>
            </div>
          )}

          <div className="flex justify-between text-slate-300">
            <span>Entrega</span>

            <span>{estimativa ? (estimativa.taxaEntrega === 0 ? "Grátis" : dinheiro(estimativa.taxaEntrega)) : "calcule abaixo"}</span>
          </div>

          <div className="flex justify-between pt-1 text-lg font-bold text-white">
            <span>Total</span>

            <span className="text-ouro">{estimativa ? dinheiro(estimativa.total) : "—"}</span>
          </div>
        </div>

        <button type="button" onClick={() => void calcular()} disabled={ocupado} className="w-full cursor-pointer rounded-xl border border-ouro px-4 py-3 font-bold text-ouro hover:bg-ouro/10 disabled:opacity-50">
          Calcular a entrega e o total
        </button>

        <p className="text-xs text-slate-500">O valor final é sempre o calculado pelo nosso sistema, com o preço do cardápio e a taxa do seu endereço.</p>
      </section>

      <section className="space-y-3">
        <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-200">
          <input type="checkbox" checked={aceitaPolitica} onChange={(evento) => setAceitaPolitica(evento.target.checked)} className="mt-1 h-4 w-4" />

          <span>
            Li e aceito a{" "}
            <Link href="/cardapio/privacidade" target="_blank" className="font-semibold text-ouro underline">
              política de privacidade
            </Link>
            . (obrigatório)
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-200">
          <input type="checkbox" checked={aceitaMarketing} onChange={(evento) => setAceitaMarketing(evento.target.checked)} className="mt-1 h-4 w-4" />

          <span>Quero receber promoções e novidades do Beatus pelo WhatsApp. (opcional; você pode cancelar quando quiser)</span>
        </label>
      </section>

      <button type="submit" disabled={ocupado || !recebePedidos || !aceitaPolitica} className="w-full cursor-pointer rounded-xl bg-ouro px-6 py-4 text-lg font-bold text-black hover:bg-ouro-400 disabled:cursor-not-allowed disabled:opacity-40">
        {ocupado ? "Aguarde..." : "Ir para o pagamento"}
      </button>
    </form>
  );
}
