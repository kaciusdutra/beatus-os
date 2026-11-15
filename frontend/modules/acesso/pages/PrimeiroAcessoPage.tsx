"use client";

import { useEffect, useState, type FormEvent } from "react";

import { chamarApi } from "@/shared/api/chamarApi";

import MarcaDaEntrada from "../components/MarcaDaEntrada";

const CLASSE_CAMPO =
  "w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-slate-500";

export default function PrimeiroAcessoPage() {
  const [nome, setNome] = useState("");

  const [login, setLogin] = useState("");

  const [email, setEmail] = useState("");

  const [senha, setSenha] = useState("");

  const [confirmacao, setConfirmacao] = useState("");

  const [erro, setErro] = useState("");

  const [enviando, setEnviando] = useState(false);

  // Se já existe usuário, esta tela está fechada: vai para o login.
  useEffect(() => {
    void (async () => {
      try {
        const dados = await chamarApi<{ precisaDePrimeiroAcesso: boolean }>("/api/auth/status", { falha: "Não foi possível conferir o acesso." });

        if (!dados.precisaDePrimeiroAcesso) {
          window.location.replace("/login");
        }
      } catch {
        // sem resposta: continua na tela
      }
    })();
  }, []);

  async function criar(evento: FormEvent) {
    evento.preventDefault();

    if (senha !== confirmacao) {
      setErro("As duas senhas não são iguais.");

      return;
    }

    try {
      setErro("");
      setEnviando(true);

      await chamarApi("/api/auth/primeiro-acesso", { corpo: { nome, login, email, senha }, falha: "Não foi possível criar o acesso." });

      window.location.assign("/");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível criar o acesso.");

      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center gap-6 px-5 py-10">
      <MarcaDaEntrada
        titulo="Primeiro acesso"
        subtitulo="Crie o administrador do sistema. Esta tela só aparece uma vez: depois de criado, ela fecha."
      />

      <form onSubmit={(evento) => void criar(evento)} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {erro && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </p>
        )}

        <div>
          <label htmlFor="nome" className="mb-1 block text-sm font-semibold text-slate-700">Nome</label>

          <input id="nome" value={nome} onChange={(evento) => setNome(evento.target.value)} autoComplete="name" className={CLASSE_CAMPO} autoFocus />
        </div>

        <div>
          <label htmlFor="login" className="mb-1 block text-sm font-semibold text-slate-700">Usuário (para entrar)</label>

          <input
            id="login"
            value={login}
            onChange={(evento) => setLogin(evento.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="ex.: kacius"
            className={CLASSE_CAMPO}
          />

          <p className="mt-1 text-xs text-slate-400">De 3 a 30 letras minúsculas, números, ponto, hífen ou sublinhado.</p>
        </div>

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-semibold text-slate-700">E-mail (opcional)</label>

          <input id="email" type="email" value={email} onChange={(evento) => setEmail(evento.target.value)} autoComplete="email" className={CLASSE_CAMPO} />
        </div>

        <div>
          <label htmlFor="senha" className="mb-1 block text-sm font-semibold text-slate-700">Senha</label>

          <input id="senha" type="password" value={senha} onChange={(evento) => setSenha(evento.target.value)} autoComplete="new-password" className={CLASSE_CAMPO} />

          <p className="mt-1 text-xs text-slate-400">Pelo menos 8 caracteres. Uma frase longa vale mais que uma palavra com símbolos.</p>
        </div>

        <div>
          <label htmlFor="confirmacao" className="mb-1 block text-sm font-semibold text-slate-700">Repita a senha</label>

          <input id="confirmacao" type="password" value={confirmacao} onChange={(evento) => setConfirmacao(evento.target.value)} autoComplete="new-password" className={CLASSE_CAMPO} />
        </div>

        <button
          type="submit"
          disabled={enviando || !nome.trim() || !login.trim() || !senha}
          className="w-full cursor-pointer rounded-xl bg-marca-preto px-4 py-3 text-base font-bold text-ouro hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {enviando ? "Criando..." : "Criar administrador e entrar"}
        </button>
      </form>
    </div>
  );
}
