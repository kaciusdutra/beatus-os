import {
  crc16,
  gerarPixCopiaECola,
  idDaCobranca,
  lerPix,
  normalizarChavePix,
  textoDoPix,
} from "./gerarPix";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

function recusa(funcao: () => unknown): string {
  try {
    funcao();
  } catch (erro) {
    return erro instanceof Error ? erro.message : "";
  }

  return "";
}

function executarTestes(): void {
  // CRC16-CCITT: valor de referência padrão da especificação para "123456789"
  verificar(crc16("123456789") === "29B1", "CRC16-CCITT de 123456789 é 29B1");
  verificar(crc16("") === "FFFF", "CRC do texto vazio é o valor inicial");

  // Textos do código
  verificar(textoDoPix("Beatus Burger Ltda.", 25) === "BEATUS BURGER LTDA", "maiúsculo, sem ponto");
  verificar(textoDoPix("São Paulo", 15) === "SAO PAULO", "sem acento");
  verificar(textoDoPix("Manaus   Amazonas do Norte", 15) === "MANAUS AMAZONAS", "corta no tamanho máximo");
  verificar(idDaCobranca("BTS-123_abc") === "BTS123abc", "txid só com letras e números");
  verificar(idDaCobranca("A".repeat(40)).length === 25, "txid de no máximo 25");

  // Código completo, lido de volta
  const codigo = gerarPixCopiaECola({
    chave: "+5592999990000",
    nome: "Beatus Burger",
    cidade: "Manaus",
    valor: 65.5,
    txid: "BTS0001",
  });

  const lido = lerPix(codigo);

  verificar(lido.crcValido, "o CRC do código gerado é válido");
  verificar(lido.campos["00"] === "01", "versão do formato");
  verificar(lido.campos["53"] === "986", "moeda real");
  verificar(lido.campos["54"] === "65.50", "valor com duas casas");
  verificar(lido.campos["58"] === "BR" && lido.campos["59"] === "BEATUS BURGER" && lido.campos["60"] === "MANAUS", "país, nome e cidade");
  verificar(lido.campos["26"].startsWith("0014br.gov.bcb.pix"), "identifica o Pix");
  verificar(lido.campos["26"].includes("0114+5592999990000"), "a chave vai no campo 01 da conta");
  verificar(lido.campos["62"] === "0507BTS0001", "o txid vai no campo 05 dos dados adicionais");
  verificar(codigo.startsWith("000201"), "começa com o indicador de formato");
  verificar(/6304[0-9A-F]{4}$/.test(codigo), "termina com o CRC");

  // Estável: o mesmo pedido gera o mesmo código
  verificar(
    gerarPixCopiaECola({ chave: "+5592999990000", nome: "Beatus Burger", cidade: "Manaus", valor: 65.5, txid: "BTS0001" }) === codigo,
    "mesmo dado, mesmo código"
  );

  // Descrição vira o campo 02 da conta
  const comDescricao = lerPix(
    gerarPixCopiaECola({ chave: "a@b.com", nome: "Beatus", cidade: "Manaus", valor: 10, txid: "X1", descricao: "Pedido 42" })
  );

  verificar(comDescricao.crcValido && comDescricao.campos["26"].includes("0209PEDIDO 42"), "descrição incluída e CRC válido");

  // Valores
  verificar(lerPix(gerarPixCopiaECola({ chave: "a@b.com", nome: "B", cidade: "M", valor: 1, txid: "X" })).campos["54"] === "1.00", "R$ 1 vira 1.00");
  verificar(lerPix(gerarPixCopiaECola({ chave: "a@b.com", nome: "B", cidade: "M", valor: 1234.5, txid: "X" })).campos["54"] === "1234.50", "milhar sem separador");

  // Recusas
  const base = { chave: "a@b.com", nome: "Beatus", cidade: "Manaus", valor: 10, txid: "X1" };

  verificar(recusa(() => gerarPixCopiaECola({ ...base, valor: 0 })).includes("maior que zero"), "valor zero");
  verificar(recusa(() => gerarPixCopiaECola({ ...base, valor: NaN })).includes("maior que zero"), "valor inválido");
  verificar(recusa(() => gerarPixCopiaECola({ ...base, chave: " " })).includes("chave"), "sem chave");
  verificar(recusa(() => gerarPixCopiaECola({ ...base, nome: "!!!" })).includes("nome"), "nome sem letras");
  verificar(recusa(() => gerarPixCopiaECola({ ...base, cidade: "" })).includes("cidade"), "sem cidade");
  verificar(recusa(() => gerarPixCopiaECola({ ...base, txid: "---" })).includes("identificador"), "txid vazio");

  // Chaves
  verificar(normalizarChavePix("Fulano@Exemplo.com").tipo === "EMAIL" && normalizarChavePix("Fulano@Exemplo.com").chave === "fulano@exemplo.com", "e-mail em minúsculas");
  verificar(normalizarChavePix("123E4567-E89B-12D3-A456-426614174000").tipo === "ALEATORIA", "chave aleatória");
  verificar(normalizarChavePix("529.982.247-25").chave === "52998224725" && normalizarChavePix("529.982.247-25").tipo === "CPF", "CPF válido");
  verificar(normalizarChavePix("11.222.333/0001-81").tipo === "CNPJ", "CNPJ válido");
  verificar(normalizarChavePix("(92) 99999-0000").chave === "+5592999990000" && normalizarChavePix("(92) 99999-0000").tipo === "TELEFONE", "celular vira +55");
  verificar(normalizarChavePix("+55 92 99999-0000").chave === "+5592999990000", "telefone já com +55");
  verificar(recusa(() => normalizarChavePix("12345")).includes("não reconhecida"), "chave sem formato");
  verificar(recusa(() => normalizarChavePix("+1 555 0100")).includes("Telefone inválido"), "telefone estrangeiro recusado");
}

executarTestes();

console.log(`✅ Testes do Pix passaram (${verificacoes} verificações).`);
