// Regras do documento do fornecedor (CNPJ ou CPF).
// Sem dependências de servidor: usado pelo serviço e pelas telas.

export function somenteDigitos(
  valor?: string
): string {
  return (valor ?? "").replace(/\D/g, "");
}

function todosDigitosIguais(
  digitos: string
): boolean {
  return /^(\d)\1+$/.test(digitos);
}

function calcularDigito(
  base: string,
  pesos: number[]
): number {
  const soma = pesos.reduce(
    (total, peso, indice) =>
      total + Number(base[indice]) * peso,
    0
  );

  const resto = soma % 11;

  return resto < 2 ? 0 : 11 - resto;
}

// Confere os dois dígitos verificadores do CNPJ.
export function cnpjValido(
  cnpj?: string
): boolean {
  const digitos = somenteDigitos(cnpj);

  if (
    digitos.length !== 14 ||
    todosDigitosIguais(digitos)
  ) {
    return false;
  }

  const primeiro = calcularDigito(
    digitos,
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  );

  const segundo = calcularDigito(
    digitos,
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  );

  return (
    primeiro === Number(digitos[12]) &&
    segundo === Number(digitos[13])
  );
}

// Confere os dois dígitos verificadores do CPF.
export function cpfValido(
  cpf?: string
): boolean {
  const digitos = somenteDigitos(cpf);

  if (
    digitos.length !== 11 ||
    todosDigitosIguais(digitos)
  ) {
    return false;
  }

  const primeiro = calcularDigito(
    digitos,
    [10, 9, 8, 7, 6, 5, 4, 3, 2]
  );

  const segundo = calcularDigito(
    digitos,
    [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]
  );

  return (
    primeiro === Number(digitos[9]) &&
    segundo === Number(digitos[10])
  );
}

// Máscara progressiva: 12.345.678/0001-95
export function formatarCnpj(
  cnpj?: string
): string {
  const d = somenteDigitos(cnpj).slice(0, 14);

  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;

  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

// Máscara progressiva: 123.456.789-09
export function formatarCpf(
  cpf?: string
): string {
  const d = somenteDigitos(cpf).slice(0, 11);

  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9)
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;

  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

// Máscara de telefone: (11) 91234-5678 ou (11) 3456-7890
export function formatarTelefone(
  telefone?: string
): string {
  const d = somenteDigitos(telefone).slice(0, 11);

  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;

  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
