import type { ItemDoCardapioIA } from "./cardapioParaIA";

import type {
  AdicionalDoRascunho,
  DadosDoClienteNaConversa,
  IntencaoDoCliente,
  ItemDoRascunho,
  PendenciaDoPedido,
  RascunhoDePedido,
  RespostaDaBeatriz,
} from "../types/beatriz";

const QUANTIDADE_MAXIMA = 99;

const INTENCOES: IntencaoDoCliente[] = ["PEDIDO", "DUVIDA", "CARDAPIO", "RECLAMACAO", "OUTRO"];

const PENDENCIAS: PendenciaDoPedido[] = ["ITENS", "NOME", "ENDERECO", "CONFIRMACAO"];

const TAMANHO_MAXIMO_DA_RESPOSTA = 1200;

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function reais(valor: number): string {
  return valor.toFixed(2).replace(".", ",");
}

// A IA devolve só JSON, mas às vezes envolve em ```json ... ```. Pega do primeiro
// "{" ao último "}".
export function extrairJson(texto: string): unknown {
  const inicio = texto.indexOf("{");

  const fim = texto.lastIndexOf("}");

  if (inicio < 0 || fim <= inicio) {
    throw new Error("A resposta da IA não trouxe um JSON.");
  }

  return JSON.parse(texto.slice(inicio, fim + 1));
}

// A Beatriz não pode citar valores (o sistema monta o resumo). Se escapar
// algum, tira a frase inteira.
export function removerValoresDoTexto(texto: string): string {
  const frases = texto.split(/(?<=[.!?\n])\s+/);

  return frases
    .filter((frase) => !/R\$\s*\d|\d\s*reais|\breais\b.*\d|\d+[.,]\d{2}\b/i.test(frase))
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function texto(valor: unknown): string | undefined {
  return typeof valor === "string" && valor.trim() ? valor.trim().slice(0, 300) : undefined;
}

function quantidadeValida(valor: unknown): number | null {
  return typeof valor === "number" && Number.isInteger(valor) && valor >= 1 && valor <= QUANTIDADE_MAXIMA
    ? valor
    : null;
}

export interface ResultadoDoRascunho {
  rascunho: RascunhoDePedido;
  avisos: string[];
}

// Confere os itens que a IA anotou com o cardápio e calcula os valores. Item que
// não existe, adicional usado como produto (ou o contrário) e quantidade inválida
// são descartados e viram aviso; o preço é sempre o do cardápio.
export function montarRascunho(itensDaIA: unknown, cardapio: ItemDoCardapioIA[]): ResultadoDoRascunho {
  const avisos: string[] = [];

  const itens: ItemDoRascunho[] = [];

  const porId = new Map(cardapio.map((item) => [item.id, item]));

  for (const bruto of Array.isArray(itensDaIA) ? itensDaIA : []) {
    const linha = (bruto ?? {}) as Record<string, unknown>;

    const idDoProduto = typeof linha.produtoId === "string" ? linha.produtoId : "";

    const produto = porId.get(idDoProduto);

    if (!produto || produto.adicional) {
      avisos.push(`Item descartado: "${idDoProduto || "sem id"}" não é um produto do cardápio.`);

      continue;
    }

    const quantidade = quantidadeValida(linha.quantidade);

    if (quantidade === null) {
      avisos.push(`Item descartado: quantidade inválida para ${produto.nome}.`);

      continue;
    }

    const adicionais: AdicionalDoRascunho[] = [];

    for (const adicionalBruto of Array.isArray(linha.adicionais) ? linha.adicionais : []) {
      const adicionalLinha = (adicionalBruto ?? {}) as Record<string, unknown>;

      const adicional = porId.get(typeof adicionalLinha.produtoId === "string" ? adicionalLinha.produtoId : "");

      const quantidadeAdicional = quantidadeValida(adicionalLinha.quantidade);

      if (!adicional || !adicional.adicional || quantidadeAdicional === null) {
        avisos.push(`Adicional descartado em ${produto.nome}: não está no cardápio ou a quantidade é inválida.`);

        continue;
      }

      adicionais.push({
        produtoId: adicional.id,
        nome: adicional.nome,
        quantidade: quantidadeAdicional,
        precoUnitario: adicional.preco,
      });
    }

    itens.push({
      produtoId: produto.id,
      nome: produto.nome,
      quantidade,
      precoUnitario: produto.preco,
      observacao: texto(linha.observacao),
      adicionais,
      // Mesma conta do pedido: preço × quantidade + adicionais.
      subtotal: arredondar(
        produto.preco * quantidade +
          adicionais.reduce((soma, adicional) => soma + adicional.precoUnitario * adicional.quantidade, 0)
      ),
    });
  }

  // Linhas idênticas (mesmo produto, observação e adicionais) viram uma só.
  const reunidos: ItemDoRascunho[] = [];

  for (const item of itens) {
    const chave = (outro: ItemDoRascunho) =>
      JSON.stringify([outro.produtoId, outro.observacao ?? "", outro.adicionais.map((a) => [a.produtoId, a.quantidade])]);

    const existente = reunidos.find((outro) => chave(outro) === chave(item));

    if (existente) {
      existente.quantidade += item.quantidade;

      existente.subtotal = arredondar(existente.subtotal + item.subtotal);
    } else {
      reunidos.push({ ...item });
    }
  }

  return {
    rascunho: {
      itens: reunidos,
      subtotal: arredondar(reunidos.reduce((soma, item) => soma + item.subtotal, 0)),
    },
    avisos,
  };
}

// O resumo do pedido, com os valores do cardápio, montado pelo sistema.
export function resumoDoPedido(rascunho: RascunhoDePedido): string {
  if (rascunho.itens.length === 0) {
    return "";
  }

  const linhas = rascunho.itens.map((item) => {
    const principal = `• ${item.quantidade}× ${item.nome} — R$ ${reais(item.precoUnitario * item.quantidade)}`;

    const extras = item.adicionais.map(
      (adicional) => `   + ${adicional.quantidade}× ${adicional.nome} — R$ ${reais(adicional.precoUnitario * adicional.quantidade)}`
    );

    const observacao = item.observacao ? [`   obs.: ${item.observacao}`] : [];

    return [principal, ...extras, ...observacao].join("\n");
  });

  return `Resumo do pedido:\n${linhas.join("\n")}\nSubtotal: R$ ${reais(rascunho.subtotal)} (a entrega é somada pelo endereço)`;
}

const MENSAGEM_DE_ATENDENTE =
  "Vou chamar um atendente para te ajudar, só um instante.";

// Transforma o texto que a IA devolveu na resposta da Beatriz, já conferida.
// Se o texto não for um JSON utilizável, a conversa vai para uma pessoa.
export function interpretarRespostaDaBeatriz(
  textoDaIA: string,
  cardapio: ItemDoCardapioIA[]
): RespostaDaBeatriz {
  let dados: Record<string, unknown>;

  try {
    dados = extrairJson(textoDaIA) as Record<string, unknown>;
  } catch {
    return {
      intencao: "OUTRO",
      resposta: MENSAGEM_DE_ATENDENTE,
      rascunho: { itens: [], subtotal: 0 },
      cliente: {},
      pendencias: [],
      pedidoConfirmadoPeloCliente: false,
      precisaDeHumano: true,
      motivoHumano: "A IA não devolveu uma resposta que o sistema consiga ler.",
      resumoParaOperador: "Resposta da IA ilegível; atender manualmente.",
      avisos: ["Resposta da IA fora do formato esperado."],
    };
  }

  const { rascunho, avisos } = montarRascunho(dados.itens, cardapio);

  const intencao = INTENCOES.includes(dados.intencao as IntencaoDoCliente)
    ? (dados.intencao as IntencaoDoCliente)
    : "OUTRO";

  const clienteBruto = (dados.cliente ?? {}) as Record<string, unknown>;

  const cliente: DadosDoClienteNaConversa = {
    nome: texto(clienteBruto.nome),
    endereco: texto(clienteBruto.endereco),
    referencia: texto(clienteBruto.referencia),
  };

  // As pendências saem dos fatos, não só do que a IA disse.
  const pendencias = new Set<PendenciaDoPedido>(
    (Array.isArray(dados.pendencias) ? dados.pendencias : []).filter((valor): valor is PendenciaDoPedido =>
      PENDENCIAS.includes(valor as PendenciaDoPedido)
    )
  );

  if (rascunho.itens.length === 0) {
    pendencias.add("ITENS");
  } else {
    pendencias.delete("ITENS");
  }

  if (!cliente.nome) {
    pendencias.add("NOME");
  }

  if (!cliente.endereco) {
    pendencias.add("ENDERECO");
  }

  // Só vale a confirmação se há pedido, nome e endereço.
  const confirmou =
    dados.pedidoConfirmadoPeloCliente === true &&
    rascunho.itens.length > 0 &&
    Boolean(cliente.nome) &&
    Boolean(cliente.endereco);

  if (!confirmou) {
    pendencias.add("CONFIRMACAO");
  } else {
    pendencias.delete("CONFIRMACAO");
  }

  let precisaDeHumano = dados.precisaDeHumano === true || intencao === "RECLAMACAO";

  let motivoHumano = texto(dados.motivoHumano);

  if (intencao === "RECLAMACAO" && !motivoHumano) {
    motivoHumano = "Reclamação do cliente.";
  }

  if (avisos.length > 0 && rascunho.itens.length === 0 && intencao === "PEDIDO") {
    // A IA tentou anotar só itens que não existem: melhor uma pessoa olhar.
    precisaDeHumano = true;

    motivoHumano = motivoHumano ?? "O pedido anotado tinha itens que não estão no cardápio.";
  }

  const fala = removerValoresDoTexto(texto(dados.resposta) ?? "") || (precisaDeHumano ? MENSAGEM_DE_ATENDENTE : "");

  const resumo = resumoDoPedido(rascunho);

  const resposta = [fala, resumo].filter(Boolean).join("\n\n").slice(0, TAMANHO_MAXIMO_DA_RESPOSTA);

  return {
    intencao,
    resposta,
    rascunho,
    cliente,
    pendencias: [...pendencias],
    pedidoConfirmadoPeloCliente: confirmou,
    precisaDeHumano,
    motivoHumano: precisaDeHumano ? motivoHumano : undefined,
    resumoParaOperador:
      texto(dados.resumoParaOperador) ??
      (rascunho.itens.length > 0 ? `${rascunho.itens.length} item(ns) anotado(s).` : "Sem pedido ainda."),
    avisos,
  };
}
