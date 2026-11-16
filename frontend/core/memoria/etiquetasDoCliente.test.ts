import {
  MAXIMO_DE_ETIQUETAS,
  TAMANHO_MAXIMO_DA_ETIQUETA,
  lerMudancaDeEtiquetas,
  limparEtiqueta,
  mesclarEtiquetas,
  telefoneDoCadastro,
} from "./etiquetasDoCliente";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

// ---------- Limpeza ----------

verificar(limparEtiqueta("gosto:agnus").etiqueta === "gosto:agnus", "etiqueta já limpa fica igual");
verificar(limparEtiqueta("#Gosto: Aureus ").etiqueta === "gosto:aureus", "tira #, maiúsculas e espaços");
verificar(limparEtiqueta("Evita:Cebola Roxa").etiqueta === "evita:cebola-roxa", "espaço vira hífen");
verificar(limparEtiqueta("apelido:Zé").etiqueta === "apelido:ze", "tira acento");
verificar(limparEtiqueta("aniversario:03-14").etiqueta === "aniversario:03-14", "data curta é aceita");
verificar(limparEtiqueta("gosto:gorgonzola").etiqueta === "gosto:gorgonzola", "gorgonzola não é barrado pelo 'rg'");
verificar(limparEtiqueta("pede:casadinho").etiqueta === "pede:casadinho", "palavra que só contém 'casad' passa");
verificar(limparEtiqueta("x".repeat(100)).etiqueta?.length === TAMANHO_MAXIMO_DA_ETIQUETA, "corta no tamanho máximo");
verificar(limparEtiqueta("").recusada === "VAZIA" && limparEtiqueta("a").recusada === "VAZIA" && limparEtiqueta(null).recusada === "VAZIA" && limparEtiqueta(7).recusada === "VAZIA", "vazia ou sem sentido");
verificar(limparEtiqueta("!!!").recusada === "VAZIA", "só símbolos não vale");

// Sensível
for (const proibida of ["alergia:amendoim", "intolerante-lactose", "sem-gluten", "diabetico", "religiao:evangelica", "partido:x", "gestante", "doenca:renal", "orientacao:gay", "voto:fulano", "saude:ruim"]) {
  verificar(limparEtiqueta(proibida).recusada === "SENSIVEL", `${proibida} é sensível e não entra`);
}

// Dado pessoal
verificar(limparEtiqueta("telefone:92988880001").recusada === "DADO_PESSOAL", "telefone não é gosto");
verificar(limparEtiqueta("cpf 390.533.447-05").recusada === "DADO_PESSOAL", "cpf não entra");
verificar(limparEtiqueta("maria@exemplo.com").recusada === "DADO_PESSOAL", "e-mail não entra");
verificar(limparEtiqueta("https://site.com/x").recusada === "DADO_PESSOAL", "link não entra");

// ---------- Mudança proposta pela IA ----------

{
  const m = lerMudancaDeEtiquetas({ adicionar: ["Gosto:Agnus", "alergia:camarão", "gosto:agnus", "telefone 92988880001", 5, ""], remover: ["evita:cebola", "xx"] });

  verificar(m.adicionar.join(",") === "gosto:agnus", "limpa, tira repetidas e as recusadas");
  verificar(m.recusadas.sort().join(",") === "dado pessoal,dado sensível", "conta o que o sistema recusou");
  verificar(m.remover.join(",") === "evita:cebola,xx", "remover também é limpo");
}

verificar(lerMudancaDeEtiquetas(null).adicionar.length === 0 && lerMudancaDeEtiquetas("lixo").remover.length === 0 && lerMudancaDeEtiquetas({ adicionar: "x" }).adicionar.length === 0, "entrada estragada vira nada");
verificar(lerMudancaDeEtiquetas({ adicionar: Array.from({ length: 100 }, (_, i) => `gosto:item${i}`) }).adicionar.length === 30, "no máximo 30 por vez");

// ---------- Mesclar ----------

verificar(mesclarEtiquetas([], { adicionar: ["gosto:agnus"], remover: [] }).join() === "gosto:agnus", "primeira etiqueta");
verificar(mesclarEtiquetas(["gosto:agnus", "evita:cebola"], { adicionar: [], remover: ["evita:cebola"] }).join() === "gosto:agnus", "remove o pedido");
verificar(mesclarEtiquetas(["gosto:agnus", "gosto:ignis"], { adicionar: ["gosto:agnus"], remover: [] }).join() === "gosto:ignis,gosto:agnus", "repetida vira a mais recente, sem duplicar");
verificar(mesclarEtiquetas(["apelido:biel", "gosto:agnus"], { adicionar: ["apelido:gabriel"], remover: [] }).join() === "gosto:agnus,apelido:gabriel", "apelido tem um valor só");
verificar(mesclarEtiquetas(["ponto:ao-ponto"], { adicionar: ["ponto:bem-passado"], remover: [] }).join() === "ponto:bem-passado", "ponto da carne tem um valor só");
verificar(mesclarEtiquetas(["gosto:agnus"], { adicionar: ["gosto:aureus"], remover: [] }).join() === "gosto:agnus,gosto:aureus", "gosto acumula");
verificar(mesclarEtiquetas(["a1"], { adicionar: [], remover: ["nao-existe"] }).join() === "a1", "remover o que não existe não quebra");

{
  const muitas = Array.from({ length: MAXIMO_DE_ETIQUETAS }, (_, i) => `gosto:item${i}`);

  const depois = mesclarEtiquetas(muitas, { adicionar: ["gosto:novo"], remover: [] });

  verificar(depois.length === MAXIMO_DE_ETIQUETAS && depois[depois.length - 1] === "gosto:novo" && !depois.includes("gosto:item0") && depois.includes("gosto:item1"), "passou de 50: a mais antiga sai");
}

// ---------- Telefone ----------

verificar(telefoneDoCadastro("5592988880001") === "92988880001", "tira o 55 do WhatsApp");
verificar(telefoneDoCadastro("(92) 98888-0001") === "92988880001", "tira a máscara");
verificar(telefoneDoCadastro("9232221234") === "9232221234", "fixo");
verificar(telefoneDoCadastro("123") === undefined && telefoneDoCadastro(undefined) === undefined && telefoneDoCadastro("0192988880001") === undefined, "inválido não vale");

console.log(`✅ Testes das etiquetas do cliente passaram (${verificacoes} verificações).`);
