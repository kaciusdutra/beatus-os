// O catálogo de vantagens do clube (seção 28): validar o que o Kacius cadastra e descrever para o cliente.
// Regra pura, sem banco.

export type TipoDeVantagem = "ITEM_GRATIS" | "DESCONTO_PERCENTUAL" | "ENTREGA_GRATIS";

export const TIPOS_DE_VANTAGEM: { chave: TipoDeVantagem; rotulo: string; ajuda: string }[] = [
  { chave: "ITEM_GRATIS", rotulo: "Item grátis", ajuda: "Uma unidade do item de maior preço que se encaixa sai de graça (por exemplo, um hambúrguer)." },
  { chave: "DESCONTO_PERCENTUAL", rotulo: "Desconto em %", ajuda: "Uma porcentagem de desconto sobre os itens do pedido (a entrega não entra)." },
  { chave: "ENTREGA_GRATIS", rotulo: "Entrega grátis", ajuda: "A taxa de entrega do pedido vai a zero." },
];

export interface DadosDaVantagem {
  nome: string;
  descricao: string | null;
  tipo: TipoDeVantagem;
  // ITEM_GRATIS: categoria do produto (vazio = qualquer).
  categoria: string | null;
  // ITEM_GRATIS: preço máximo do item (vazio = qualquer).
  valorMaximo: number | null;
  // DESCONTO_PERCENTUAL: de 0 (exclusivo) a 100.
  percentual: number | null;
  ativa: boolean;
  ordem: number;
}

export type ResultadoDaValidacao = { ok: true; dados: DadosDaVantagem } | { ok: false; erro: string };

function numeroOpcional(valor: unknown): number | null | "invalido" {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  const numero = typeof valor === "number" ? valor : Number(String(valor).replace(",", "."));

  return Number.isFinite(numero) ? numero : "invalido";
}

export function validarVantagem(bruto: unknown): ResultadoDaValidacao {
  const dados = (bruto && typeof bruto === "object" ? bruto : {}) as Record<string, unknown>;

  const nome = typeof dados.nome === "string" ? dados.nome.trim() : "";

  if (nome.length < 2 || nome.length > 60) {
    return { ok: false, erro: "Dê um nome à vantagem, de 2 a 60 letras." };
  }

  const descricao = typeof dados.descricao === "string" && dados.descricao.trim() ? dados.descricao.trim().slice(0, 200) : null;

  const tipo = TIPOS_DE_VANTAGEM.find((item) => item.chave === dados.tipo)?.chave;

  if (!tipo) {
    return { ok: false, erro: "Escolha o tipo da vantagem." };
  }

  const ordem = typeof dados.ordem === "number" && Number.isInteger(dados.ordem) && dados.ordem >= 0 && dados.ordem <= 999 ? dados.ordem : 0;

  const ativa = dados.ativa !== false;

  let categoria: string | null = null;

  let valorMaximo: number | null = null;

  let percentual: number | null = null;

  if (tipo === "ITEM_GRATIS") {
    categoria = typeof dados.categoria === "string" && dados.categoria.trim() ? dados.categoria.trim().slice(0, 40) : null;

    const maximo = numeroOpcional(dados.valorMaximo);

    if (maximo === "invalido" || (maximo !== null && (maximo <= 0 || maximo > 9999))) {
      return { ok: false, erro: "O valor máximo do item grátis precisa ser um número maior que zero (ou fique em branco para qualquer valor)." };
    }

    valorMaximo = maximo;
  }

  if (tipo === "DESCONTO_PERCENTUAL") {
    const pct = numeroOpcional(dados.percentual);

    if (pct === "invalido" || pct === null || pct <= 0 || pct > 100) {
      return { ok: false, erro: "Informe a porcentagem do desconto, maior que 0 e até 100." };
    }

    percentual = Math.round(pct * 100) / 100;
  }

  return { ok: true, dados: { nome, descricao, tipo, categoria, valorMaximo, percentual, ativa, ordem } };
}

function reais(valor: number): string {
  return Number.isInteger(valor) ? String(valor) : valor.toFixed(2).replace(".", ",");
}

// A frase que o cliente lê sobre a vantagem.
export function descreverVantagem(v: { tipo: string; categoria?: string | null; valorMaximo?: number | null; percentual?: number | null }): string {
  if (v.tipo === "ITEM_GRATIS") {
    const o = v.categoria ? v.categoria.toLowerCase() : "item";

    return `1 ${o} por conta da casa${v.valorMaximo ? ` (até ${reais(v.valorMaximo)})` : ""}`;
  }

  if (v.tipo === "DESCONTO_PERCENTUAL") {
    return `${reais(v.percentual ?? 0)}% de desconto nos itens do pedido`;
  }

  if (v.tipo === "ENTREGA_GRATIS") {
    return "Entrega grátis";
  }

  return "Vantagem do clube";
}
