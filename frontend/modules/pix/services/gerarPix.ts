// Pix copia e cola no padrão do Banco Central (BR Code, EMV QRCPS-MPM, Pix
// estático com valor). Função pura: o mesmo pedido gera sempre o mesmo código.
//
// Estrutura: cada campo é "ID" (2 dígitos) + "TAMANHO" (2 dígitos) + valor.
// O último campo (63) é o CRC16-CCITT de tudo o que veio antes, mais "6304".

export interface DadosDoPix {
  // Chave Pix do recebedor (já normalizada, ver normalizarChavePix)
  chave: string;
  // Nome do recebedor (máx. 25 caracteres no código)
  nome: string;
  // Cidade do recebedor (máx. 15 caracteres no código)
  cidade: string;
  // Valor em reais; sem valor, o cliente digita (não usamos)
  valor: number;
  // Identificador da cobrança, 1 a 25 letras e números
  txid: string;
  // Texto livre que o banco mostra ao pagador (opcional)
  descricao?: string;
}

function campo(id: string, valor: string): string {
  return `${id}${String(valor.length).padStart(2, "0")}${valor}`;
}

// CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF), como o Pix exige.
export function crc16(texto: string): string {
  let crc = 0xffff;

  for (let indice = 0; indice < texto.length; indice++) {
    crc ^= texto.charCodeAt(indice) << 8;

    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// Texto do código: sem acento, maiúsculo, só letras, números e espaço, no
// tamanho máximo do campo.
export function textoDoPix(texto: string, maximo: number): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximo);
}

export function idDaCobranca(texto: string): string {
  return texto.replace(/[^A-Za-z0-9]/g, "").slice(0, 25);
}

export function gerarPixCopiaECola(dados: DadosDoPix): string {
  const chave = dados.chave.trim();

  const nome = textoDoPix(dados.nome, 25);

  const cidade = textoDoPix(dados.cidade, 15);

  const txid = idDaCobranca(dados.txid);

  if (!chave) {
    throw new Error("Informe a chave Pix.");
  }

  if (!nome) {
    throw new Error("Informe o nome do recebedor.");
  }

  if (!cidade) {
    throw new Error("Informe a cidade do recebedor.");
  }

  if (!txid) {
    throw new Error("O identificador da cobrança é obrigatório.");
  }

  if (!Number.isFinite(dados.valor) || dados.valor <= 0 || dados.valor > 999999.99) {
    throw new Error("O valor do Pix deve ser maior que zero.");
  }

  const descricao = dados.descricao ? textoDoPix(dados.descricao, 40) : "";

  // 26: dados da conta (identifica o Pix e traz a chave e a descrição)
  const conta =
    campo("00", "br.gov.bcb.pix") +
    campo("01", chave) +
    (descricao ? campo("02", descricao) : "");

  const semCrc =
    campo("00", "01") +
    campo("01", "11") +
    campo("26", conta) +
    campo("52", "0000") +
    campo("53", "986") +
    campo("54", dados.valor.toFixed(2)) +
    campo("58", "BR") +
    campo("59", nome) +
    campo("60", cidade) +
    campo("62", campo("05", txid)) +
    "6304";

  return semCrc + crc16(semCrc);
}

// Lê o código de volta (para conferir o que foi gerado nos testes e na tela).
export function lerPix(codigo: string): { campos: Record<string, string>; crcValido: boolean } {
  const campos: Record<string, string> = {};

  let posicao = 0;

  while (posicao + 4 <= codigo.length) {
    const id = codigo.slice(posicao, posicao + 2);

    const tamanho = Number(codigo.slice(posicao + 2, posicao + 4));

    campos[id] = codigo.slice(posicao + 4, posicao + 4 + tamanho);

    posicao += 4 + tamanho;
  }

  const semCrc = codigo.slice(0, -4);

  return { campos, crcValido: crc16(semCrc) === codigo.slice(-4) };
}

function soDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

function cpfValido(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  for (const tamanho of [9, 10]) {
    let soma = 0;

    for (let indice = 0; indice < tamanho; indice++) {
      soma += Number(cpf[indice]) * (tamanho + 1 - indice);
    }

    const digito = ((soma * 10) % 11) % 10;

    if (digito !== Number(cpf[tamanho])) {
      return false;
    }
  }

  return true;
}

function cnpjValido(cnpj: string): boolean {
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }

  for (const tamanho of [12, 13]) {
    const pesos = tamanho === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    let soma = 0;

    for (let indice = 0; indice < tamanho; indice++) {
      soma += Number(cnpj[indice]) * pesos[indice];
    }

    const resto = soma % 11;

    const digito = resto < 2 ? 0 : 11 - resto;

    if (digito !== Number(cnpj[tamanho])) {
      return false;
    }
  }

  return true;
}

export type TipoDeChavePix = "CPF" | "CNPJ" | "TELEFONE" | "EMAIL" | "ALEATORIA";

// Reconhece o tipo da chave e a devolve como o Pix a espera (telefone com +55,
// e-mail e chave aleatória em minúsculas). Recusa o que não parece uma chave.
export function normalizarChavePix(entrada: string): { chave: string; tipo: TipoDeChavePix } {
  const texto = entrada.trim();

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto)) {
    return { chave: texto.toLowerCase(), tipo: "EMAIL" };
  }

  if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(texto)) {
    return { chave: texto.toLowerCase(), tipo: "ALEATORIA" };
  }

  const digitos = soDigitos(texto);

  if (texto.startsWith("+")) {
    if (/^55\d{10,11}$/.test(digitos)) {
      return { chave: `+${digitos}`, tipo: "TELEFONE" };
    }

    throw new Error("Telefone inválido. Use o DDD e o número, por exemplo +5592999990000.");
  }

  // 11 dígitos podem ser CPF ou celular: vale o CPF quando os dígitos verificadores batem.
  if (digitos.length === 11 && cpfValido(digitos)) {
    return { chave: digitos, tipo: "CPF" };
  }

  if (digitos.length === 14 && cnpjValido(digitos)) {
    return { chave: digitos, tipo: "CNPJ" };
  }

  if (digitos.length === 10 || digitos.length === 11) {
    return { chave: `+55${digitos}`, tipo: "TELEFONE" };
  }

  throw new Error(
    "Chave Pix não reconhecida. Use CPF, CNPJ, e-mail, telefone (com DDD) ou a chave aleatória."
  );
}
