"use client";

import { useRouter } from "next/navigation";

import { guardarCodigoDaVantagem } from "../vantagemGuardada";

// Guarda o cartão no navegador e leva ao cardápio: no checkout, a vantagem escolhida é aplicada ao pedido
// (o servidor confere e calcula o desconto).
export default function UsarVantagem({ codigo }: { codigo: string }) {
  const roteador = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        guardarCodigoDaVantagem(localStorage, codigo);

        roteador.push("/cardapio");
      }}
      className="w-full cursor-pointer rounded-xl bg-ouro px-4 py-3 text-center font-bold text-black hover:bg-ouro-400"
    >
      Pedir com a minha vantagem
    </button>
  );
}
