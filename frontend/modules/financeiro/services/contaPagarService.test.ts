import { validarTitulos } from "./contaPagarService";

import type { NovoTitulo } from "../types/contasAPagar";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

function recusa(titulos: NovoTitulo[], total: number): string {
  try {
    validarTitulos(titulos, total);
  } catch (error) {
    return error instanceof Error ? error.message : "";
  }

  return "";
}

function executarTestes(): void {
  const parcelas: NovoTitulo[] = [
    { tipo: "BOLETO", vencimento: "2026-12-10", valor: 333.34 },
    { tipo: "BOLETO", vencimento: "2027-01-09", valor: 333.33 },
    { tipo: "BOLETO", vencimento: "2027-02-08", valor: 333.33 },
  ];

  const ok = validarTitulos(parcelas, 1000);

  verificar(ok.length === 3, "três parcelas válidas");
  verificar(ok[0].valor === 333.34, "valor da parcela mantido");

  verificar(recusa([], 1000).includes("ao menos uma parcela"), "sem parcela é recusado");
  verificar(recusa(parcelas, 1200).includes("soma das parcelas"), "soma diferente do total é recusada");
  verificar(recusa([{ tipo: "BOLETO", vencimento: "10/12/2026", valor: 1000 }], 1000).includes("vencimento"), "vencimento fora do formato");
  verificar(recusa([{ tipo: "BOLETO", vencimento: "2026-12-10", valor: 0 }], 0).includes("maior que zero"), "valor zero");
  verificar(recusa([{ tipo: "PROMISSORIA" as never, vencimento: "2026-12-10", valor: 1000 }], 1000).includes("BOLETO, DUPLICATA"), "tipo inválido");

  // Diferença de centavos é tolerada
  verificar(recusa([{ tipo: "DUPLICATA", vencimento: "2026-12-10", valor: 999.995 }], 1000) === "", "diferença menor que 1 centavo passa");
}

executarTestes();

console.log(`✅ Testes dos títulos a pagar passaram (${verificacoes} verificações).`);
