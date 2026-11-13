import { alocarNaCozinha } from "./alocarNaCozinha";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

function executarTestes(): void {
  const cartoes = [
    { producaoLoteId: "novo", gavetaId: "g2", quantidade: 500, validadeAte: "2026-11-20T10:00:00.000Z" },
    { producaoLoteId: "velho", gavetaId: "g1", quantidade: 200, validadeAte: "2026-11-15T10:00:00.000Z" },
    { producaoLoteId: "sem-validade", quantidade: 100 },
    { producaoLoteId: "vazio", quantidade: 0, validadeAte: "2026-11-10T10:00:00.000Z" },
  ];

  // Primeiro a vencer sai primeiro: o lote velho, depois o novo
  const resultado = alocarNaCozinha(cartoes, 320);

  verificar(
    resultado.alocacoes.length === 2 &&
      resultado.alocacoes[0].producaoLoteId === "velho" &&
      resultado.alocacoes[0].quantidade === 200 &&
      resultado.alocacoes[1].producaoLoteId === "novo" &&
      resultado.alocacoes[1].quantidade === 120,
    "o lote que vence primeiro sai primeiro"
  );

  verificar(resultado.faltante === 0, "nada faltou");

  // Cartão sem quantidade é ignorado; sem validade vai por último
  const todos = alocarNaCozinha(cartoes, 800);

  verificar(
    todos.alocacoes.map((a) => a.producaoLoteId).join(",") ===
      "velho,novo,sem-validade",
    "ordem: velho, novo, sem validade (o vazio não entra)"
  );

  verificar(todos.faltante === 0, "800 cabem nos 800 disponíveis");

  // Falta: o que a cozinha não tinha
  const falta = alocarNaCozinha(cartoes, 1000);

  verificar(
    Math.abs(falta.faltante - 200) < 0.0001,
    "faltam 200 quando a cozinha só tem 800"
  );

  // Cozinha vazia
  const vazia = alocarNaCozinha([], 150);

  verificar(
    vazia.alocacoes.length === 0 && vazia.faltante === 150,
    "sem nada na cozinha, tudo falta"
  );

  // Frações
  const fracao = alocarNaCozinha(
    [{ producaoLoteId: "a", quantidade: 0.3333 }],
    0.1111
  );

  verificar(
    fracao.alocacoes[0].quantidade === 0.1111 && fracao.faltante === 0,
    "quantidades fracionadas"
  );

  console.log(
    `✅ Testes da baixa pela cozinha passaram (${verificacoes} verificações).`
  );
}

try {
  executarTestes();
} catch (error) {
  console.error("❌ Testes da baixa pela cozinha falharam:");
  console.error(error);
  process.exitCode = 1;
}
