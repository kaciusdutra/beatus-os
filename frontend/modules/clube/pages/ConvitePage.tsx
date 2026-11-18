"use client";

import { useEffect, useState } from "react";

import QRCode from "qrcode";

import { ORIGENS_DO_CONVITE, enderecoDoConvite, enderecoEhDeTeste } from "../convite";

const CLASSE_CAMPO = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500";

// Lado do QR impresso, em centímetros. 3 cm já lê bem; mais folga lê melhor de longe e em papel ruim.
const LADOS = [3, 4, 5];

// Quantos cartões saem por folha A4 em cada tamanho.
const POR_FOLHA: Record<number, number> = { 3: 20, 4: 12, 5: 6 };

// O QR do convite, para imprimir em adesivo ou cartão e colocar em cada pedido que sai da cozinha. Ele aponta para
// o endereço curto do site (/convite), que redireciona para a página de convite: dá para mudar o destino sem reimprimir.
// O QR é permanente: só imprima com o endereço definitivo do site.
export default function ConvitePage() {
  const [base, setBase] = useState("");

  const [origem, setOrigem] = useState("proprio");

  const [lado, setLado] = useState(4);

  const [imagem, setImagem] = useState<{ conteudo: string; url: string } | null>(null);

  // Começa pelo endereço desta tela (só serve para teste: o definitivo é o do domínio).
  useEffect(() => {
    void (async () => {
      setBase(window.location.origin);
    })();
  }, []);

  const conteudo = base.trim() ? enderecoDoConvite(base, origem) : "";

  const deTeste = enderecoEhDeTeste(base);

  useEffect(() => {
    if (!conteudo) {
      return;
    }

    let cancelado = false;

    void QRCode.toDataURL(conteudo, { margin: 4, width: 1024, errorCorrectionLevel: "Q" })
      .then((url) => {
        if (!cancelado) {
          setImagem({ conteudo, url });
        }
      })
      .catch(() => {
        if (!cancelado) {
          setImagem(null);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [conteudo]);

  const pronta = imagem !== null && imagem.conteudo === conteudo;

  const enderecoCurto = conteudo ? conteudo.replace(/^https?:\/\//, "").split("?")[0] : "";

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #folha-de-qr, #folha-de-qr * { visibility: visible; }
          #folha-de-qr { position: absolute; left: 0; top: 0; width: 100%; }
          @page { size: A4; margin: 10mm; }
        }
      `}</style>

      <div className="print:hidden">
        <p className="text-sm font-medium text-slate-500">Configurações</p>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900">QR do convite</h1>

        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          O QR que vai em cada pedido que sai da cozinha (canais próprios e marketplaces). Ele abre uma página do Beatus que convida o cliente a pedir direto pelo site ou
          pelo WhatsApp, e guarda de onde ele veio. O QR aponta sempre para o mesmo endereço curto (<code>/convite</code>), então o destino pode mudar sem reimprimir.
        </p>
      </div>

      <div className="grid gap-6 print:hidden lg:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <label htmlFor="base" className="mb-1 block text-xs font-semibold text-slate-600">
              Endereço definitivo do site
            </label>

            <input id="base" value={base} onChange={(evento) => setBase(evento.target.value)} placeholder="https://beatus.com.br" className={CLASSE_CAMPO} />
          </div>

          {deTeste && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
              Este é um endereço de teste (sem https ou da sua máquina). Um QR impresso com ele não funciona para os clientes. Digite o endereço definitivo do site, com https://,
              antes de imprimir.
            </p>
          )}

          <div>
            <label htmlFor="origem" className="mb-1 block text-xs font-semibold text-slate-600">
              De onde sai o pedido (para saber de onde o cliente veio)
            </label>

            <select id="origem" value={origem} onChange={(evento) => setOrigem(evento.target.value)} className={CLASSE_CAMPO}>
              {ORIGENS_DO_CONVITE.map((item) => (
                <option key={item.chave} value={item.chave}>
                  {item.rotulo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="lado" className="mb-1 block text-xs font-semibold text-slate-600">
              Tamanho do QR impresso
            </label>

            <select id="lado" value={lado} onChange={(evento) => setLado(Number(evento.target.value))} className={CLASSE_CAMPO}>
              {LADOS.map((valor) => (
                <option key={valor} value={valor}>
                  {valor} cm de lado ({POR_FOLHA[valor]} por folha A4)
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!pronta}
              onClick={() => window.print()}
              className="cursor-pointer rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Imprimir a folha
            </button>

            {pronta && (
              <a href={imagem.url} download={`qr-convite-${origem}.png`} className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Baixar a imagem (PNG)
              </a>
            )}
          </div>

          <ul className="space-y-1 text-xs text-slate-500">
            <li>• Gere uma folha para cada origem (iFood, 99Food, Keeta e canais próprios) e use só em pedidos dessa origem.</li>
            <li>• Teste a leitura com um iPhone e um Android antes de imprimir em quantidade.</li>
            <li>• Use papel fosco e tinta escura sobre fundo claro; nunca cubra o QR com plástico que reflita.</li>
            <li>• Antes de imprimir, confirme nas regras de cada plataforma se pode haver convite para pedir fora dela na embalagem.</li>
          </ul>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Como vai ficar</h2>

          {pronta ? (
            <div className="flex flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagem.url} alt="QR do convite" className="h-56 w-56" />

              <p className="break-all text-center text-xs text-slate-500">{conteudo}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Digite o endereço do site para gerar o QR.</p>
          )}
        </section>
      </div>

      {pronta && (
        <div id="folha-de-qr" className="hidden print:block">
          <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${lado + 1.6}cm, 1fr))` }}>
            {Array.from({ length: POR_FOLHA[lado] }, (_, indice) => (
              <div key={indice} className="flex flex-col items-center justify-center border border-dashed border-slate-400 p-[2mm] text-center" style={{ width: `${lado + 1.6}cm`, height: `${lado + 2.2}cm` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagem.url} alt="" style={{ width: `${lado}cm`, height: `${lado}cm` }} />

                <p style={{ fontSize: "7pt", fontWeight: 700, lineHeight: 1.1, marginTop: "1mm" }}>BEATUS · peça direto</p>

                <p style={{ fontSize: "6pt", lineHeight: 1.1 }}>{enderecoCurto}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
