"use client";

import { useEffect, useState } from "react";

interface Ticket {
  id: string;
  numero: string;
  canal: string;
  criadoEm: string;
  cliente: { nome: string; telefone: string };
  endereco: string;
  itens: { nome: string; quantidade: number; observacao?: string }[];
  pagamento?: { forma: string; status: string };
  total: number;
}

// Ticket da cozinha em bobina de 80 mm. Sai pela impressão do navegador;
// quando a impressora existir, a fila de impressão alimenta um impressor
// automático com os mesmos dados.
export default function TicketCozinhaPage({ pedidoId }: { pedidoId: string }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);

  const [erro, setErro] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const resposta = await fetch(`/api/pedidos/${pedidoId}/ticket`, {
          cache: "no-store",
        });

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
          throw new Error(dados.mensagem || "Não foi possível montar o ticket.");
        }

        setTicket(dados.ticket);
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível montar o ticket.");
      }
    })();
  }, [pedidoId]);

  async function imprimir() {
    try {
      await fetch(`/api/pedidos/${pedidoId}/ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "IMPRESSO" }),
      });
    } catch {
      // o registro não impede a impressão
    }

    window.print();
  }

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #ticket, #ticket * { visibility: visible; }
          #ticket { position: absolute; left: 0; top: 0; }
          @page { size: 80mm auto; margin: 0; }
        }
      `}</style>

      {erro && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 print:hidden">{erro}</div>}

      {ticket && (
        <>
          <button
            type="button"
            onClick={() => void imprimir()}
            className="cursor-pointer rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 print:hidden"
          >
            🖨️ Imprimir ticket
          </button>

          <div
            id="ticket"
            className="bg-white font-mono text-black"
            style={{ width: "80mm", padding: "3mm", fontSize: "11pt", lineHeight: 1.25 }}
          >
            <div style={{ textAlign: "center", fontWeight: 800, fontSize: "20pt" }}>#{ticket.numero}</div>

            <div style={{ textAlign: "center", fontWeight: 700 }}>
              {ticket.canal} · {new Date(ticket.criadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
            </div>

            <hr style={{ borderTop: "0.4mm dashed black", margin: "2mm 0" }} />

            {ticket.itens.map((item, indice) => (
              <div key={indice} style={{ marginBottom: "1.5mm" }}>
                <div style={{ fontWeight: 800, fontSize: "13pt" }}>
                  {item.quantidade}× {item.nome}
                </div>

                {item.observacao && <div>OBS: {item.observacao}</div>}
              </div>
            ))}

            <hr style={{ borderTop: "0.4mm dashed black", margin: "2mm 0" }} />

            <div>Cliente: {ticket.cliente.nome}</div>

            <div>Fone: {ticket.cliente.telefone}</div>

            {ticket.endereco && <div>Entrega: {ticket.endereco}</div>}

            <hr style={{ borderTop: "0.4mm dashed black", margin: "2mm 0" }} />

            <div>
              Pagamento: {ticket.pagamento ? `${ticket.pagamento.forma} (${ticket.pagamento.status})` : "—"}
            </div>

            <div style={{ fontWeight: 800 }}>
              Total: R$ {ticket.total.toFixed(2).replace(".", ",")}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
