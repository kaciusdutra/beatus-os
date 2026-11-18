// As regras do cartão de selos (seção 28 das regras), sem banco: dado o cartão e o pedido entregue, o que acontece.
// Os números vêm de regras.ts. Tudo aqui é função pura, para testar cada caso.

import { DIAS_DE_VALIDADE_DA_VANTAGEM, DIAS_PARA_O_CARTAO_REINICIAR, SELOS_PARA_A_VANTAGEM, VALOR_MINIMO_DO_SELO } from "./regras";

const MS_POR_DIA = 24 * 60 * 60 * 1000;

export interface CartaoParaDecidir {
  ativadoEm: Date;
  ciclo: number;
  cicloIniciadoEm: Date;
  ultimoPedidoEm: Date | null;
  completoEm: Date | null;
  // Quantos selos o ciclo atual já tem.
  selosNoCiclo: number;
}

export type MotivoSemSelo =
  | "CLUBE_DESLIGADO"
  | "CANAL_NAO_CONTA"
  | "SEM_CARTAO"
  | "SEM_ACEITE"
  | "ANTERIOR_AO_ACEITE"
  | "AGUARDANDO_RESGATE"
  | "ABAIXO_DO_MINIMO"
  // O banco já tinha o selo deste pedido (só o serviço devolve este motivo).
  | "JA_CREDITADO";

export interface DecisaoDoSelo {
  creditar: boolean;
  motivo?: MotivoSemSelo;
  // O ciclo reiniciou antes deste pedido (60 dias sem pedir, ou a vantagem ganha venceu).
  reiniciar: boolean;
  // O ciclo em que o selo conta (já considerando o reinício).
  ciclo: number;
  // Quantos selos o ciclo tem depois deste pedido.
  selosApos: number;
  // Este selo completa o cartão.
  completa: boolean;
  // O cartão guarda este pedido como o último entregue (conta os 60 dias).
  atualizarUltimoPedido: boolean;
}

export interface EntradaDaDecisao {
  // O clube está ligado (CLUBE_ATIVO).
  ativo: boolean;
  // Site, WhatsApp ou PDV (marketplace não conta).
  canalProprio: boolean;
  clienteAceita: boolean;
  cartao: CartaoParaDecidir | null;
  pedido: {
    criadoEm: Date;
    // Os itens, sem a entrega e já com os descontos.
    valorDosItens: number;
  };
  // O momento da entrega.
  agora: Date;
}

function semSelo(motivo: MotivoSemSelo, cartao: CartaoParaDecidir | null, atualizarUltimoPedido = false, reiniciar = false): DecisaoDoSelo {
  return {
    creditar: false,
    motivo,
    reiniciar,
    ciclo: cartao ? cartao.ciclo + (reiniciar ? 1 : 0) : 0,
    selosApos: reiniciar ? 0 : (cartao?.selosNoCiclo ?? 0),
    completa: false,
    atualizarUltimoPedido,
  };
}

// O cartão já passou da hora de reiniciar? Vale para o momento `agora` (na entrega e na página do cartão).
export function cartaoVenceu(cartao: Pick<CartaoParaDecidir, "cicloIniciadoEm" | "ultimoPedidoEm" | "completoEm">, agora: Date): boolean {
  if (cartao.completoEm) {
    return agora.getTime() > cartao.completoEm.getTime() + DIAS_DE_VALIDADE_DA_VANTAGEM * MS_POR_DIA;
  }

  const ultimaAtividade = cartao.ultimoPedidoEm ?? cartao.cicloIniciadoEm;

  return agora.getTime() > ultimaAtividade.getTime() + DIAS_PARA_O_CARTAO_REINICIAR * MS_POR_DIA;
}

// O que fazer quando um pedido vira "Entregue" (regras 28.2 a 28.4 e 28.11).
export function decidirSelo(entrada: EntradaDaDecisao): DecisaoDoSelo {
  const { cartao, pedido, agora } = entrada;

  if (!entrada.ativo) {
    return semSelo("CLUBE_DESLIGADO", cartao);
  }

  if (!entrada.canalProprio) {
    return semSelo("CANAL_NAO_CONTA", cartao);
  }

  if (!cartao) {
    return semSelo("SEM_CARTAO", null);
  }

  if (!entrada.clienteAceita) {
    return semSelo("SEM_ACEITE", cartao);
  }

  // Nada retroativo: o pedido precisa ser do pedido que acionou o cartão em diante.
  if (pedido.criadoEm.getTime() < cartao.ativadoEm.getTime()) {
    return semSelo("ANTERIOR_AO_ACEITE", cartao);
  }

  const reiniciar = cartaoVenceu(cartao, agora);

  // Cartão completo e a vantagem ainda vale: não há acúmulo, espera o resgate.
  if (!reiniciar && cartao.completoEm) {
    return semSelo("AGUARDANDO_RESGATE", cartao, true);
  }

  if (pedido.valorDosItens < VALOR_MINIMO_DO_SELO) {
    return semSelo("ABAIXO_DO_MINIMO", cartao, true, reiniciar);
  }

  const selosAntes = reiniciar ? 0 : cartao.selosNoCiclo;

  const selosApos = selosAntes + 1;

  return {
    creditar: true,
    reiniciar,
    ciclo: cartao.ciclo + (reiniciar ? 1 : 0),
    selosApos,
    completa: selosApos >= SELOS_PARA_A_VANTAGEM,
    atualizarUltimoPedido: true,
  };
}

export interface EstadoDoCartao {
  selos: number;
  selosParaCompletar: number;
  faltam: number;
  completo: boolean;
  // Se completo: até quando a vantagem vale.
  vantagemValeAte?: Date;
  // Se em andamento: em que dia o cartão reinicia se o cliente não pedir.
  reiniciaEm?: Date;
  // O cartão já venceu e vai começar um ciclo novo no próximo pedido (mostra zerado).
  venceu: boolean;
}

// O que a página do cartão mostra agora. Se já passou da hora de reiniciar, mostra o cartão zerado.
export function estadoDoCartao(cartao: Pick<CartaoParaDecidir, "cicloIniciadoEm" | "ultimoPedidoEm" | "completoEm" | "selosNoCiclo">, agora: Date): EstadoDoCartao {
  const venceu = cartaoVenceu(cartao, agora);

  if (venceu) {
    return { selos: 0, selosParaCompletar: SELOS_PARA_A_VANTAGEM, faltam: SELOS_PARA_A_VANTAGEM, completo: false, venceu: true };
  }

  if (cartao.completoEm) {
    return {
      selos: SELOS_PARA_A_VANTAGEM,
      selosParaCompletar: SELOS_PARA_A_VANTAGEM,
      faltam: 0,
      completo: true,
      vantagemValeAte: new Date(cartao.completoEm.getTime() + DIAS_DE_VALIDADE_DA_VANTAGEM * MS_POR_DIA),
      venceu: false,
    };
  }

  const ultimaAtividade = cartao.ultimoPedidoEm ?? cartao.cicloIniciadoEm;

  return {
    selos: cartao.selosNoCiclo,
    selosParaCompletar: SELOS_PARA_A_VANTAGEM,
    faltam: Math.max(0, SELOS_PARA_A_VANTAGEM - cartao.selosNoCiclo),
    completo: false,
    reiniciaEm: new Date(ultimaAtividade.getTime() + DIAS_PARA_O_CARTAO_REINICIAR * MS_POR_DIA),
    venceu: false,
  };
}

// Só o primeiro nome vai ao cartão (nunca o sobrenome, CPF ou endereço).
export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? "";
}
