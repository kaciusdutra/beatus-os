"use client";

import { useCallback, useEffect, useState } from "react";

import QrImagem from "@/modules/qr/components/QrImagem";

import type { CobrancaPix, ConfiguracaoDoPix } from "../types/pix";

const CLASSE_CAMPO =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500";

const ROTULO_TIPO: Record<string, string> = {
  CPF: "CPF",
  CNPJ: "CNPJ",
  TELEFONE: "telefone",
  EMAIL: "e-mail",
  ALEATORIA: "chave aleatória",
};

export default function PixPage() {
  const [configuracao, setConfiguracao] = useState<ConfiguracaoDoPix | null>(null);

  const [chave, setChave] = useState("");

  const [nome, setNome] = useState("");

  const [cidade, setCidade] = useState("");

  const [teste, setTeste] = useState<CobrancaPix | null>(null);

  const [erro, setErro] = useState("");

  const [mensagem, setMensagem] = useState("");

  const carregar = useCallback(async () => {
    const resposta = await fetch("/api/pix/configuracao", { cache: "no-store" });

    const dados = await resposta.json();

    if (!resposta.ok || !dados.sucesso) {
      throw new Error(dados.mensagem || "Não foi possível ler a configuração do Pix.");
    }

    setConfiguracao(dados.configuracao);
    setChave(dados.configuracao.chave ?? "");
    setNome(dados.configuracao.nomeRecebedor ?? "");
    setCidade(dados.configuracao.cidade ?? "");
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await carregar();

        setErro("");
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível ler a configuração do Pix.");
      }
    })();
  }, [carregar]);

  async function salvar() {
    try {
      setErro("");
      setMensagem("");
      setTeste(null);

      const resposta = await fetch("/api/pix/configuracao", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chave, nomeRecebedor: nome, cidade }),
      });

      const dados = await resposta.json();

      if (!resposta.ok || !dados.sucesso) {
        throw new Error(dados.mensagem || "Não foi possível salvar.");
      }

      setMensagem("Pix configurado. Gere o código de teste e confira no seu banco antes de cobrar um cliente.");

      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
  }

  async function gerarTeste() {
    try {
      setErro("");

      const resposta = await fetch("/api/pix/teste", { cache: "no-store" });

      const dados = await resposta.json();

      if (!resposta.ok || !dados.sucesso) {
        throw new Error(dados.mensagem || "Não foi possível gerar o teste.");
      }

      setTeste(dados.cobranca);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível gerar o teste.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-slate-500">Financeiro</p>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Pix</h1>

        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          A chave Pix do Beatus e o nome que o cliente vê ao pagar. Com isso, o PDV gera o Pix copia e cola de cada pedido, com o
          valor exato calculado pelo servidor. O dinheiro cai direto na sua conta; quando você vir o valor no app do banco, marca
          &quot;Pagamento recebido&quot; no PDV. A confirmação automática vem depois, com um banco ou intermediário de pagamento.
        </p>
      </div>

      {erro && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}

      {mensagem && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{mensagem}</div>}

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Dados do recebedor</h2>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-1">
            <label htmlFor="pix-chave" className="mb-1 block text-xs font-semibold text-slate-600">Chave Pix</label>

            <input id="pix-chave" value={chave} onChange={(evento) => setChave(evento.target.value)} placeholder="CPF, CNPJ, e-mail, telefone ou aleatória" className={CLASSE_CAMPO} />

            {configuracao?.tipoDaChave && (
              <p className="mt-1 text-xs text-slate-500">Reconhecida como {ROTULO_TIPO[configuracao.tipoDaChave]}.</p>
            )}
          </div>

          <div>
            <label htmlFor="pix-nome" className="mb-1 block text-xs font-semibold text-slate-600">Nome do recebedor (até 25 letras)</label>

            <input id="pix-nome" value={nome} onChange={(evento) => setNome(evento.target.value)} placeholder="Beatus Burger" className={CLASSE_CAMPO} />
          </div>

          <div>
            <label htmlFor="pix-cidade" className="mb-1 block text-xs font-semibold text-slate-600">Cidade (até 15 letras)</label>

            <input id="pix-cidade" value={cidade} onChange={(evento) => setCidade(evento.target.value)} placeholder="Manaus" className={CLASSE_CAMPO} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void salvar()} className="cursor-pointer rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
            Salvar
          </button>

          <button type="button" disabled={!configuracao?.configurado} onClick={() => void gerarTeste()} className="cursor-pointer rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
            Gerar Pix de teste (R$ 1,00)
          </button>

          <span className={`text-xs font-semibold ${configuracao?.configurado ? "text-emerald-700" : "text-amber-700"}`}>
            {configuracao?.configurado ? "Pix configurado" : "Ainda não configurado"}
          </span>
        </div>
      </section>

      {teste && (
        <section className="space-y-3 rounded-2xl border border-sky-200 bg-sky-50 p-5">
          <h2 className="text-lg font-bold text-sky-900">Pix de teste: R$ 1,00</h2>

          <p className="text-sm text-sky-900">
            Copie o código abaixo e cole em <strong>Pix → Pix copia e cola</strong> no app do seu banco. Antes de pagar, confira se
            aparecem o nome <strong>{teste.recebedor.nome}</strong> e o valor <strong>R$ 1,00</strong>. Não precisa pagar: é só para
            validar o código.
          </p>

          <div className="flex justify-center rounded-lg bg-white p-3">
            <QrImagem conteudo={teste.copiaECola} lado={240} className="h-44 w-44" />
          </div>

          <textarea readOnly aria-label="Pix de teste" value={teste.copiaECola} rows={4} onFocus={(evento) => evento.currentTarget.select()} className="w-full resize-none rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs" />

          <button type="button" onClick={() => void navigator.clipboard?.writeText(teste.copiaECola)} className="cursor-pointer rounded-lg bg-sky-700 px-4 py-2 text-xs font-bold text-white hover:bg-sky-800">
            Copiar
          </button>
        </section>
      )}
    </div>
  );
}
