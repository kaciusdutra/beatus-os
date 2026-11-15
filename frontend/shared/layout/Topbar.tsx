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

interface Props {
  // Abre o menu lateral (só aparece no celular).
  onMenu?: () => void;
}

export default function Topbar({ onMenu }: Props) {
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
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 shadow-sm sm:px-6 print:hidden">
      {/* Identificação do sistema */}
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onMenu}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg lg:hidden"
          aria-label="Abrir o menu"
        >
          ☰
        </button>

        <div className="min-w-0">
          <h2 className="truncate text-base font-bold text-slate-800 sm:text-xl">
            Central de Operações
          </h2>

          <p className="hidden text-xs text-slate-500 sm:block">
            Beatus OS
          </p>
        </div>
      </div>

      {/* Área do usuário */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Operador */}
        <label className="flex items-center gap-2 text-xs text-slate-500">
          <span className="hidden sm:inline">Operador</span>
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
          className="hidden h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg transition hover:bg-slate-50 sm:flex"
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