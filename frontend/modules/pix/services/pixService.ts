import type { PixConfiguracaoRepositoryPort } from "../repositories/pixConfiguracaoRepositoryPort";

import type { CobrancaPix, ConfiguracaoDoPix } from "../types/pix";

import {
  gerarPixCopiaECola,
  normalizarChavePix,
  textoDoPix,
} from "./gerarPix";

// Identificador único por cobrança: "BTS" + hora em base 36 + 4 letras e números
// aleatórios (máx. 25 caracteres).
export function novoTxid(agora: Date = new Date(), aleatorio: () => number = Math.random): string {
  const sufixo = Math.floor(aleatorio() * 36 ** 4)
    .toString(36)
    .toUpperCase()
    .padStart(4, "0");

  return `BTS${agora.getTime().toString(36).toUpperCase()}${sufixo}`;
}

export class PixService {
  constructor(private readonly repository: PixConfiguracaoRepositoryPort) {}

  async obterConfiguracao(): Promise<ConfiguracaoDoPix> {
    const salvo = await this.repository.buscar();

    let tipoDaChave: ConfiguracaoDoPix["tipoDaChave"];

    if (salvo.chave) {
      try {
        tipoDaChave = normalizarChavePix(salvo.chave).tipo;
      } catch {
        tipoDaChave = undefined;
      }
    }

    return {
      chave: salvo.chave,
      tipoDaChave,
      nomeRecebedor: salvo.nomeRecebedor,
      cidade: salvo.cidade,
      configurado: Boolean(salvo.chave && salvo.nomeRecebedor && salvo.cidade),
    };
  }

  async salvarConfiguracao(
    dados: { chave: string; nomeRecebedor: string; cidade: string },
    operador?: string | null
  ): Promise<ConfiguracaoDoPix> {
    const chave = normalizarChavePix(dados.chave).chave;

    const nome = textoDoPix(dados.nomeRecebedor, 25);

    const cidade = textoDoPix(dados.cidade, 15);

    if (!nome) {
      throw new Error("Informe o nome do recebedor (como aparece para o cliente no banco).");
    }

    if (!cidade) {
      throw new Error("Informe a cidade do recebedor.");
    }

    // Confere que gera um código válido com estes dados.
    gerarPixCopiaECola({ chave, nome, cidade, valor: 1, txid: "BTSTESTE" });

    await this.repository.salvar({ chave, nomeRecebedor: nome, cidade }, operador);

    return this.obterConfiguracao();
  }

  // Cobrança de um valor. O valor vem do servidor (total do pedido calculado),
  // nunca da tela.
  async gerarCobranca(valor: number, descricao?: string): Promise<CobrancaPix> {
    const configuracao = await this.obterConfiguracao();

    if (!configuracao.configurado || !configuracao.chave || !configuracao.nomeRecebedor || !configuracao.cidade) {
      throw new Error("O Pix ainda não está configurado. Informe a chave em Financeiro → Pix.");
    }

    const txid = novoTxid();

    return {
      copiaECola: gerarPixCopiaECola({
        chave: configuracao.chave,
        nome: configuracao.nomeRecebedor,
        cidade: configuracao.cidade,
        valor,
        txid,
        descricao,
      }),
      valor,
      txid,
      recebedor: { nome: configuracao.nomeRecebedor, cidade: configuracao.cidade },
    };
  }

  // R$ 1,00 para o Kacius colar no próprio banco e conferir nome e valor.
  async gerarTeste(): Promise<CobrancaPix> {
    return this.gerarCobranca(1, "Teste Beatus");
  }
}
