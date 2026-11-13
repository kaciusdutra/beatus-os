import {
  FichaTecnica,
  FichaTecnicaItem,
} from "../../types/fichaTecnica";

function texto(valor: unknown): string | undefined {
  return typeof valor === "string" && valor.trim()
    ? valor.trim()
    : undefined;
}

// Número opcional: vazio ou ausente vira undefined.
function numeroOpcional(valor: unknown): number | undefined {
  if (valor === undefined || valor === null || valor === "") {
    return undefined;
  }

  const convertido = Number(valor);

  return Number.isFinite(convertido)
    ? convertido
    : undefined;
}

function numero(valor: unknown, padrao = 0): number {
  const convertido = Number(valor);

  return Number.isFinite(convertido)
    ? convertido
    : padrao;
}

// Converte o corpo de POST/PUT /api/fichas em uma ficha. A validação das
// regras fica no serviço; aqui só se lê e se completa (ids e datas).
// O custo dos itens não é gravado: ele é sempre calculado na leitura.
export function lerFichaDoCorpo(
  corpo: Record<string, unknown>,
  existente?: FichaTecnica
): FichaTecnica {
  const agora = new Date().toISOString();

  const itensBrutos = Array.isArray(corpo.itens)
    ? (corpo.itens as Record<string, unknown>[])
    : [];

  const itens: FichaTecnicaItem[] = itensBrutos.map(
    (item, indice) => {
      const tipo =
        item.tipo === "PREPARACAO"
          ? "PREPARACAO"
          : "INSUMO";

      return {
        id: texto(item.id) ?? crypto.randomUUID(),
        tipo,
        insumoId:
          tipo === "INSUMO"
            ? texto(item.insumoId)
            : undefined,
        preparacaoId:
          tipo === "PREPARACAO"
            ? texto(item.preparacaoId)
            : undefined,
        quantidade: numero(item.quantidade),
        unidade: texto(item.unidade) ?? "",
        percentualPerda: numero(item.percentualPerda),
        custoCalculado: 0,
        observacao: texto(item.observacao),
        grupoEscolha: texto(item.grupoEscolha)?.slice(0, 40),
        ordem: indice,
      };
    }
  );

  const tipo =
    corpo.tipo === "PRODUTO"
      ? "PRODUTO"
      : "PREPARACAO";

  return {
    id: existente?.id ?? crypto.randomUUID(),
    tipo,
    produtoId:
      tipo === "PRODUTO"
        ? texto(corpo.produtoId)
        : undefined,
    nome: texto(corpo.nome) ?? "",
    rendimento:
      tipo === "PREPARACAO" &&
      corpo.rendimento !== undefined &&
      corpo.rendimento !== null &&
      corpo.rendimento !== ""
        ? numero(corpo.rendimento)
        : undefined,
    unidadeRendimento:
      tipo === "PREPARACAO"
        ? texto(corpo.unidadeRendimento)
        : undefined,
    embalagem: numero(corpo.embalagem),
    modoPreparo: texto(corpo.modoPreparo),
    montagem: texto(corpo.montagem),
    observacoes: texto(corpo.observacoes),
    validadeDias: numeroOpcional(corpo.validadeDias),
    tempoPreparoMin: numeroOpcional(corpo.tempoPreparoMin),
    porcaoQuantidade: numeroOpcional(corpo.porcaoQuantidade),
    porcaoUnidade: texto(corpo.porcaoUnidade),
    ativo:
      typeof corpo.ativo === "boolean"
        ? corpo.ativo
        : (existente?.ativo ?? true),
    itens,
    criadoEm: existente?.criadoEm ?? agora,
    atualizadoEm: agora,
  };
}
