import Link from "next/link";

import { usuarioAtualDoServidor } from "@/core/auth/usuarioDoServidor";

import { possuiPermissao } from "@/core/permissions/permissionMatrix";

export default async function ConfiguracoesPage() {
  const usuario = await usuarioAtualDoServidor();

  const gerencia = usuario !== null && possuiPermissao(usuario.papel, "configuracoes.gerenciar");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-slate-500">Módulo</p>

        <h1 className="text-3xl font-bold text-slate-800">Configurações</h1>

        <p className="mt-2 text-slate-500">Ajustes do funcionamento do Beatus.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {gerencia && (
          <Link href="/configuracoes/usuarios" className="rounded-xl border bg-white p-6 shadow-sm transition hover:bg-slate-50">
            <p className="text-lg font-bold text-slate-800">Usuários e acessos</p>

            <p className="mt-1 text-sm text-slate-500">
              Quem entra no sistema, o perfil de cada pessoa (o que ela vê e faz) e as senhas.
            </p>
          </Link>
        )}

        <Link href="/configuracoes/convite" className="rounded-xl border bg-white p-6 shadow-sm transition hover:bg-slate-50">
          <p className="text-lg font-bold text-slate-800">QR do convite</p>

          <p className="mt-1 text-sm text-slate-500">
            O QR que vai em cada pedido que sai da cozinha e convida o cliente a pedir direto, pelo site ou pelo WhatsApp.
          </p>
        </Link>

        <Link href="/configuracoes/horarios" className="rounded-xl border bg-white p-6 shadow-sm transition hover:bg-slate-50">
          <p className="text-lg font-bold text-slate-800">Horários de funcionamento</p>

          <p className="mt-1 text-sm text-slate-500">
            O horário normal da semana, as exceções por dia ou período e o calendário com os feriados.
          </p>
        </Link>

        <Link href="/financeiro/pix" className="rounded-xl border bg-white p-6 shadow-sm transition hover:bg-slate-50">
          <p className="text-lg font-bold text-slate-800">Pix</p>

          <p className="mt-1 text-sm text-slate-500">A chave Pix do Beatus e o nome que o cliente vê ao pagar.</p>
        </Link>

        <Link href="/integracoes/marketplace" className="rounded-xl border bg-white p-6 shadow-sm transition hover:bg-slate-50">
          <p className="text-lg font-bold text-slate-800">Marketplaces</p>

          <p className="mt-1 text-sm text-slate-500">iFood: aceite automático, vínculo dos itens e simulação.</p>
        </Link>
      </div>
    </div>
  );
}
