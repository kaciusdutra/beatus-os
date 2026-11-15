"use client";

import { useEffect, useState, type FormEvent } from "react";

import { chamarApi } from "@/shared/api/chamarApi";

import MarcaDaEntrada from "../components/MarcaDaEntrada";

const CLASSE_CAMPO =
  "w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-slate-500";

// Só caminhos do próprio sistema (nunca um endereço de fora).
function destinoSeguro(proximo: string | undefined): string {
  return proximo && proximo.startsWith("/") && !proximo.startsWith("//") && !proximo.startsWith("/login") ? proximo : "/";
}

export default function LoginPage({ proximo }: { proximo?: string }) {
  const [login, setLogin] = useState("");

  const [senha, setSenha] = useState("");

  const [erro, setErro] = useState("");

  const [enviando, setEnviando] = useState(false);

  // Sistema novo, sem nenhum usuário: leva ao primeiro acesso.
  useEffect(() => {
    void (async () => {
      try {
        const dados = await chamarApi<{ precisaDePrimeiroAcesso: boolean }>("/api/auth/status", { falha: "Não foi possível conferir o acesso." });

        if (dados.precisaDePrimeiroAcesso) {
          window.location.replace("/primeiro-acesso");
        }
      } catch {
        // sem resposta: continua na tela de entrada
      }
    })();
  }, []);

  async function entrar(evento: FormEvent) {
    evento.preventDefault();

    try {
      setErro("");
      setEnviando(true);

      await chamarApi("/api/auth/login", { corpo: { login, senha }, falha: "Não foi possível entrar." });

      // Recarrega por inteiro para o menu e o nome já virem do usuário que entrou.
      window.location.assign(destinoSeguro(proximo));
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível entrar.");

      setSenha("");
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center gap-6 px-5 py-10">
      <MarcaDaEntrada titulo="Entrar no sistema" subtitulo="Use o seu nome de usuário e a sua senha." />

      <form onSubmit={(evento) => void entrar(evento)} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {erro && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </p>
        )}

        <div>
          <label htmlFor="login" className="mb-1 block text-sm font-semibold text-slate-700">
            Usuário
          </label>

          <input
            id="login"
            name="login"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={login}
            onChange={(evento) => setLogin(evento.target.value)}
            className={CLASSE_CAMPO}
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="senha" className="mb-1 block text-sm font-semibold text-slate-700">
            Senha
          </label>

          <input
            id="senha"
            name="senha"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
            className={CLASSE_CAMPO}
          />
        </div>

        <button
          type="submit"
          disabled={enviando || !login.trim() || !senha}
          className="w-full cursor-pointer rounded-xl bg-marca-preto px-4 py-3 text-base font-bold text-ouro hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {enviando ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p className="text-center text-xs text-slate-400">Esqueceu a senha? Peça ao administrador para criar uma nova.</p>
    </div>
  );
}
