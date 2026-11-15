import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";

// Senha: nunca é guardada. Fica só o hash (scrypt, do próprio Node, sem biblioteca
// nova) com um sal aleatório por senha, no formato
//   scrypt$N$r$p$<sal em base64>$<hash em base64>

const N = 16384;
const R = 8;
const P = 1;
const TAMANHO_DO_HASH = 64;

function derivar(senha: string, sal: Buffer, n: number, r: number, p: number, tamanho: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(senha.normalize("NFKC"), sal, tamanho, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (erro, chave) => {
      if (erro) {
        reject(erro);

        return;
      }

      resolve(chave);
    });
  });
}

export async function hashDaSenha(senha: string): Promise<string> {
  const sal = randomBytes(16);

  const hash = await derivar(senha, sal, N, R, P, TAMANHO_DO_HASH);

  return `scrypt$${N}$${R}$${P}$${sal.toString("base64")}$${hash.toString("base64")}`;
}

// Confere sem revelar, pelo tempo de resposta, onde a comparação falhou.
export async function conferirSenha(senha: string, hashGuardado: string): Promise<boolean> {
  const partes = hashGuardado.split("$");

  if (partes.length !== 6 || partes[0] !== "scrypt") {
    return false;
  }

  const [, n, r, p, salBase64, hashBase64] = partes;

  try {
    const esperado = Buffer.from(hashBase64, "base64");

    const calculado = await derivar(senha, Buffer.from(salBase64, "base64"), Number(n), Number(r), Number(p), esperado.length);

    return calculado.length === esperado.length && timingSafeEqual(calculado, esperado);
  } catch {
    return false;
  }
}

// Hash de uma senha qualquer, usado para gastar o mesmo tempo quando o usuário não existe.
let hashDeMentira: Promise<string> | null = null;

export function hashParaDisfarce(): Promise<string> {
  if (!hashDeMentira) {
    hashDeMentira = hashDaSenha("senha-que-ninguem-usa-" + randomBytes(8).toString("hex"));
  }

  return hashDeMentira;
}

// ---------- Regras ----------

export const TAMANHO_MINIMO_DA_SENHA = 8;

export const TAMANHO_MAXIMO_DA_SENHA = 128;

const SENHAS_FRACAS = ["12345678", "123456789", "1234567890", "87654321", "11111111", "00000000", "senha123", "password", "qwertyui", "abcd1234", "beatus123"];

export function problemaNaSenha(senha: string, login?: string): string | null {
  if (senha.length < TAMANHO_MINIMO_DA_SENHA) {
    return `A senha precisa ter pelo menos ${TAMANHO_MINIMO_DA_SENHA} caracteres.`;
  }

  if (senha.length > TAMANHO_MAXIMO_DA_SENHA) {
    return `A senha pode ter até ${TAMANHO_MAXIMO_DA_SENHA} caracteres.`;
  }

  if (SENHAS_FRACAS.includes(senha.toLowerCase())) {
    return "Essa senha é muito comum. Escolha outra.";
  }

  if (login && senha.toLowerCase() === login.toLowerCase()) {
    return "A senha não pode ser igual ao nome de usuário.";
  }

  if (/^(.)\1+$/.test(senha)) {
    return "A senha não pode ser um único caractere repetido.";
  }

  return null;
}

// Nome de usuário: minúsculo, sem espaços, 3 a 30 caracteres.
export function normalizarLogin(texto: string): string {
  return texto.trim().toLowerCase();
}

export function problemaNoLogin(login: string): string | null {
  if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(login)) {
    return "O nome de usuário deve ter de 3 a 30 letras minúsculas, números, ponto, hífen ou sublinhado, sem espaços.";
  }

  return null;
}

// ---------- Token de sessão ----------

// O cookie leva o token; o banco guarda só o hash dele.
export function novoTokenDeSessao(): string {
  return randomBytes(32).toString("base64url");
}

export function hashDoToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
