import {
  formatarCep,
  lerEnderecoFornecedor,
  normalizarEnderecoFornecedor,
} from "./enderecoFornecedor";

function verificar(
  condicao: boolean,
  mensagem: string
) {
  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

verificar(formatarCep("69005000") === "69005-000", "máscara do CEP");
verificar(formatarCep("6900") === "6900", "máscara parcial do CEP");
verificar(formatarCep("69005-000123") === "69005-000", "CEP limitado a 8 números");

const lido = lerEnderecoFornecedor({
  cep: " 69005-000 ",
  uf: "am",
  numero: "",
  inscricaoEstadual: 123,
});

verificar(lido.cep === "69005-000", "leitura tira espaços");
verificar(lido.numero === undefined, "texto vazio vira indefinido");
verificar(lido.inscricaoEstadual === undefined, "valor que não é texto é ignorado");

const normalizado = normalizarEnderecoFornecedor(lido);

verificar(normalizado.cep === "69005000", "CEP só com dígitos");
verificar(normalizado.uf === "AM", "UF em maiúsculas");

let recusou = false;

try {
  normalizarEnderecoFornecedor({ cep: "123" });
} catch {
  recusou = true;
}

verificar(recusou, "CEP incompleto é recusado");

console.log("✅ Testes do endereço do fornecedor passaram.");
