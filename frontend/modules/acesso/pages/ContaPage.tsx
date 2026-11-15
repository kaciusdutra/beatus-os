"use client";

import { useState, type FormEvent } from "react";

import { chamarApi } from "@/shared/api/chamarApi";

import { useUsuario } from "@/shared/auth/UsuarioContext";

import { ROTULO_DO_PAPEL } from "../types/acesso";

const CLASSE_CAMPO =
  "w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-slate-500";

export default function ContaPage() {
  const usuario = useUsuario();

  const [atual, setAtual] = useState("");

  const [nova, setNova] = useState("");

  const [confirmacao, setConfirmacao] = useState("");

  const [erro, setErro] = useState("");

  const [aviso, setAviso] = useState("");

  async function trocar(evento: FormEvent) {
    evento.preventDefault();

    setAviso("");

    if (nova !== confirmacao) {
      setErro("As duas senhas novas não são iguais.");

      return;
    }

    try {
      setErro("");

      await chamarApi("/api/auth/senha", { corpo: { senhaAtual: atual, novaSenha: nova }, falha: "Não foi possível trocar a senha." });

      setAviso("Senha trocada. As outras entradas da sua conta foram encerradas.");
      setAtual("");
      setNova("");
      setConfirmacao("");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível trocar a senha.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <div>
        <p className="text-sm font-medium text-slate-500">Minha conta</p>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{usuario?.nome}</h1>

        <p className="mt-1 text-sm text-slate-500">
          Usuário <strong>{usuario?.login}</strong> · {usuario ? ROTULO_DO_PAPEL[usuario.papel] : ""}
        </p>
      </div>

      <form onSubmit={(evento) => void trocar(evento)} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Trocar a senha</h2>

        {erro && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>}

        {aviso && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{aviso}</p>}

        <div>
          <label htmlFor="atual" className="mb-1 block text-sm font-semibold text-slate-700">Senha atual</label>

          <input id="atual" type="password" value={atual} onChange={(evento) => setAtual(evento.target.value)} autoComplete="current-password" className={CLASSE_CAMPO} />
        </div>

        <div>
          <label htmlFor="nova" className="mb-1 block text-sm font-semibold text-slate-700">Senha nova</label>

          <input id="nova" type="password" value={nova} onChange={(evento) => setNova(evento.target.value)} autoComplete="new-password" className={CLASSE_CAMPO} />
        </div>

        <div>
          <label htmlFor="confirmacao" className="mb-1 block text-sm font-semibold text-slate-700">Repita a senha nova</label>

          <input id="confirmacao" type="password" value={confirmacao} onChange={(evento) => setConfirmacao(evento.target.value)} autoComplete="new-password" className={CLASSE_CAMPO} />
        </div>

        <button type="submit" disabled={!atual || !nova} className="cursor-pointer rounded-xl bg-marca-preto px-5 py-3 text-sm font-bold text-ouro hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40">
          Trocar a senha
        </button>
      </form>
    </div>
  );
}
