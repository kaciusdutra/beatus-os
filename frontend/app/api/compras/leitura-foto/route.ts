import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  ErroLeituraFoto,
  leituraFotoConfigurada,
  lerDocumentoPorFoto,
  type TipoImagemLeitura,
} from "@/modules/compras/services/server/lerDocumentoPorFoto";

// Limite do arquivo enviado à IA (a tela já reduz a foto antes de enviar;
// a foto original é guardada à parte, sem alteração).
const TAMANHO_MAXIMO = 4 * 1024 * 1024;

const TIPOS_PERMITIDOS: TipoImagemLeitura[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

// Diz se a leitura por IA está configurada (a tela usa para avisar antes de enviar).
export async function GET() {
  return NextResponse.json({
    sucesso: true,
    configurada: leituraFotoConfigurada(),
  });
}

// Lê os itens de uma foto de nota, cupom ou recibo (inclusive manuscrito).
// A leitura NÃO grava nada: devolve os dados para a pessoa conferir na tela.
// POST multipart: campo "imagem" (JPG, PNG ou WEBP) e, opcional, "tipoDocumento".
export async function POST(
  request: NextRequest
) {
  try {
    const formulario =
      await request.formData();

    const imagem = formulario.get("imagem");

    if (!(imagem instanceof File)) {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem:
            "Envie a imagem do documento.",
        },
        { status: 400 }
      );
    }

    const tipo = imagem.type as TipoImagemLeitura;

    if (!TIPOS_PERMITIDOS.includes(tipo)) {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem:
            "Formato de imagem não suportado. Use JPG, PNG ou WEBP.",
        },
        { status: 400 }
      );
    }

    if (imagem.size <= 0) {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem: "A imagem enviada está vazia.",
        },
        { status: 400 }
      );
    }

    if (imagem.size > TAMANHO_MAXIMO) {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem:
            "A imagem é grande demais para a leitura. Tire outra foto ou reduza o tamanho.",
        },
        { status: 413 }
      );
    }

    const tipoDocumento = String(
      formulario.get("tipoDocumento") ?? ""
    ).trim();

    const resultado =
      await lerDocumentoPorFoto(
        {
          base64: Buffer.from(
            await imagem.arrayBuffer()
          ).toString("base64"),
          tipo,
        },
        tipoDocumento || undefined
      );

    return NextResponse.json({
      sucesso: true,
      ...resultado,
    });
  } catch (error) {
    if (error instanceof ErroLeituraFoto) {
      return NextResponse.json(
        {
          sucesso: false,
          codigo: error.codigo,
          mensagem: error.message,
        },
        { status: error.status }
      );
    }

    console.error(
      "ERRO AO LER DOCUMENTO POR FOTO:",
      error
    );

    return NextResponse.json(
      {
        sucesso: false,
        mensagem:
          "Não foi possível ler o documento agora. Digite os itens manualmente.",
      },
      { status: 500 }
    );
  }
}
