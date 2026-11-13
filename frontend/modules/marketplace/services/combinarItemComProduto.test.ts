import { combinarItemComProduto, normalizarNome } from "./combinarItemComProduto";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

const PRODUTOS = [
  { id: "burger-sanctum", nome: "Sanctum" },
  { id: "agnus", nome: "Agnus" },
  { id: "batata", nome: "Batata Frita" },
  { id: "suco-1", nome: "Suco de Laranja" },
  { id: "suco-2", nome: "suco de laranja" },
];

function executarTestes(): void {
  verificar(normalizarNome("Sanctum (iFood)") === "sanctum", "tira o parêntese");
  verificar(normalizarNome("  Batata  FRITA!! ") === "batata frita", "minúsculo, sem sinais e sem espaço repetido");
  verificar(normalizarNome("Pão Brioche") === "pao brioche", "sem acento");

  const item = (codigo: string, nome: string) => ({ codigoItemExterno: codigo, nome });

  verificar(combinarItemComProduto(item("agnus", "qualquer nome"), PRODUTOS) === "agnus", "código igual ao id do produto");
  verificar(combinarItemComProduto(item("X1", "Sanctum (iFood)"), PRODUTOS) === "burger-sanctum", "nome bate depois de normalizar");
  verificar(combinarItemComProduto(item("X2", "BATATA frita"), PRODUTOS) === "batata", "maiúsculas não importam");
  verificar(combinarItemComProduto(item("X3", "Combo especial"), PRODUTOS) === null, "sem correspondência: pendente");
  verificar(combinarItemComProduto(item("X4", "Suco de Laranja"), PRODUTOS) === null, "dois produtos com o mesmo nome: não adivinha");
  verificar(combinarItemComProduto(item("X5", "   "), PRODUTOS) === null, "nome vazio: pendente");
}

executarTestes();

console.log(`✅ Testes do vínculo automático passaram (${verificacoes} verificações).`);
