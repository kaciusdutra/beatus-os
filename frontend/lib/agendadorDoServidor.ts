import "server-only";

import { Agendador } from "@/core/agendador/agendador";

import { getIntegracaoMarketplaceService } from "@/modules/marketplace/services/server/integracaoMarketplaceFactory";

import { CANAIS_MARKETPLACE } from "@/modules/marketplace/types/marketplace";

import { getEnvioDeAvisosService } from "@/modules/pedidos/services/server/envioDeAvisosServiceFactory";

// As tarefas que o servidor faz sozinho, enquanto está no ar (ligado pelo instrumentation.ts):
//   - entregar os avisos pendentes do pedido (WhatsApp), a cada 15 segundos;
//   - consultar as plataformas de marketplace ligadas (iFood...), a cada 30 segundos.
// A tela da Cozinha continua chamando as mesmas rotas, o que é inofensivo: cada aviso é reservado antes de
// sair, então ninguém recebe duas vezes. Para desligar o agendador (por exemplo, numa segunda cópia do
// sistema), defina BEATUS_AGENDADOR=desligado no .env.

const global = globalThis as unknown as { __beatusAgendadorDoServidor?: Agendador };

export function iniciarAgendadorDoServidor(): boolean {
  if (process.env.BEATUS_AGENDADOR?.trim().toLowerCase() === "desligado") {
    return false;
  }

  // O estado fica em globalThis: em desenvolvimento o módulo é recarregado e duplicaria os temporizadores.
  if (global.__beatusAgendadorDoServidor) {
    return false;
  }

  const agendador = new Agendador([
    {
      nome: "avisos-do-pedido",
      intervaloMs: 15_000,
      atrasoInicialMs: 20_000,
      executar: async () => {
        await getEnvioDeAvisosService().enviarPendentes();
      },
    },
    {
      nome: "marketplaces",
      intervaloMs: 30_000,
      atrasoInicialMs: 30_000,
      executar: async () => {
        const servico = getIntegracaoMarketplaceService();

        for (const canal of CANAIS_MARKETPLACE) {
          await servico.consultar(canal);
        }
      },
    },
  ]);

  agendador.iniciar();

  global.__beatusAgendadorDoServidor = agendador;

  return true;
}
