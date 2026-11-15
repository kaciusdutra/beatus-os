// O cardápio que o cliente vê no site. Só o que pode aparecer: produto ativo
// com preço no canal Site (cardápio online). Nada de custo, ficha ou margem.

export interface ProdutoDaBase {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  ativo: boolean;
}

export interface PrecoDaBase {
  produtoId: string;
  canal: string;
  preco: number;
}

export interface ItemDoCardapio {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
}

export interface CategoriaDoCardapio {
  chave: string;
  titulo: string;
  itens: ItemDoCardapio[];
}

// A ordem em que as categorias aparecem no site.
const ORDEM: { chave: string; titulo: string }[] = [
  { chave: "HAMBÚRGUER", titulo: "Hambúrgueres" },
  { chave: "COMBO", titulo: "Combos" },
  { chave: "ACOMPANHAMENTO", titulo: "Acompanhamentos" },
  { chave: "BEBIDA", titulo: "Bebidas" },
  { chave: "SOBREMESA", titulo: "Sobremesas" },
];

export const CANAL_DO_SITE = "SITE";

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export function montarCardapio(produtos: ProdutoDaBase[], precos: PrecoDaBase[]): CategoriaDoCardapio[] {
  const precoDoSite = new Map<string, number>();

  for (const preco of precos) {
    if (preco.canal === CANAL_DO_SITE && Number.isFinite(preco.preco) && preco.preco > 0) {
      precoDoSite.set(preco.produtoId, arredondar(preco.preco));
    }
  }

  const porCategoria = new Map<string, ItemDoCardapio[]>();

  for (const produto of produtos) {
    const preco = precoDoSite.get(produto.id);

    if (!produto.ativo || preco === undefined || !produto.nome.trim()) {
      continue;
    }

    const lista = porCategoria.get(produto.categoria) ?? [];

    lista.push({ id: produto.id, nome: produto.nome.trim(), descricao: produto.descricao.trim(), preco });

    porCategoria.set(produto.categoria, lista);
  }

  const ordenar = (itens: ItemDoCardapio[]) => [...itens].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const categorias: CategoriaDoCardapio[] = [];

  for (const { chave, titulo } of ORDEM) {
    const itens = porCategoria.get(chave);

    if (itens?.length) {
      categorias.push({ chave, titulo, itens: ordenar(itens) });
    }
  }

  // Categoria que ninguém previu aparece no fim, em vez de sumir do cardápio.
  for (const [chave, itens] of porCategoria) {
    if (!ORDEM.some((item) => item.chave === chave) && itens.length) {
      categorias.push({ chave, titulo: "Outros", itens: ordenar(itens) });
    }
  }

  return categorias;
}
