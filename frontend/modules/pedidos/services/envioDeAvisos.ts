// Envio dos avisos do pedido (fase 3a da Beatriz). Lê a fila de avisos (tabela AvisoDoPedido, gravada
// pela Cozinha) e entrega cada um ao cliente:
//   - aviso do WhatsApp: sai pela API oficial da Meta (só se a conexão estiver configurada);
//   - aviso do site: não sai de lugar nenhum, a página do pedido já mostra a etapa (fica DISPENSADO).
// Sem a conexão com a Meta nada é enviado e os avisos do WhatsApp seguem "aguardando envio".

import type { CanalDoAviso, EventoDoAviso } from "./avisoDoPedido";

// Aviso com mais de 6 horas não sai mais: "a caminho" depois de o pedido ter sido entregue confunde o cliente.
export const VALIDADE_DO_AVISO_MS = 6 * 60 * 60 * 1000;

export const MAXIMO_DE_TENTATIVAS = 3;

export interface AvisoParaEnviar {
  id: string;
  evento: EventoDoAviso;
  canal: CanalDoAviso;
  texto: string;
  tentativas: number;
  criadoEm: Date;
  numeroDoPedido: string;
  situacaoDoPedido: string;
  telefoneDoCliente?: string;
}

export interface MensagemDeAviso {
  // Telefone com DDI, só dígitos (ex.: 5592988880001)
  telefone: string;
  evento: EventoDoAviso;
  numeroDoPedido: string;
  texto: string;
}

// Quem entrega a mensagem (a API da Meta). Falha definitiva (telefone recusado, mensagem fora das regras)
// não adianta repetir; falha passageira (rede, limite, servidor fora do ar) tenta de novo no próximo ciclo.
export interface EnviadorDeAviso {
  enviar(mensagem: MensagemDeAviso): Promise<{ idExterno?: string }>;
}

export class ErroDeEnvio extends Error {
  constructor(
    mensagem: string,
    readonly definitivo: boolean
  ) {
    super(mensagem);
    this.name = "ErroDeEnvio";
  }
}

export interface FilaDeAvisosPort {
  pendentes(limite: number): Promise<AvisoParaEnviar[]>;

  // Reserva o aviso para esta execução (duas telas abertas não mandam o mesmo aviso duas vezes).
  reservar(id: string, tentativasAtuais: number): Promise<boolean>;

  marcarEnviado(id: string, quando: Date): Promise<void>;

  marcarDispensado(id: string, motivo: string): Promise<void>;

  // finalizar = true: FALHOU de vez; false: continua PENDENTE para outra tentativa.
  registrarFalha(id: string, erro: string, finalizar: boolean): Promise<void>;
}

export interface ResultadoDoEnvio {
  // false: a conexão com o WhatsApp não está configurada (os avisos do WhatsApp ficaram esperando)
  configurado: boolean;
  enviados: number;
  dispensados: number;
  falhas: number;
  adiados: number;
}

// Telefone do cadastro (DDD + número, com ou sem máscara) para o formato do WhatsApp (DDI 55, só dígitos).
export function telefoneParaWhatsapp(telefone: string | undefined | null): string | undefined {
  const digitos = (telefone ?? "").replace(/\D/g, "");

  let nacional = digitos;

  if (digitos.startsWith("55") && (digitos.length === 12 || digitos.length === 13)) {
    nacional = digitos.slice(2);
  }

  // DDD (2 dígitos, sem zero na frente) + 8 dígitos (fixo) ou 9 dígitos começando em 9 (celular)
  if (!/^[1-9][1-9]/.test(nacional)) {
    return undefined;
  }

  if (nacional.length === 11 && nacional[2] === "9") {
    return `55${nacional}`;
  }

  if (nacional.length === 10) {
    return `55${nacional}`;
  }

  return undefined;
}

export class EnvioDeAvisosService {
  constructor(
    private readonly dependencias: {
      fila: FilaDeAvisosPort;
      // Nulo quando a conexão com a Meta não está configurada.
      enviador: EnviadorDeAviso | null;
      agora?: () => Date;
    }
  ) {}

  async enviarPendentes(limite = 20): Promise<ResultadoDoEnvio> {
    const { fila, enviador } = this.dependencias;

    const agora = (this.dependencias.agora ?? (() => new Date()))();

    const resultado: ResultadoDoEnvio = { configurado: enviador !== null, enviados: 0, dispensados: 0, falhas: 0, adiados: 0 };

    for (const aviso of await fila.pendentes(limite)) {
      // Aviso do site: a página do pedido já mostra a etapa.
      if (aviso.canal === "SITE") {
        await fila.marcarDispensado(aviso.id, "Mostrado na página do pedido no site.");

        resultado.dispensados += 1;

        continue;
      }

      if (aviso.situacaoDoPedido === "CANCELADO") {
        await fila.marcarDispensado(aviso.id, "Pedido cancelado antes do aviso.");

        resultado.dispensados += 1;

        continue;
      }

      if (agora.getTime() - aviso.criadoEm.getTime() > VALIDADE_DO_AVISO_MS) {
        await fila.marcarDispensado(aviso.id, "Passou da hora: o aviso tinha mais de 6 horas.");

        resultado.dispensados += 1;

        continue;
      }

      if (!enviador) {
        resultado.adiados += 1;

        continue;
      }

      const telefone = telefoneParaWhatsapp(aviso.telefoneDoCliente);

      if (!telefone) {
        await fila.registrarFalha(aviso.id, "Telefone do cliente inválido para o WhatsApp.", true);

        resultado.falhas += 1;

        continue;
      }

      // Outra tela pode ter pegado este aviso um instante antes.
      if (!(await fila.reservar(aviso.id, aviso.tentativas))) {
        continue;
      }

      try {
        await enviador.enviar({ telefone, evento: aviso.evento, numeroDoPedido: aviso.numeroDoPedido, texto: aviso.texto });

        await fila.marcarEnviado(aviso.id, agora);

        resultado.enviados += 1;
      } catch (error) {
        const mensagem = error instanceof Error ? error.message : "Falha ao enviar o aviso.";

        const definitivo = error instanceof ErroDeEnvio ? error.definitivo : false;

        const esgotou = aviso.tentativas + 1 >= MAXIMO_DE_TENTATIVAS;

        await fila.registrarFalha(aviso.id, mensagem, definitivo || esgotou);

        if (definitivo || esgotou) {
          resultado.falhas += 1;
        } else {
          resultado.adiados += 1;
        }
      }
    }

    return resultado;
  }
}
