import { conferirSenha, hashDaSenha, hashDoToken, normalizarLogin, novoTokenDeSessao, problemaNaSenha, problemaNoLogin } from "./senha";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

async function executarTestes(): Promise<void> {
  // ---------- Hash ----------
  const hash = await hashDaSenha("Hamburguer#2026");

  verificar(hash.startsWith("scrypt$") && hash.split("$").length === 6, "formato do hash");
  verificar(!hash.includes("Hamburguer"), "o hash não contém a senha");
  verificar(await conferirSenha("Hamburguer#2026", hash), "senha certa confere");
  verificar(!(await conferirSenha("Hamburguer#2027", hash)), "senha errada não confere");
  verificar(!(await conferirSenha("", hash)), "senha vazia não confere");

  const outro = await hashDaSenha("Hamburguer#2026");

  verificar(outro !== hash, "cada hash tem sal próprio");
  verificar(await conferirSenha("Hamburguer#2026", outro), "os dois hashes conferem");

  // Acentos: a mesma senha, digitada composta ou decomposta, confere.
  const acentuada = await hashDaSenha("Pão-de-queijo-1");

  verificar(await conferirSenha("Pão-de-queijo-1".normalize("NFC").replace("Pão", "Pão"), acentuada), "acentuação normalizada");

  // Hash estragado nunca confere nem quebra.
  verificar(!(await conferirSenha("x", "lixo")), "hash inválido");
  verificar(!(await conferirSenha("x", "scrypt$1$2$3$a$b")), "hash com parâmetros ruins");
  verificar(!(await conferirSenha("x", "md5$16384$8$1$AAAA$BBBB")), "algoritmo desconhecido");

  // ---------- Regras da senha ----------
  verificar(problemaNaSenha("curta") !== null, "senha curta");
  verificar(problemaNaSenha("12345678") !== null, "senha comum");
  verificar(problemaNaSenha("aaaaaaaaaa") !== null, "caractere repetido");
  verificar(problemaNaSenha("kacius.dutra", "Kacius.Dutra") !== null, "igual ao usuário");
  verificar(problemaNaSenha("x".repeat(129)) !== null, "senha enorme");
  verificar(problemaNaSenha("Hamburguer#2026", "kacius") === null, "senha boa");
  verificar(problemaNaSenha("frase longa com espacos") === null, "frase com espaços");

  // ---------- Usuário ----------
  verificar(normalizarLogin("  Kacius ") === "kacius", "normaliza o usuário");
  verificar(problemaNoLogin("kacius") === null, "usuário bom");
  verificar(problemaNoLogin("maria.silva-2") === null, "usuário com ponto e hífen");
  verificar(problemaNoLogin("ab") !== null, "usuário curto");
  verificar(problemaNoLogin("com espaco") !== null, "usuário com espaço");
  verificar(problemaNoLogin("Maiuscula") !== null, "usuário só vale minúsculo depois de normalizar");
  verificar(problemaNoLogin(".comeca") !== null, "começa com ponto");
  verificar(problemaNoLogin("x".repeat(31)) !== null, "usuário longo");

  // ---------- Token ----------
  const token = novoTokenDeSessao();

  verificar(token.length >= 43, "token longo");
  verificar(novoTokenDeSessao() !== token, "token diferente a cada vez");
  verificar(hashDoToken(token) === hashDoToken(token), "hash do token estável");
  verificar(hashDoToken(token) !== token && hashDoToken(token).length === 64, "o banco não guarda o token");
}

void executarTestes().then(() => {
  console.log(`✅ Testes de senha e token passaram (${verificacoes} verificações).`);
});
