import {
  ErroRespostaLeituraFoto,
  estimarCustoLeituraFoto,
  interpretarRespostaLeituraFoto,
} from "./leituraFotoDocumento";

// Respostas simuladas da IA (dados fictícios). Nada aqui chama a API.
const CHAVE_NFE =
  "13261111222333000181550010000123451123456780";

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

function recusa(
  acao: () => unknown
): boolean {
  try {
    acao();
  } catch (error) {
    return error instanceof ErroRespostaLeituraFoto;
  }

  return false;
}

function executarTestes(): void {
  // --------------------------------------------------
  // Nota impressa, tudo certo (resposta vem entre ```)
  // --------------------------------------------------
  const nota = interpretarRespostaLeituraFoto(
    "```json\n" +
      JSON.stringify({
        tipoDocumento: "NOTA_FISCAL",
        manuscrito: false,
        emitente: {
          nome: "Fornecedor Teste QR",
          documento: "11.222.333/0001-81",
          telefone: "(92) 3333-4444",
        },
        numeroDocumento: "12345",
        serie: "1",
        chaveAcesso: CHAVE_NFE,
        dataDocumento: "2026-11-05",
        itens: [
          {
            descricao: "Queijo coalho",
            codigo: "QJ-001",
            unidade: "KG",
            quantidade: 2.5,
            valorUnitario: 48.9,
            valorTotal: 122.25,
          },
          {
            descricao: "Pão brioche",
            unidade: "PCT",
            quantidade: 10,
            valorUnitario: 12,
            valorTotal: 120,
          },
        ],
        desconto: 0,
        frete: 15,
        valorTotal: 257.25,
        camposIncertos: [],
      }) +
      "\n```"
  );

  verificar(nota.tipoDocumento === "NOTA_FISCAL", "tipo");
  verificar(!nota.manuscrito, "não é manuscrito");
  verificar(nota.emitente.documento === "11222333000181", "CNPJ só com dígitos");
  verificar(nota.emitente.tipoDocumento === "CNPJ", "tipo do documento");
  verificar(nota.emitente.telefone === "9233334444", "telefone só com dígitos");
  verificar(nota.chaveAcesso === CHAVE_NFE, "chave válida");
  verificar(nota.dataDocumento === "2026-11-05", "data");
  verificar(nota.itens.length === 2, "dois itens");
  verificar(nota.itens[0].codigo === "QJ-001", "código do item");
  verificar(!nota.itens[0].incerto && !nota.itens[1].incerto, "itens sem dúvida");
  verificar(nota.frete === 15, "frete");
  verificar(nota.valorTotal === 257.25, "total");
  verificar(nota.avisos.length === 0, "sem avisos quando tudo bate");

  // --------------------------------------------------
  // Recibo manuscrito de fornecedor informal (CPF), com dúvidas
  // --------------------------------------------------
  const recibo = interpretarRespostaLeituraFoto(
    JSON.stringify({
      tipoDocumento: "RECIBO",
      manuscrito: true,
      emitente: { nome: "Seu Raimundo", documento: "123.456.789-09" },
      dataDocumento: "2026-11-09",
      itens: [
        {
          descricao: "Queijo coalho",
          unidade: "kg",
          quantidade: "2,5",
          valorTotal: "R$ 90,00",
          incerto: true,
          motivoIncerteza: "o 2 pode ser um 3",
        },
        { descricao: "Tapioca", quantidade: 3, valorUnitario: 4 },
      ],
      valorTotal: 120,
      camposIncertos: ["total", "data", "nao-existe"],
    })
  );

  verificar(recibo.tipoDocumento === "RECIBO", "recibo");
  verificar(recibo.manuscrito, "manuscrito");
  verificar(recibo.emitente.tipoDocumento === "CPF", "CPF válido");
  verificar(recibo.chaveAcesso === undefined, "recibo sem chave");
  verificar(recibo.itens[0].quantidade === 2.5, "quantidade em texto brasileiro");
  verificar(recibo.itens[0].valorUnitario === 36, "valor unitário calculado pelo total");
  verificar(recibo.itens[0].incerto, "item marcado como incerto");
  verificar(
    recibo.itens[0].motivoIncerteza === "o 2 pode ser um 3",
    "motivo da IA"
  );
  verificar(recibo.itens[1].incerto, "item sem unidade fica para conferir");
  verificar(recibo.itens[1].unidade === "un", "unidade padrão");
  verificar(
    recibo.camposIncertos.length === 2 &&
      recibo.camposIncertos.includes("total") &&
      recibo.camposIncertos.includes("data"),
    "só campos conhecidos"
  );
  // 90 + 12 = 102, mas o total lido é 120
  verificar(
    recibo.avisos.some((aviso) =>
      aviso.includes("R$ 102,00") && aviso.includes("R$ 120,00")
    ),
    "aviso de soma que não bate"
  );

  // --------------------------------------------------
  // Valores inválidos viram aviso, nunca dados errados
  // --------------------------------------------------
  const ruim = interpretarRespostaLeituraFoto(
    JSON.stringify({
      tipoDocumento: "QUALQUER",
      emitente: { nome: "X", documento: "12.345.678/0001-90" },
      chaveAcesso: "123",
      dataDocumento: "31/02/2026",
      itens: [
        { descricao: "", quantidade: 1, valorUnitario: 1 },
        { descricao: "Item", quantidade: 0, valorTotal: 10 },
        { descricao: "Item 2", quantidade: 2, valorUnitario: 5, valorTotal: 11 },
      ],
    })
  );

  verificar(ruim.tipoDocumento === "OUTRO", "tipo desconhecido vira OUTRO");
  verificar(ruim.emitente.documento === undefined, "CNPJ inválido não é usado");
  verificar(
    ruim.avisos.some((aviso) => aviso.includes("não tem os dígitos corretos")),
    "aviso de CNPJ"
  );
  verificar(ruim.chaveAcesso === undefined, "chave inválida não é usada");
  verificar(
    ruim.avisos.some((aviso) => aviso.includes("chave de acesso")),
    "aviso de chave"
  );
  verificar(ruim.dataDocumento === undefined, "data impossível");
  verificar(ruim.itens.length === 2, "item sem descrição é descartado");
  verificar(
    ruim.itens[0].quantidade === 1 && ruim.itens[0].incerto,
    "quantidade zero vira 1 e fica para conferir"
  );
  verificar(
    ruim.itens[1].incerto &&
      (ruim.itens[1].motivoIncerteza ?? "").includes("R$ 10,00"),
    "item cujo total não bate"
  );

  // --------------------------------------------------
  // Sem itens, e respostas fora do formato
  // --------------------------------------------------
  const vazio = interpretarRespostaLeituraFoto('{"itens": []}');
  verificar(
    vazio.itens.length === 0 &&
      vazio.avisos.some((aviso) => aviso.includes("Nenhum item")),
    "sem itens"
  );

  verificar(recusa(() => interpretarRespostaLeituraFoto("não consegui ler")), "texto sem JSON");
  verificar(recusa(() => interpretarRespostaLeituraFoto('{"itens": [')), "JSON quebrado");
  verificar(recusa(() => interpretarRespostaLeituraFoto("")), "resposta vazia");

  // --------------------------------------------------
  // Custo da leitura
  // --------------------------------------------------
  const uso = { tokensEntrada: 2000, tokensSaida: 500 };

  verificar(
    estimarCustoLeituraFoto(uso, {}) === undefined,
    "sem preço configurado não há custo"
  );
  verificar(
    estimarCustoLeituraFoto(uso, { entradaPorMilhao: 10 }) === undefined,
    "preço pela metade não há custo"
  );
  verificar(
    estimarCustoLeituraFoto(uso, { entradaPorMilhao: 10, saidaPorMilhao: 50 }) ===
      0.045,
    "custo = 2000/1e6*10 + 500/1e6*50"
  );
  verificar(
    estimarCustoLeituraFoto(uso, { entradaPorMilhao: -1, saidaPorMilhao: 50 }) ===
      undefined,
    "preço negativo é ignorado"
  );

  console.log(
    `✅ Testes da leitura por foto passaram (${verificacoes} verificações).`
  );
}

try {
  executarTestes();
} catch (error) {
  console.error("❌ Testes da leitura por foto falharam:");
  console.error(error);
  process.exitCode = 1;
}
