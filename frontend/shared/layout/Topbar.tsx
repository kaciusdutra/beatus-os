"use client";

import Link from "next/link";

import { ROTULO_DO_PAPEL } from "@/modules/acesso/types/acesso";

import { useUsuario } from "@/shared/auth/UsuarioContext";

import { sairDoSistema } from "@/shared/auth/sessaoNoNavegador";

interface Props {
  // Abre o menu lateral (só aparece no celular).
  onMenu?: () => void;
}

export default function Topbar({ onMenu }: Props) {
  // Quem entrou no sistema. O nome dele é o que vai para o Registro de atividades.
  const usuario = useUsuario();

  const nome = usuario?.nome ?? "";

  const inicial = nome.charAt(0).toUpperCase();

  const papel = usuario ? ROTULO_DO_PAPEL[usuario.papel] : "";

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
        {/* Usuário */}
        <Link
          href="/conta"
          className="flex items-center gap-3"
          title="Minha conta"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-marca-preto font-bold text-ouro">
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
        </Link>

        <button
          type="button"
          onClick={() => void sairDoSistema()}
          className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
