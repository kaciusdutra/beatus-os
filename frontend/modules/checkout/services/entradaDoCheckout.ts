import { cpfValido, somenteDigitos } from "@/modules/fornecedores/domain/documentoFornecedor";

// Versão da política de privacidade que o cliente aceita no checkout (fica gravada no cadastro).
export const VERSAO_DA_POLITICA = "2026-11-15-rascunho";

export const MAXIMO_DE_ITENS_DO_CHECKOUT = 30;

export const QUANTIDADE_MAXIMA_NO_CHECKOUT = 20;

// De onde o cliente veio para o checkout: o próprio site ou um link que a Beatriz mandou no WhatsApp.
export type OrigemDoCheckout = "CARDAPIO_ONLINE" | "WHATSAPP";

export interface DadosDoCheckout {
  origem: OrigemDoCheckout;
  cliente: {
    nome: string;
    telefone: string;
    cpf: string;
    email?: string;
    dataNascimento?: string;
  };
  endereco: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
  };
  itens: { produtoId: string; quantidade: number; observacao?: string }[];
  consentimentos: {
    aceitaPolitica: true;
    aceitaMarketing: boolean;
  };
}

export type ResultadoDaValidacao = { ok: true; dados: DadosDoCheckout } | { ok: false; mensagem: string };

// Texto vindo da internet: tira caracteres de controle e espaços repetidos, e limita o tamanho.
function limpar(valor: unknown, maximo: number): string {
  if (typeof valor !== "string") {
    return "";
  }

  return valor
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximo);
}

function telefoneValido(digitos: string): boolean {
  if (digitos.length !== 10 && digitos.length !== 11) {
    return false;
  }

  const ddd = Number(digitos.slice(0, 2));

  if (ddd < 11 || ddd > 99) {
    return false;
  }

  // Celular tem 11 dígitos e o terceiro é 9.
  return digitos.length === 10 || digitos[2] === "9";
}

export function dataDeNascimentoValida(texto: string, hoje: Date = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return false;
  }

  const [ano, mes, dia] = texto.split("-").map(Number);

  const data = new Date(Date.UTC(ano, mes - 1, dia));

  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) {
    return false;
  }

  return ano >= 1900 && data.getTime() <= hoje.getTime();
}

export function validarEntradaDoCheckout(entrada: unknown, hoje: Date = new Date()): ResultadoDaValidacao {
  const bruto = (entrada ?? {}) as Record<string, unknown>;

  const cliente = (bruto.cliente ?? {}) as Record<string, unknown>;

  const endereco = (bruto.endereco ?? {}) as Record<string, unknown>;

  const consentimentos = (bruto.consentimentos ?? {}) as Record<string, unknown>;

  const nome = limpar(cliente.nome, 80);

  if (nome.length < 2) {
    return { ok: false, mensagem: "Informe o seu nome." };
  }

  let telefone = somenteDigitos(typeof cliente.telefone === "string" ? cliente.telefone : "");

  if ((telefone.length === 12 || telefone.length === 13) && telefone.startsWith("55")) {
    telefone = telefone.slice(2);
  }

  if (!telefoneValido(telefone)) {
    return { ok: false, mensagem: "Informe um telefone válido, com DDD." };
  }

  const cpf = somenteDigitos(typeof cliente.cpf === "string" ? cliente.cpf : "");

  if (!cpfValido(cpf)) {
    return { ok: false, mensagem: "O CPF informado não é válido." };
  }

  const email = limpar(cliente.email, 120).toLowerCase();

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, mensagem: "O e-mail informado não parece válido." };
  }

  const dataNascimento = limpar(cliente.dataNascimento, 10);

  if (dataNascimento && !dataDeNascimentoValida(dataNascimento, hoje)) {
    return { ok: false, mensagem: "A data de nascimento não é válida." };
  }

  const cep = somenteDigitos(typeof endereco.cep === "string" ? endereco.cep : "");

  if (cep.length !== 8) {
    return { ok: false, mensagem: "O CEP tem 8 números." };
  }

  const logradouro = limpar(endereco.logradouro, 120);

  const numero = limpar(endereco.numero, 12);

  const bairro = limpar(endereco.bairro, 80);

  const cidade = limpar(endereco.cidade, 80);

  const estado = limpar(endereco.estado, 20).toUpperCase();

  if (!logradouro || !numero || !bairro || !cidade || !/^[A-Z]{2}$/.test(estado)) {
    return { ok: false, mensagem: "Preencha o endereço completo: rua, número, bairro, cidade e estado." };
  }

  if (consentimentos.aceitaPolitica !== true) {
    return { ok: false, mensagem: "Para continuar, aceite a política de privacidade." };
  }

  if (!Array.isArray(bruto.itens) || bruto.itens.length === 0) {
    return { ok: false, mensagem: "O pedido precisa ter pelo menos um item." };
  }

  if (bruto.itens.length > MAXIMO_DE_ITENS_DO_CHECKOUT) {
    return { ok: false, mensagem: `O pedido pode ter até ${MAXIMO_DE_ITENS_DO_CHECKOUT} itens diferentes.` };
  }

  const itens: DadosDoCheckout["itens"] = [];

  for (const candidato of bruto.itens as unknown[]) {
    const item = (candidato ?? {}) as Record<string, unknown>;

    const produtoId = limpar(item.produtoId, 80);

    const quantidade = item.quantidade;

    if (!produtoId || typeof quantidade !== "number" || !Number.isInteger(quantidade) || quantidade < 1 || quantidade > QUANTIDADE_MAXIMA_NO_CHECKOUT) {
      return { ok: false, mensagem: `Cada item precisa de uma quantidade de 1 a ${QUANTIDADE_MAXIMA_NO_CHECKOUT}.` };
    }

    if (itens.some((existente) => existente.produtoId === produtoId)) {
      return { ok: false, mensagem: "O mesmo produto apareceu duas vezes no pedido." };
    }

    const observacao = limpar(item.observacao, 140);

    itens.push({ produtoId, quantidade, ...(observacao ? { observacao } : {}) });
  }

  const complemento = limpar(endereco.complemento, 80);

  return {
    ok: true,
    dados: {
      origem: bruto.origem === "WHATSAPP" ? "WHATSAPP" : "CARDAPIO_ONLINE",
      cliente: { nome, telefone, cpf, ...(email ? { email } : {}), ...(dataNascimento ? { dataNascimento } : {}) },
      endereco: { cep, logradouro, numero, ...(complemento ? { complemento } : {}), bairro, cidade, estado },
      itens,
      consentimentos: { aceitaPolitica: true, aceitaMarketing: consentimentos.aceitaMarketing === true },
    },
  };
}
