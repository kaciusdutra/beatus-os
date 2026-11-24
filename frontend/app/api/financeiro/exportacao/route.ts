import { NextRequest, NextResponse } from "next/server";

import { getDreService, getFinanceiroService } from "@/modules/financeiro/services/server/financeiroServiceFactory";

import { csvDaDre, csvDoCaixa } from "@/modules/financeiro/services/exportarCsv";

import { respostaDeErro } from "@/modules/estoque/services/server/respostaDeErro";

const FORMATO_MES = /^\d{4}-(0[1-9]|1[0-2])$/;

function mesAtual(): string {
  const agora = new Date();

  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
}

// Arquivo CSV para o contador. ?mes=AAAA-MM (padrão: mês atual) &tipo=caixa|dre
export async function GET(request: NextRequest) {
  try {
    const mes = request.nextUrl.searchParams.get("mes") || mesAtual();

    const tipo = request.nextUrl.searchParams.get("tipo") || "caixa";

    if (!FORMATO_MES.test(mes)) {
      throw new Error("Informe o mês no formato AAAA-MM.");
    }

    if (tipo !== "caixa" && tipo !== "dre") {
      throw new Error("O tipo da exportação é caixa ou dre.");
    }

    let csv: string;

    if (tipo === "dre") {
      csv = csvDaDre(await getDreService().doMes(mes));
    } else {
      const [ano, numero] = mes.split("-").map(Number);

      const ultimoDia = new Date(ano, numero, 0).getDate();

      csv = csvDoCaixa(await getFinanceiroService().fluxoDeCaixa(`${mes}-01`, `${mes}-${String(ultimoDia).padStart(2, "0")}`));
    }

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="beatus-${tipo}-${mes}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return respostaDeErro(error, "Não foi possível gerar o arquivo.");
  }
}
