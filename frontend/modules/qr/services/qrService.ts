import type { ConferenciaRepositoryPort } from "../repositories/conferenciaRepositoryPort";

import type { AjusteDoDia } from "@/modules/operacao/services/ajustes";

import type {
  CartaoDoQuadro,
  ItemDeEstoque,
  MovimentoListado,
  SaldoDeEstoque,
} from "@/modules/estoque/types/estoque";

import type { ConferenciaDoItem, FichaDoInsumo, FichaDoLote } from "../types/qr";

// De onde o QR tira as informações (o estoque, o quadro e os ajustes); a fábrica liga ao banco.
export interface FontesDoQr {
  saldos(): Promise<SaldoDeEstoque[]>;
  historico(itemTipo: ItemDeEstoque, id: string, limite: number): Promise<MovimentoListado[]>;
  cartoes(): Promise<CartaoDoQuadro[]>;
  // Lotes recentes, para achar o nome de um lote que já não tem saldo.
  lotesRecentes(): Promise<{ id: string; nome: string; codigo: string }[]>;
  ajustesPendentes(): Promise<AjusteDoDia[]>;
}

export class QrService {
  constructor(
    private readonly fontes: FontesDoQr,
    private readonly conferencias: ConferenciaRepositoryPort,
    // Para testar o "hoje" sem depender do relógio.
    private readonly agora: () => Date = () => new Date()
  ) {}

  private inicioDoDia(): Date {
    const dia = this.agora();

    return new Date(dia.getFullYear(), dia.getMonth(), dia.getDate());
  }

  private async conferidoHoje(itemId: string): Promise<ConferenciaDoItem | undefined> {
    return (await this.conferencias.desde(this.inicioDoDia())).find((conferencia) => conferencia.itemId === itemId);
  }

  // Ficha de um insumo (ou de uma preparação, se o id for de uma).
  async fichaDoInsumo(id: string): Promise<FichaDoInsumo> {
    const item = (await this.fontes.saldos()).find((saldo) => saldo.id === id);

    if (!item) {
      throw new Error("Item não encontrado. A etiqueta pode ser de um item que já foi desativado.");
    }

    const [historico, pendentes, conferidoHoje] = await Promise.all([
      this.fontes.historico(item.itemTipo, id, 8),
      this.fontes.ajustesPendentes(),
      this.conferidoHoje(id),
    ]);

    return {
      item,
      historico,
      ajustes: pendentes.filter((ajuste) => ajuste.itemId === id),
      conferidoHoje,
    };
  }

  // Ficha de um lote: onde ele está agora (os cartões do quadro).
  async fichaDoLote(id: string): Promise<FichaDoLote> {
    const todos = await this.fontes.cartoes();

    const cartoes = todos.filter((cartao) => cartao.producaoLoteId === id);

    let nome = cartoes[0]?.nome;

    let loteCodigo = cartoes[0]?.loteCodigo;

    if (!nome) {
      const lote = (await this.fontes.lotesRecentes()).find((item) => item.id === id);

      if (!lote) {
        throw new Error("Lote não encontrado.");
      }

      nome = lote.nome;

      loteCodigo = lote.codigo;
    }

    const [pendentes, conferidoHoje] = await Promise.all([
      this.fontes.ajustesPendentes(),
      this.conferidoHoje(id),
    ]);

    return {
      loteId: id,
      loteCodigo,
      nome,
      cartoes,
      ajustes: pendentes.filter((ajuste) => ajuste.itemId === id),
      conferidoHoje,
    };
  }

  // Marca o item como conferido hoje (quem leu o QR e viu que está certo).
  async conferir(
    dados: { itemTipo: string; itemId: string },
    operador?: string | null
  ): Promise<ConferenciaDoItem> {
    const nome = await this.nomeDoItem(dados.itemTipo, dados.itemId);

    await this.conferencias.registrar({ itemTipo: dados.itemTipo, itemId: dados.itemId, nome, operador });

    const registrada = await this.conferidoHoje(dados.itemId);

    return registrada ?? { itemTipo: dados.itemTipo, itemId: dados.itemId, nome, em: this.agora().toISOString(), por: operador ?? undefined };
  }

  private async nomeDoItem(itemTipo: string, itemId: string): Promise<string> {
    if (itemTipo === "LOTE") {
      return (await this.fichaDoLote(itemId)).nome;
    }

    return (await this.fichaDoInsumo(itemId)).item.nome;
  }

  // O que já foi conferido hoje pelo QR (um registro por item, o mais recente).
  async conferidosHoje(): Promise<ConferenciaDoItem[]> {
    const vistos = new Set<string>();

    return (await this.conferencias.desde(this.inicioDoDia())).filter((conferencia) => {
      if (vistos.has(conferencia.itemId)) {
        return false;
      }

      vistos.add(conferencia.itemId);

      return true;
    });
  }
}
