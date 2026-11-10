import {
  cnpjValido,
  cpfValido,
  formatarCnpj,
  formatarCpf,
  formatarTelefone,
} from "./documentoFornecedor";

function verificar(
  condicao: boolean,
  mensagem: string
) {
  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

verificar(cnpjValido("11.222.333/0001-81"), "CNPJ válido com máscara");
verificar(cnpjValido("12345678000195"), "CNPJ válido sem máscara");
verificar(!cnpjValido("12.345.678/0001-90"), "CNPJ com dígito errado");
verificar(!cnpjValido("11111111111111"), "CNPJ com dígitos repetidos");
verificar(!cnpjValido("1122233300018"), "CNPJ curto");

verificar(cpfValido("123.456.789-09"), "CPF válido");
verificar(!cpfValido("123.456.789-00"), "CPF com dígito errado");
verificar(!cpfValido("000.000.000-00"), "CPF com dígitos repetidos");

verificar(formatarCnpj("11222333000181") === "11.222.333/0001-81", "máscara do CNPJ");
verificar(formatarCnpj("11222") === "11.222", "máscara parcial do CNPJ");
verificar(formatarCpf("12345678909") === "123.456.789-09", "máscara do CPF");
verificar(formatarTelefone("6134939002") === "(61) 3493-9002", "telefone fixo");
verificar(formatarTelefone("11912345678") === "(11) 91234-5678", "celular");

console.log("✅ Testes do documento do fornecedor passaram.");
