"use client";

import { ProdutoPDV } from "../types/pdv";

interface Props {
  produtos: ProdutoPDV[];
  categoriaAtiva: string;
  onCategoriaChange: (categoria: string) => void;
  onAdicionar: (produto: ProdutoPDV) => void;
}

const categorias = [
  "TODOS",
  "HAMBÚRGUER",
  "ACOMPANHAMENTO",
  "BEBIDA",
];

export default function PdvCatalogo({
  produtos,
  categoriaAtiva,
  onCategoriaChange,
  onAdicionar,
}: Props) {
  const produtosFiltrados =
    categoriaAtiva === "TODOS"
      ? produtos
      : produtos.filter(
          (produto) =>
            produto.categoria === categoriaAtiva
        );

  return (
    <section className="flex-1">
      <div className="mb-6 flex flex-wrap gap-2">
        {categorias.map((categoria) => (
          <button
            key={categoria}
            type="button"
            onClick={() =>
              onCategoriaChange(categoria)
            }
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              categoriaAtiva === categoria
                ? "bg-orange-500 text-white"
                : "bg-white text-slate-600 shadow-sm hover:bg-slate-100"
            }`}
          >
            {categoria}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {produtosFiltrados.map((produto) => (
          <button
            key={produto.id}
            type="button"
            onClick={() => onAdicionar(produto)}
            className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-orange-400 hover:shadow-md"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {produto.nome}
                </h3>

                <p className="mt-1 text-sm leading-5 text-slate-500">
                  {produto.descricao}
                </p>
              </div>

              <span className="rounded-lg bg-orange-50 px-2 py-1 text-xs font-bold text-orange-600">
                {produto.categoria}
              </span>
            </div>

            <div className="text-xl font-bold text-orange-600">
              R$ {produto.preco.toFixed(2)}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}