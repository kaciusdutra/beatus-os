import type { PedidoSolicitado } from "@/modules/pedidos/types/pedidoSolicitado";

import type { MarketplaceRepositoryPort } from "../repositories/marketplaceRepositoryPort";

import type { PlataformaMarketplacePort } from "../plataformas/plataformaPort";

import type {
  CanalMarketplace,
  EventoDaPlataforma,
  EventoRegistrado,
  IntegracaoDoMarketplace,
  ItemDaPlataforma,
  PendenciasDaIntegracao,
  ResultadoDoProcessamento,
  VinculoDeItem,
} from "../types/marketplace";

import { CANAIS_MARKETPLACE } from "../types/marketplace";

import { montarPedidoDoMarketplace } from "./montarPedidoDoMarketplace";

// O que a integração precisa do módulo de pedidos (implementado em services/server).
export interface PedidosDoMarketplace {
  criar(
    pedido: PedidoSolicitado,
    operador: string
  ): Promise<{ id: string; numero: string; total: number }>;

  cancelar(pedidoId: string, motivo: string, operador: string): Promise<"CANCELADO" | "IGNORADO">;
}

export type RegistrarAtividade = (dados: {
  acao: string;
  resumo: string;
  referenciaId?: string;
  referenciaNumero?: string;
  operador?: string | null;
}) => Promise<void>;

function validarCanal(canal: string): CanalMarketplace {
  if (!CANAIS_MARKETPLACE.includes(canal as CanalMarketplace)) {
    throw new Error("Canal de marketplace inválido. Use IFOOD, 99FOOD ou KEETA.");
  }

  return canal as CanalMarketplace;
}

function mensagem(erro: unknown): string {
  return erro instanceof Error ? erro.message : "Erro desconhecido.";
}

function moeda(valor: number): string {
  return `R$ ${valor.toFixed(2).replace(".", ",")}`;
}

export class IntegracaoMarketplaceService {
  constructor(
    private readonly repository: MarketplaceRepositoryPort,
    private readonly pedidos: PedidosDoMarketplace,
    private readonly plataforma: (canal: CanalMarketplace) => PlataformaMarketplacePort,
    private readonly registrar?: RegistrarAtividade
  ) {}

  async obterIntegracao(canalTexto: string): Promise<IntegracaoDoMarketplace> {
    const canal = validarCanal(canalTexto);

    const configuracao = await this.repository.buscarConfiguracao(canal);

    return {
      canal,
      ...configuracao,
      credenciaisConfiguradas: this.plataforma(canal).credenciaisConfiguradas(),
    };
  }

  async salvarIntegracao(
    canalTexto: string,
    dados: { ativo: boolean; aceiteAutomatico: boolean; modoSimulacao: boolean; idDaLoja?: string }
  ): Promise<IntegracaoDoMarketplace> {
    const canal = validarCanal(canalTexto);

    // Sair da simulação só com as credenciais no .env.
    if (dados.ativo && !dados.modoSimulacao && !this.plataforma(canal).credenciaisConfiguradas()) {
      throw new Error(
        "Para sair do modo simulação, coloque as credenciais da plataforma no .env do servidor."
      );
    }

    await this.repository.salvarConfiguracao(canal, {
      ativo: dados.ativo,
      aceiteAutomatico: dados.aceiteAutomatico,
      modoSimulacao: dados.modoSimulacao,
      idDaLoja: dados.idDaLoja?.trim() || undefined,
    });

    return this.obterIntegracao(canal);
  }

  // Um evento chegou (da plataforma ou da simulação): guarda, evita repetir e processa.
  async receberEvento(
    canalTexto: string,
    evento: EventoDaPlataforma,
    operador?: string
  ): Promise<ResultadoDoProcessamento> {
    const canal = validarCanal(canalTexto);

    const quem = operador ?? `Integração ${canal}`;

    const { registro, novo } = await this.repository.registrarEvento(canal, evento);

    if (!novo) {
      return { evento: registro, novo: false, avisos: [] };
    }

    const avisos: string[] = [];

    try {
      if (evento.tipo === "PEDIDO_NOVO") {
        await this.processarPedidoNovo(canal, registro, evento, quem, avisos);
      } else if (evento.tipo === "PEDIDO_CANCELADO") {
        await this.processarCancelamento(canal, registro, evento, quem);
      } else {
        await this.repository.atualizarEvento(registro.id, {
          status: "IGNORADO",
          processadoEm: new Date(),
        });
      }
    } catch (erro) {
      await this.repository.atualizarEvento(registro.id, {
        status: "ERRO",
        erro: mensagem(erro),
        processadoEm: new Date(),
      });
    }

    const [atualizado] = (await this.repository.listarEventos(canal, 50)).filter(
      (item) => item.id === registro.id
    );

    return { evento: atualizado ?? registro, novo: true, avisos };
  }

  private async processarPedidoNovo(
    canal: CanalMarketplace,
    registro: EventoRegistrado,
    evento: EventoDaPlataforma,
    operador: string,
    avisos: string[]
  ): Promise<void> {
    if (!evento.pedido) {
      throw new Error("O evento de pedido novo veio sem o pedido.");
    }

    const vinculos = await this.repository.resolverVinculos(
      canal,
      evento.pedido.itens.map((item: ItemDaPlataforma) => ({
        codigoItemExterno: item.codigoItemExterno,
        nome: item.nome,
      }))
    );

    const montado = montarPedidoDoMarketplace(evento.pedido, vinculos);

    const criado = await this.pedidos.criar(montado.solicitado, operador);

    await this.repository.atualizarEvento(registro.id, {
      status: "PROCESSADO",
      pedidoId: criado.id,
      processadoEm: new Date(),
    });

    if (montado.semVinculo.length > 0) {
      avisos.push(
        `${montado.semVinculo.length} item(ns) sem produto ligado: ${montado.semVinculo.map((item) => item.nome).join(", ")}.`
      );
    }

    const total = evento.pedido.totalDaPlataforma;

    if (total !== undefined && Math.abs(total - criado.total) > 0.01) {
      avisos.push(
        `O total calculado (${moeda(criado.total)}) difere do total da plataforma (${moeda(total)}).`
      );
    }

    for (const aviso of avisos) {
      await this.registrar?.({
        acao: "AVISO_INTEGRACAO",
        resumo: `Pedido ${criado.numero} (${canal} ${montado.codigo}): ${aviso}`,
        referenciaId: criado.id,
        referenciaNumero: criado.numero,
        operador,
      });
    }

    await this.aceitar(canal, registro.id, evento.pedido.idExterno);
  }

  // Aceite automático (decisão do Kacius): o pedido já está na fila da cozinha; a
  // falha em avisar a plataforma não desfaz o pedido, fica registrada.
  private async aceitar(
    canal: CanalMarketplace,
    eventoRegistradoId: string,
    pedidoExternoId: string
  ): Promise<void> {
    const configuracao = await this.repository.buscarConfiguracao(canal);

    if (!configuracao.aceiteAutomatico) {
      return;
    }

    try {
      // Na simulação não há plataforma de verdade para avisar.
      if (!configuracao.modoSimulacao) {
        await this.plataforma(canal).aceitarPedido(pedidoExternoId);
      }

      await this.repository.atualizarEvento(eventoRegistradoId, {
        confirmadoEm: new Date(),
        confirmacaoErro: null,
      });
    } catch (erro) {
      await this.repository.atualizarEvento(eventoRegistradoId, {
        confirmacaoErro: mensagem(erro),
      });
    }
  }

  private async processarCancelamento(
    canal: CanalMarketplace,
    registro: EventoRegistrado,
    evento: EventoDaPlataforma,
    operador: string
  ): Promise<void> {
    const pedidoId = evento.pedidoExternoId
      ? await this.repository.buscarPedidoCriado(canal, evento.pedidoExternoId)
      : null;

    if (!pedidoId) {
      await this.repository.atualizarEvento(registro.id, {
        status: "IGNORADO",
        erro: "Cancelamento de um pedido que não está no Beatus.",
        processadoEm: new Date(),
      });

      return;
    }

    const resultado = await this.pedidos.cancelar(
      pedidoId,
      `Cancelado pelo ${canal}`,
      operador
    );

    await this.repository.atualizarEvento(registro.id, {
      status: resultado === "CANCELADO" ? "PROCESSADO" : "IGNORADO",
      pedidoId,
      processadoEm: new Date(),
      ...(resultado === "IGNORADO"
        ? { erro: "O pedido já estava entregue ou cancelado." }
        : {}),
    });
  }

  // Consulta a plataforma (chamada a cada 30 s pela Cozinha ou pelo botão da tela).
  async consultar(
    canalTexto: string
  ): Promise<{ consultados: number; motivo?: string; falha?: string }> {
    const canal = validarCanal(canalTexto);

    const configuracao = await this.repository.buscarConfiguracao(canal);

    if (!configuracao.ativo) {
      return { consultados: 0, motivo: "Integração desligada." };
    }

    if (configuracao.modoSimulacao) {
      return { consultados: 0, motivo: "Modo simulação: os eventos vêm da tela de simulação." };
    }

    const plataforma = this.plataforma(canal);

    try {
      const eventos = await plataforma.consultarEventos();

      for (const evento of eventos) {
        await this.receberEvento(canal, evento);
      }

      if (eventos.length > 0) {
        await plataforma.confirmarRecebimento(eventos.map((evento) => evento.eventoId));
      }

      await this.repository.registrarContato(canal);

      return { consultados: eventos.length };
    } catch (erro) {
      await this.repository.registrarContato(canal, mensagem(erro));

      return { consultados: 0, falha: mensagem(erro) };
    }
  }

  // Simulação: monta um pedido novo como se a plataforma o tivesse mandado.
  async simularPedido(
    canalTexto: string,
    dados: {
      itens: ItemDaPlataforma[];
      codigoExibicao?: string;
      nomeCliente?: string;
      totalDaPlataforma?: number;
    }
  ): Promise<ResultadoDoProcessamento> {
    const canal = validarCanal(canalTexto);

    const configuracao = await this.repository.buscarConfiguracao(canal);

    if (!configuracao.modoSimulacao) {
      throw new Error("A simulação só funciona no modo simulação.");
    }

    if (!dados.itens || dados.itens.length === 0) {
      throw new Error("Informe ao menos um item para simular.");
    }

    const sufixo = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const idExterno = `SIM-${sufixo}`;

    const pedido = {
      canal,
      idExterno,
      codigoExibicao: dados.codigoExibicao?.trim() || `SIM${sufixo.slice(-6)}`,
      nomeCliente: dados.nomeCliente?.trim() || undefined,
      itens: dados.itens,
      totalDaPlataforma: dados.totalDaPlataforma,
    };

    return this.receberEvento(canal, {
      eventoId: `EV-${idExterno}`,
      tipo: "PEDIDO_NOVO",
      pedidoExternoId: idExterno,
      pedido,
      bruto: { simulado: true, pedido },
    });
  }

  async simularCancelamento(
    canalTexto: string,
    pedidoExternoId: string
  ): Promise<ResultadoDoProcessamento> {
    const canal = validarCanal(canalTexto);

    const configuracao = await this.repository.buscarConfiguracao(canal);

    if (!configuracao.modoSimulacao) {
      throw new Error("A simulação só funciona no modo simulação.");
    }

    return this.receberEvento(canal, {
      eventoId: `EV-CANC-${pedidoExternoId}-${Date.now()}`,
      tipo: "PEDIDO_CANCELADO",
      pedidoExternoId,
      bruto: { simulado: true, cancelado: pedidoExternoId },
    });
  }

  async listarEventos(canal?: string, limite = 30): Promise<EventoRegistrado[]> {
    return this.repository.listarEventos(canal ? validarCanal(canal) : undefined, limite);
  }

  async listarVinculos(canalTexto: string): Promise<VinculoDeItem[]> {
    return this.repository.listarVinculos(validarCanal(canalTexto));
  }

  async ligarVinculo(id: string, produtoId: string | null): Promise<VinculoDeItem> {
    return this.repository.ligarVinculo(id, produtoId);
  }

  async pendencias(): Promise<PendenciasDaIntegracao> {
    return this.repository.contarPendencias();
  }
}
