function normalizarNomeArquivo(nomeArquivo: string): string {
  const nome = nomeArquivo
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    .trim();

  return nome || "arquivo";
}

export function criarCaminhoDocumentoEntrada(params: {
  empresaId: string;
  dataEntrada: string;
  documentoId: string;
  nomeArquivo: string;
}): string {
  const data = new Date(params.dataEntrada);

  if (Number.isNaN(data.getTime())) {
    throw new Error("Data de entrada inválida.");
  }

  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");

  const nomeArquivo = normalizarNomeArquivo(params.nomeArquivo);

  return [
    "empresas",
    params.empresaId,
    "entradas-compra",
    String(ano),
    mes,
    `${params.documentoId}-${nomeArquivo}`,
  ].join("/");
}