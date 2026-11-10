import {
  escalarQuantidade,
  fatorDeEscala,
  formatarQuantidadeProducao,
  passosDoTexto,
} from "./fichaProducao";

let verificacoes = 0;

function verificar(
  condicao: boolean,
  mensagem: string
): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

function executarTestes(): void {
  // Passos: um por linha, sem a numeração digitada, sem linhas vazias
  const passos = passosDoTexto(
    "1. Derreta a manteiga em fogo baixo.\r\n\r\n2) Junte a farinha e mexa por 2 minutos.\n- Adicione o leite quente aos poucos\n• Ajuste a textura\nSem numeração\n"
  );

  verificar(passos.length === 5, "cinco passos");
  verificar(
    passos[0] === "Derreta a manteiga em fogo baixo.",
    "tira '1.'"
  );
  verificar(
    passos[1] === "Junte a farinha e mexa por 2 minutos.",
    "tira '2)'"
  );
  verificar(
    passos[2] === "Adicione o leite quente aos poucos",
    "tira '-'"
  );
  verificar(passos[3] === "Ajuste a textura", "tira '•'");
  verificar(passos[4] === "Sem numeração", "linha sem marcador");
  verificar(passosDoTexto("").length === 0, "texto vazio");
  verificar(passosDoTexto(undefined).length === 0, "sem texto");

  // Um número no começo que faz parte do passo não some
  verificar(
    passosDoTexto("200 g de queijo")[0] === "200 g de queijo",
    "número sem ponto fica"
  );

  // Escala: receita base de 1 L, fazer 3 L
  verificar(fatorDeEscala(3000, 1000) === 3, "3 L a partir de 1 L");
  verificar(fatorDeEscala(500, 1000) === 0.5, "metade da receita");
  verificar(fatorDeEscala(0, 1000) === 1, "zero volta para 1");
  verificar(fatorDeEscala(10, 0) === 1, "base inválida volta para 1");

  verificar(
    escalarQuantidade(40, 3) === 120,
    "40 g de manteiga viram 120 g"
  );

  // Formatação
  verificar(
    formatarQuantidadeProducao(120, "g") === "120 g",
    "120 g"
  );
  verificar(
    formatarQuantidadeProducao(1500, "g") === "1.500 g (1,5 kg)",
    "1.500 g mostra o kg"
  );
  verificar(
    formatarQuantidadeProducao(3000, "ml") === "3.000 ml (3 L)",
    "3.000 ml mostra o L"
  );
  verificar(
    formatarQuantidadeProducao(2.5, "un") === "2,5 un",
    "unidade com decimal"
  );
  verificar(
    formatarQuantidadeProducao(0.3333333, "kg") === "0,33 kg",
    "arredonda em 2 casas"
  );

  console.log(
    `✅ Testes da ficha de produção passaram (${verificacoes} verificações).`
  );
}

try {
  executarTestes();
} catch (error) {
  console.error("❌ Testes da ficha de produção falharam:");
  console.error(error);
  process.exitCode = 1;
}
