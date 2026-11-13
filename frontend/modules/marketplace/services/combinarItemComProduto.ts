// Nome para comparar: sem acento, minúsculo, sem o que vem entre parênteses
// (ex.: "Sanctum (iFood)" vira "sanctum") e sem espaços repetidos.
export function normalizarNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export interface ProdutoParaCombinar {
  id: string;
  nome: string;
}

// Liga um item da plataforma a um produto do Beatus sozinho, só quando não há
// dúvida: o código do item é o id do produto, ou o nome (normalizado) bate com
// um único produto. Duas possibilidades ou nenhuma: devolve null e o item fica
// pendente para o Kacius ligar.
export function combinarItemComProduto(
  item: { codigoItemExterno: string; nome: string },
  produtos: ProdutoParaCombinar[]
): string | null {
  const pelaId = produtos.filter((produto) => produto.id === item.codigoItemExterno.trim());

  if (pelaId.length === 1) {
    return pelaId[0].id;
  }

  const alvo = normalizarNome(item.nome);

  if (!alvo) {
    return null;
  }

  const peloNome = produtos.filter((produto) => normalizarNome(produto.nome) === alvo);

  return peloNome.length === 1 ? peloNome[0].id : null;
}
