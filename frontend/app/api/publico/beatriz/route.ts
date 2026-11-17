import { NextResponse } from "next/server";

import { limitarVisitante } from "@/core/seguranca/limitesPublicos";

import { enderecoPublicoDoSite } from "@/modules/checkout/services/server/checkoutServiceFactory";

import { beatrizConfigurada } from "@/modules/beatriz/modelos/modeloAnthropic";

import { ErroDaBeatriz } from "@/modules/beatriz/modelos/modeloPort";

import { respostaPublicaDaBeatriz } from "@/modules/beatriz/services/respostaPublicaDaBeatriz";

import { getBeatrizService } from "@/modules/beatriz/services/server/beatrizServiceFactory";

import { TetoDiarioDeMensagens, tetoDiarioDaConfiguracao } from "@/modules/beatriz/services/tetoDaBeatriz";

import { montarLinkDoCarrinho } from "@/modules/site/services/linkDoCarrinho";

// A Beatriz no chat do site (público, sem login). Cada mensagem custa dinheiro de IA, então há três travas:
// o limite por visitante (20 mensagens a cada 10 minutos), o teto do dia para a casa toda (padrão 300,
// BEATRIZ_TETO_DIARIO_SITE no .env) e o tamanho das mensagens. O servidor atende como primeira conversa: não
// abre nem grava memória de cliente, porque o site ainda não confirma quem é a pessoa (regra 26.12).
// A conversa fica só no navegador do visitante: nada dela é guardada aqui.

const global = globalThis as unknown as { __beatusTetoDaBeatriz?: TetoDiarioDeMensagens };

// O estado fica em globalThis para sobreviver à recarga do módulo em desenvolvimento.
function teto(): TetoDiarioDeMensagens {
  return (global.__beatusTetoDaBeatriz ??= new TetoDiarioDeMensagens(tetoDiarioDaConfiguracao(process.env.BEATRIZ_TETO_DIARIO_SITE)));
}

const MENSAGENS_MAXIMAS = 20;

const TAMANHO_MAXIMO_DA_MENSAGEM = 500;

// 20 mensagens de 500 caracteres mais o pedido anotado cabem folgados em 40 KB; mais que isso é abuso.
const TAMANHO_MAXIMO_DO_CORPO = 40_000;

// O chat só aparece se a IA estiver ligada.
export async function GET() {
  return NextResponse.json({ sucesso: true, disponivel: beatrizConfigurada() });
}

export async function POST(request: Request) {
  if (!beatrizConfigurada()) {
    return NextResponse.json({ sucesso: false, mensagem: "A Beatriz não está disponível agora.", indisponivel: true }, { status: 503 });
  }

  const limite = limitarVisitante("beatriz", request, 20, 600_000);

  if (limite) {
    return limite;
  }

  const tamanhoDeclarado = Number(request.headers.get("content-length") ?? 0);

  if (Number.isFinite(tamanhoDeclarado) && tamanhoDeclarado > TAMANHO_MAXIMO_DO_CORPO) {
    return NextResponse.json({ sucesso: false, mensagem: "Mensagem grande demais." }, { status: 413 });
  }

  try {
    const texto = await request.text();

    // Sem Content-Length (envio em partes) também vale o teto.
    if (texto.length > TAMANHO_MAXIMO_DO_CORPO) {
      return NextResponse.json({ sucesso: false, mensagem: "Mensagem grande demais." }, { status: 413 });
    }

    const corpo = JSON.parse(texto);

    const mensagens = (Array.isArray(corpo?.mensagens) ? corpo.mensagens : [])
      .filter((mensagem: unknown): mensagem is { papel: "cliente" | "beatriz"; texto: string } => {
        const candidata = mensagem as { papel?: unknown; texto?: unknown } | null;

        return (candidata?.papel === "cliente" || candidata?.papel === "beatriz") && typeof candidata.texto === "string" && candidata.texto.trim() !== "";
      })
      .map((mensagem: { papel: "cliente" | "beatriz"; texto: string }) => ({ papel: mensagem.papel, texto: mensagem.texto.trim().slice(0, TAMANHO_MAXIMO_DA_MENSAGEM) }))
      .slice(-MENSAGENS_MAXIMAS);

    if (mensagens.length === 0 || mensagens[mensagens.length - 1].papel !== "cliente") {
      return NextResponse.json({ sucesso: false, mensagem: "Escreva uma mensagem para a Beatriz." }, { status: 422 });
    }

    // Teto do dia: passou, a Beatriz fica em pausa e o chat mostra o WhatsApp.
    if (!teto().registrar()) {
      return NextResponse.json(
        { sucesso: false, pausada: true, mensagem: "A Beatriz está descansando por hoje. Fale com a gente pelo WhatsApp." },
        { status: 429 }
      );
    }

    try {
      const resposta = await getBeatrizService().responder({
        mensagens,
        canal: "CARDAPIO_ONLINE",
        rascunhoAtual: corpo?.rascunho && typeof corpo.rascunho === "object" ? corpo.rascunho : undefined,
      });

      const base = enderecoPublicoDoSite(request);

      return NextResponse.json({
        sucesso: true,
        ...respostaPublicaDaBeatriz(resposta, (itens) => montarLinkDoCarrinho(base, { origem: "CARDAPIO_ONLINE", itens })),
      });
    } catch (error) {
      // A mensagem não chegou a ser atendida: não conta no teto.
      teto().devolver();

      throw error;
    }
  } catch (error) {
    if (error instanceof ErroDaBeatriz) {
      // O visitante não precisa saber o motivo técnico (chave, limite da conta...).
      console.error("ERRO NA BEATRIZ DO SITE:", error.codigo, error.message);

      return NextResponse.json({ sucesso: false, mensagem: "A Beatriz não conseguiu responder agora. Tente de novo ou fale com a gente pelo WhatsApp." }, { status: error.status === 429 ? 429 : 502 });
    }

    console.error("ERRO NA ROTA PÚBLICA DA BEATRIZ:", error);

    return NextResponse.json({ sucesso: false, mensagem: "A Beatriz não conseguiu responder agora. Tente de novo ou fale com a gente pelo WhatsApp." }, { status: 500 });
  }
}
