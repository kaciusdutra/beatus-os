import type {
  AlertaDeGiro,
  CapitalDeGiro,
  ContaPagar,
  DiaDaProjecao,
  FaixaDeTitulos,
  SituacaoDoTitulo,
} from "../types/contasAPagar";

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function moeda(valor: number): string {
  return `R$ ${arredondar(valor).toFixed(2).replace(".", ",")}`;
}

// Datas AAAA-MM-DD, sempre ao meio-dia local para não virar o dia por fuso.
function aData(texto: string): Date {
  return new Date(`${texto}T12:00:00`);
}

export function textoDaData(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, "0");

  const dia = String(data.getDate()).padStart(2, "0");

  return `${data.getFullYear()}-${mes}-${dia}`;
}

export function somarDias(texto: string, dias: number): string {
  const data = aData(texto);

  data.setDate(data.getDate() + dias);

  return textoDaData(data);
}

export function diasEntre(de: string, ate: string): number {
  return Math.round((aData(ate).getTime() - aData(de).getTime()) / 86400000);
}

function dataCurta(texto: string): string {
  const [, mes, dia] = texto.split("-");

  return `${dia}/${mes}`;
}

export function situacaoDoTitulo(
  titulo: Pick<ContaPagar, "status" | "vencimento">,
  hoje: string
): SituacaoDoTitulo {
  if (titulo.status === "PAGO") {
    return "PAGO";
  }

  if (titulo.status === "CANCELADO") {
    return "CANCELADO";
  }

  if (titulo.vencimento < hoje) {
    return "VENCIDO";
  }

  if (titulo.vencimento === hoje) {
    return "VENCE_HOJE";
  }

  return "ABERTO";
}

function faixa(titulos: ContaPagar[]): FaixaDeTitulos {
  return {
    quantidade: titulos.length,
    valor: arredondar(titulos.reduce((soma, titulo) => soma + titulo.valor, 0)),
  };
}

export interface EntradaDoGiro {
  hoje: string;
  // Nulo quando o Kacius ainda não informou o saldo inicial.
  saldoAtual: number | null;
  titulos: ContaPagar[];
  // Média de vendas aprovadas por dia da semana (0 = domingo ... 6 = sábado).
  vendasMediaPorDiaDaSemana: number[];
  custosFixosMensais: number;
  horizonteDias?: number;
}

// Capital de giro: o que há em caixa, o que vence e como o caixa evolui nos
// próximos dias. A projeção é uma estimativa: vendas pela média recente,
// títulos pelo vencimento e custos fixos rateados por dia. Não inclui compras
// futuras à vista nem o repasse dos marketplaces.
export function calcularCapitalDeGiro(entrada: EntradaDoGiro): CapitalDeGiro {
  const { hoje, saldoAtual } = entrada;

  const horizonte = entrada.horizonteDias ?? 30;

  const abertos = entrada.titulos.filter((titulo) => titulo.status === "ABERTO");

  const vencidos = abertos.filter((titulo) => titulo.vencimento < hoje);

  const venceHoje = abertos.filter((titulo) => titulo.vencimento === hoje);

  // Os vencidos entram: precisam ser pagos agora.
  const ate = (dias: number) =>
    abertos.filter((titulo) => titulo.vencimento <= somarDias(hoje, dias));

  const vencemEmAte3 = abertos.filter(
    (titulo) => titulo.vencimento > hoje && titulo.vencimento <= somarDias(hoje, 3)
  );

  // Projeção: títulos vencidos pesam já no dia de hoje.
  const projecao: DiaDaProjecao[] = [];

  let primeiroDiaNegativo: CapitalDeGiro["primeiroDiaNegativo"];

  let menorSaldo: CapitalDeGiro["menorSaldo"];

  if (saldoAtual !== null) {
    let saldo = saldoAtual;

    const fixoPorDia = entrada.custosFixosMensais / 30;

    for (let indice = 0; indice <= horizonte; indice++) {
      const data = somarDias(hoje, indice);

      const aPagar = abertos
        .filter((titulo) =>
          indice === 0 ? titulo.vencimento <= hoje : titulo.vencimento === data
        )
        .reduce((soma, titulo) => soma + titulo.valor, 0);

      // Hoje já está em curso: não se projeta venda nem custo do dia, só o que vence.
      const vendas = indice === 0 ? 0 : entrada.vendasMediaPorDiaDaSemana[aData(data).getDay()] ?? 0;

      const fixos = indice === 0 ? 0 : fixoPorDia;

      saldo = arredondar(saldo + vendas - aPagar - fixos);

      projecao.push({
        data,
        vendasEsperadas: arredondar(vendas),
        titulosAPagar: arredondar(aPagar),
        custosFixos: arredondar(fixos),
        saldo,
      });

      if (saldo < 0 && !primeiroDiaNegativo) {
        primeiroDiaNegativo = { data, saldo };
      }

      if (!menorSaldo || saldo < menorSaldo.saldo) {
        menorSaldo = { data, saldo };
      }
    }
  }

  const comPrazo = entrada.titulos.filter((titulo) => titulo.status !== "CANCELADO");

  const prazos = comPrazo
    .map((titulo) => diasEntre(titulo.criadoEm.slice(0, 10), titulo.vencimento))
    .filter((dias) => dias >= 0);

  const prazoMedioDias =
    prazos.length > 0
      ? Math.round(prazos.reduce((soma, dias) => soma + dias, 0) / prazos.length)
      : undefined;

  const alertas: AlertaDeGiro[] = [];

  if (vencidos.length > 0) {
    const total = faixa(vencidos);

    alertas.push({
      nivel: "CRITICO",
      codigo: "VENCIDO",
      mensagem: `${total.quantidade} título(s) vencido(s), ${moeda(total.valor)}. Pague ou renegocie para evitar juros e perda de crédito.`,
    });
  }

  if (venceHoje.length > 0) {
    const total = faixa(venceHoje);

    alertas.push({
      nivel: "ATENCAO",
      codigo: "VENCE_HOJE",
      mensagem: `${total.quantidade} título(s) vence(m) hoje, ${moeda(total.valor)}.`,
    });
  }

  if (vencemEmAte3.length > 0) {
    const total = faixa(vencemEmAte3);

    alertas.push({
      nivel: "ATENCAO",
      codigo: "VENCE_EM_3_DIAS",
      mensagem: `${total.quantidade} título(s) vence(m) nos próximos 3 dias, ${moeda(total.valor)}.`,
    });
  }

  if (saldoAtual === null) {
    alertas.push({
      nivel: "INFO",
      codigo: "SEM_SALDO_INICIAL",
      mensagem: "Informe o saldo inicial do caixa para ver a projeção do capital de giro.",
    });
  } else if (primeiroDiaNegativo) {
    alertas.push({
      nivel: "CRITICO",
      codigo: "CAIXA_NEGATIVO",
      mensagem: `Pela estimativa, o caixa fica negativo em ${dataCurta(primeiroDiaNegativo.data)} (${moeda(primeiroDiaNegativo.saldo)}). Renegocie o vencimento, antecipe vendas ou reforce o caixa antes dessa data.`,
    });
  } else if (menorSaldo && menorSaldo.saldo < Math.max(200, (saldoAtual ?? 0) * 0.1)) {
    alertas.push({
      nivel: "ATENCAO",
      codigo: "CAIXA_BAIXO",
      mensagem: `O caixa chega a ${moeda(menorSaldo.saldo)} em ${dataCurta(menorSaldo.data)}, a menor folga dos próximos ${horizonte} dias.`,
    });
  }

  return {
    hoje,
    saldoAtual,
    totalEmAberto: faixa(abertos),
    vencidos: faixa(vencidos),
    venceHoje: faixa(venceHoje),
    ate7Dias: faixa(ate(7)),
    ate15Dias: faixa(ate(15)),
    ate30Dias: faixa(ate(30)),
    projecao,
    primeiroDiaNegativo,
    menorSaldo,
    prazoMedioDias,
    alertas,
  };
}

// Média de venda por dia da semana a partir dos pagamentos dos últimos 28 dias
// (4 de cada dia da semana). Dias sem venda, como segunda e terça na rotina
// atual, ficam em zero.
export function mediaDeVendasPorDiaDaSemana(
  pagamentos: { data: string; valor: number }[]
): number[] {
  const somas = [0, 0, 0, 0, 0, 0, 0];

  for (const pagamento of pagamentos) {
    somas[new Date(pagamento.data).getDay()] += pagamento.valor;
  }

  return somas.map((soma) => arredondar(soma / 4));
}
