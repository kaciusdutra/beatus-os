"use client";

import { currentUser } from "@/core/permissions/currentUser";

export default function Topbar() {
  const nome = currentUser.nome;
  const inicial = nome.charAt(0).toUpperCase();

  const papel =
    currentUser.papel === "ADMIN"
      ? "Administrador"
      : currentUser.papel === "PRODUCAO"
        ? "Produção"
        : "Usuário";

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
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