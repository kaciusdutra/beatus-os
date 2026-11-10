// Endereço e inscrição estadual do fornecedor (bloco 7E).
// Sem dependências de servidor: usado pelas rotas, pelo serviço e pelas telas.

import {
  somenteDigitos,
} from "./documentoFornecedor";

export interface EnderecoFornecedor {
  inscricaoEstadual?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
}

function textoOuVazio(
  valor: unknown
): string | undefined {
  return typeof valor === "string" &&
    valor.trim()
    ? valor.trim()
    : undefined;
}

// Lê os campos de endereço de um corpo de requisição.
export function lerEnderecoFornecedor(
  corpo: Record<string, unknown>
): EnderecoFornecedor {
  return {
    inscricaoEstadual: textoOuVazio(
      corpo.inscricaoEstadual
    ),
    cep: textoOuVazio(corpo.cep),
    logradouro: textoOuVazio(corpo.logradouro),
    numero: textoOuVazio(corpo.numero),
    complemento: textoOuVazio(corpo.complemento),
    bairro: textoOuVazio(corpo.bairro),
    municipio: textoOuVazio(corpo.municipio),
    uf: textoOuVazio(corpo.uf),
  };
}

// Máscara progressiva: 69005-000
export function formatarCep(
  cep?: string
): string {
  const d = somenteDigitos(cep).slice(0, 8);

  return d.length <= 5
    ? d
    : `${d.slice(0, 5)}-${d.slice(5)}`;
}

// Padroniza o que será gravado: CEP só com dígitos, UF em maiúsculas
// e inscrição estadual sem espaços nas pontas.
export function normalizarEnderecoFornecedor(
  endereco: EnderecoFornecedor
): EnderecoFornecedor {
  const cep = somenteDigitos(endereco.cep);

  if (cep && cep.length !== 8) {
    throw new Error(
      "CEP do fornecedor inválido. O CEP tem 8 números."
    );
  }

  const uf = endereco.uf?.trim().toUpperCase();

  if (uf && !/^[A-Z]{2}$/.test(uf)) {
    throw new Error(
      "UF do fornecedor inválida. Use a sigla com 2 letras."
    );
  }

  return {
    inscricaoEstadual:
      endereco.inscricaoEstadual?.trim() ||
      undefined,
    cep: cep || undefined,
    logradouro: endereco.logradouro?.trim() || undefined,
    numero: endereco.numero?.trim() || undefined,
    complemento: endereco.complemento?.trim() || undefined,
    bairro: endereco.bairro?.trim() || undefined,
    municipio: endereco.municipio?.trim() || undefined,
    uf: uf || undefined,
  };
}
