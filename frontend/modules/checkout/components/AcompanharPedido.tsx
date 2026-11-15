"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { limparCarrinho } from "@/modules/site/components/carrinhoStore";

import { dinheiro } from "@/modules/site/services/carrinho";

import type { StatusPublicoDoCheckout } from "../types/checkout";

import { pedidoEmAndamento } from "../services/etapasDoPedido";

import EtapasDoPedido from "./EtapasDoPedido";

const ESPERA_ENTRE_CONSULTAS_MS = 4000;

// Enquanto não há resultado final, continua perguntando.
const EM_ANDAMENTO = ["PENDENTE", "PROCESSANDO", "RECUSADO"];

export default function AcompanharPedido({ checkoutId }: { checkoutId: string }) {
  const [status, setStatus] = useState<StatusPublicoDoCheckout | null>(null);

  const [erro, setErro] = useState("");

  useEffect(() => {
    let cancelado = false;

    let relogio: ReturnType<typeof setTimeout> | undefined;

    async function consultar() {
      try {
        const resposta = await fetch(`/api/publico/checkout/${checkoutId}`, { cache: "no-store" });

        const dados = await resposta.json();

        if (cancelado) {
          return;
        }

        if (!resposta.ok || dados.sucesso === false) {
          setErro(dados.mensagem || "Não foi possível consultar o pedido.");

          return;
        }

        setErro("");
        setStatus(dados as StatusPublicoDoCheckout);

        if (dados.status === "APROVADO") {
          // O pedido foi pago: o carrinho já cumpriu o papel.
          limparCarrinho();
        }

        // Pago: continua acompanhando o preparo e a entrega até entregar (ou cancelar).
        if (EM_ANDAMENTO.includes(dados.status) || (dados.status === "APROVADO" && pedidoEmAndamento(dados.situacao))) {
          relogio = setTimeout(() => void consultar(), ESPERA_ENTRE_CONSULTAS_MS);
        }
      } catch {
        if (!cancelado) {
          setErro("Sem conexão. Tentando de novo...");

          relogio = setTimeout(() => void consultar(), ESPERA_ENTRE_CONSULTAS_MS);
        }
      }
    }

    void consultar();

    return () => {
      cancelado = true;

      if (relogio) {
        clearTimeout(relogio);
      }
    };
  }, [checkoutId]);

  const aprovado = status?.status === "APROVADO";

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 px-4 py-14 text-center">
      <h1 className="font-display text-3xl font-extrabold text-ouro">{aprovado ? "Pedido confirmado!" : "Seu pedido"}</h1>

      {!status && !erro && <p className="text-slate-300">Consultando o pagamento...</p>}

      {erro && <p className="text-amber-200">{erro}</p>}

      {status && (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-lg text-slate-100">{status.mensagem}</p>

          {status.situacao && <EtapasDoPedido situacao={status.situacao} />}

          <p className="text-sm text-slate-400">Total: {dinheiro(status.total)}</p>

          {status.checkoutUrl && (
            <a href={status.checkoutUrl} className="inline-block rounded-xl bg-ouro px-6 py-3 font-bold text-black hover:bg-ouro-400">
              {status.status === "RECUSADO" ? "Tentar pagar de novo" : "Ir para o pagamento"}
            </a>
          )}

          {(EM_ANDAMENTO.includes(status.status) || pedidoEmAndamento(status.situacao)) && <p className="text-xs text-slate-500">Esta página confere sozinha. Não precisa recarregar.</p>}
        </div>
      )}

      <Link href="/cardapio" className="inline-block text-sm font-semibold text-ouro underline">
        Voltar ao cardápio
      </Link>
    </div>
  );
}
