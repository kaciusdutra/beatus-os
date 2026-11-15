"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSystem } from "@/core/system/SystemContext";
import { moduleRegistry } from "@/core/modules/moduleRegistry";
import { verificarAcesso } from "@/core/permissions/accessControl";

interface Props {
  // No celular o menu é uma gaveta: `aberto` mostra, `onNavegar` fecha ao tocar num link.
  aberto?: boolean;
  onNavegar?: () => void;
}

export default function Sidebar({ aberto = false, onNavegar }: Props) {
  const pathname = usePathname();

  const { systemState } = useSystem();

  const operationState = systemState.operation;

  const operacaoAtiva =
    operationState === "OPERANDO";

  function obterDescricaoEstado() {
    switch (operationState) {
      case "CHECKLIST":
        return "Checklist";

      case "AGUARDANDO_ABERTURA":
        return "Aguardando abertura";

      case "OPERANDO":
        return "Operando";

      case "FECHAMENTO":
        return "Fechamento";

      case "FECHADA":
      default:
        return "Fechada";
    }
  }

  function obterIconeEstado() {
    switch (operationState) {
      case "OPERANDO":
        return "🟢";

      case "AGUARDANDO_ABERTURA":
        return "🟡";

      case "CHECKLIST":
        return "📋";

      case "FECHAMENTO":
        return "🟠";

      case "FECHADA":
      default:
        return "🔴";
    }
  }

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col bg-slate-950 text-white transition-transform duration-200 lg:static lg:z-auto lg:min-h-screen lg:translate-x-0 print:hidden ${
        aberto ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Identidade */}
      <div className="border-b border-slate-800 p-6">
        <div className="flex items-center gap-3">
          <Image
            src="/marca/beatus-simbolo.svg"
            alt=""
            width={40}
            height={36}
            unoptimized
            priority
          />

          <div>
            <div className="font-display text-xl font-extrabold leading-none tracking-wide text-ouro">
              BEATUS
            </div>

            <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-slate-300">
              Burger Delivery
            </p>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Sistema Operacional
        </p>
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-2">
          {moduleRegistry.map((module) => {
            const acesso =
              verificarAcesso(
                module.permissaoVisualizacao
              );

            const bloqueadoPorOperacao =
              module.requerOperacao &&
              !operacaoAtiva;

            const ativo =
              pathname === module.rota;

            /*
             * O módulo só fica realmente navegável
             * quando possui permissão e a operação
             * permite seu funcionamento.
             */
            const bloqueado =
              !acesso.permitido ||
              bloqueadoPorOperacao;

            return (
              <li key={module.id}>
                {bloqueado ? (
                  <div
                    className="flex cursor-not-allowed items-center gap-3 rounded-lg px-4 py-3 opacity-40"
                    title={
                      !acesso.permitido
                        ? "Seu perfil não possui acesso a este módulo"
                        : "Disponível quando a operação estiver ativa"
                    }
                  >
                    <span>
                      {module.icone}
                    </span>

                    <span className="flex-1">
                      {module.titulo}
                    </span>

                    <span>
                      🔒
                    </span>
                  </div>
                ) : (
                  <Link
                    href={module.rota}
                    className={`flex items-center gap-3 rounded-lg px-4 py-3 transition ${
                      ativo
                        ? "bg-ouro font-semibold text-black"
                        : "hover:bg-slate-800"
                    }`}
                  >
                    <span>
                      {module.icone}
                    </span>

                    <span className="flex-1">
                      {module.titulo}
                    </span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-slate-800 p-4">
        <Link
          href="/celular"
          onClick={onNavegar}
          className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition hover:bg-slate-800"
        >
          <span>📱</span>

          <span>Modo celular</span>
        </Link>
      </div>

      {/* Estado operacional */}
      <div className="border-t border-slate-800 p-4">
        <div className="text-xs text-slate-400">
          Estado da operação
        </div>

        <div className="mt-2 flex items-center gap-2 text-sm font-semibold">
          <span>
            {obterIconeEstado()}
          </span>

          <span>
            {obterDescricaoEstado()}
          </span>
        </div>
      </div>
    </aside>
  );
}