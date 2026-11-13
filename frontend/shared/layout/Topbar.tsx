"use client";

import { useEffect, useSyncExternalStore } from "react";

import { currentUser } from "@/core/permissions/currentUser";

import {
  OPERADORES,
  assinarOperador,
  guardarOperador,
  instalarOperadorNasRequisicoes,
  lerOperador,
} from "@/shared/operador/operador";

export default function Topbar() {
  // Operador provisório até o login existir (grava o nome no registro de atividades).
  const operador = useSyncExternalStore(
    assinarOperador,
    lerOperador,
    () => OPERADORES[0]
  );

  useEffect(() => {
    instalarOperadorNasRequisicoes();
  }, []);

  const nome = currentUser.nome;
  const inicial = nome.charAt(0).toUpperCase();

  const papel =
    currentUser.papel === "ADMIN"
      ? "Administrador"
      : currentUser.papel === "PRODUCAO"
        ? "Produção"
        : "Usuário";

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm print:hidden">
      {/* Identificação do sistema */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">
          Central de Operações
        </h2>

        <p className="text-xs text-slate-500">
          Beatus OS
        </p>
      </div>

      {/* Área do usuário */}
      <div className="flex items-center gap-4">
        {/* Operador */}
        <label className="flex items-center gap-2 text-xs text-slate-500">
          Operador
          <select
            value={operador}
            onChange={(evento) => guardarOperador(evento.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-semibold text-slate-800"
          >
            {OPERADORES.map((nome) => (
              <option key={nome} value={nome}>
                {nome}
              </option>
            ))}
          </select>
        </label>

        {/* Notificações */}
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg transition hover:bg-slate-50"
          aria-label="Notificações"
        >
          🔔
        </button>

        {/* Usuário */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
            {inicial}
          </div>

          <div className="hidden sm:block">
            <p className="font-semibold text-slate-800">
              {nome}
            </p>

            <p className="text-xs text-slate-500">
              {papel}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}