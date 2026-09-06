import { createHash } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { criarContextoDesenvolvimento } from "@/core/context/empresaContext";
import { criarEntradaCompraServicePostgres } from "@/modules/compras/services/server/entradaCompraServiceFactory";
import { criarArquivoStorage } from "@/modules/compras/services/storage/arquivoStorageFactory";
import { criarCaminhoDocumentoEntrada } from "@/modules/compras/services/storage/caminhoDocumentoEntrada";
import type {
  OrigemDocumentoEntradaCompra,
  StatusLeituraDocumentoEntradaCompra,
  TipoDocumentoEntradaCompraArquivo,
} from "@/modules/compras/types/entradaCompraDocumento";

const TIPOS_DOCUMENTO = [
  "NOTA_FISCAL",
  "RECIBO",
  "COMPROVANTE",
  "OUTRO",
] as const;

const ORIGENS_DOCUMENTO = [
  "FOTOGRAFIA",
  "UPLOAD",
  "XML",
  "IMPORTACAO",
] as const;

function ehTipoDocumento(valor: string): valor is TipoDocumentoEntradaCompraArquivo {
  return TIPOS_DOCUMENTO.includes(
    valor as TipoDocumentoEntradaCompraArquivo,
  );
}

function ehOrigemDocumento(valor: string): valor is OrigemDocumentoEntradaCompra {
  return ORIGENS_DOCUMENTO.includes(
    valor as OrigemDocumentoEntradaCompra,
  );
}

function ehMimePermitido(mimeType: string): boolean {
  return (
    mimeType === "application/pdf" ||
    mimeType === "application/xml" ||
    mimeType === "text/xml" ||
    mimeType === "image/jpeg" ||
    mimeType === "image/png" ||
    mimeType === "image/webp"
  );
}

function criarStatusInicial(): StatusLeituraDocumentoEntradaCompra {
  return "PENDENTE";
}

function calcularHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    if (!id) {
      return NextResponse.json(
        { erro: "ID da entrada de compra não informado." },
        { status: 400 },
      );
    }

    const formData = await request.formData();

    const arquivo = formData.get("arquivo");

    if (!(arquivo instanceof File)) {
      return NextResponse.json(
        { erro: "O campo 'arquivo' é obrigatório." },
        { status: 400 },
      );
    }

    if (arquivo.size <= 0) {
      return NextResponse.json(
        { erro: "O arquivo enviado está vazio." },
        { status: 400 },
      );
    }

    if (!ehMimePermitido(arquivo.type)) {
      return NextResponse.json(
        {
          erro:
            "Tipo de arquivo não permitido. Envie PDF, XML ou imagem JPG, PNG ou WEBP.",
        },
        { status: 400 },
      );
    }

    const tipoDocumentoInformado = String(
      formData.get("tipoDocumento") ?? "",
    ).trim();

    const origemInformada = String(
      formData.get("origem") ?? "UPLOAD",
    ).trim();

    if (!ehTipoDocumento(tipoDocumentoInformado)) {
      return NextResponse.json(
        { erro: "Tipo de documento inválido." },
        { status: 400 },
      );
    }

    if (!ehOrigemDocumento(origemInformada)) {
      return NextResponse.json(
        { erro: "Origem do documento inválida." },
        { status: 400 },
      );
    }

    const tipoDocumento = tipoDocumentoInformado;
    const origem = origemInformada;

    const service = criarEntradaCompraServicePostgres();

    const entrada = await service.buscarPorId(id);

    if (!entrada) {
      return NextResponse.json(
        { erro: "Entrada de compra não encontrada." },
        { status: 404 },
      );
    }

    if (entrada.status !== "RASCUNHO") {
      return NextResponse.json(
        {
          erro: "Somente entradas em RASCUNHO podem receber documentos.",
        },
        { status: 409 },
      );
    }

    const documentoId = crypto.randomUUID();

    const caminhoRelativo = criarCaminhoDocumentoEntrada({
      empresaId: criarContextoDesenvolvimento().empresaId,
      dataEntrada: entrada.dataEntrada,
      documentoId,
      nomeArquivo: arquivo.name,
    });

    const arquivoBuffer = Buffer.from(await arquivo.arrayBuffer());
    const hashArquivo = calcularHash(arquivoBuffer);

    const storage = criarArquivoStorage();

    await storage.salvar(caminhoRelativo, arquivo);

    try {
      const agora = new Date().toISOString();

      const documento = await service.adicionarDocumento({
        id: documentoId,
        entradaCompraId: entrada.id,
        nomeArquivo: arquivo.name,
        mimeType: arquivo.type,
        tamanho: arquivo.size,
        tipoDocumento,
        origem,
        statusLeitura: criarStatusInicial(),
        caminhoArquivo: caminhoRelativo,
        hashArquivo,
        criadoEm: agora,
        atualizadoEm: agora,
      });

      return NextResponse.json(
        {
          sucesso: true,
          documento,
        },
        { status: 201 },
      );
    } catch (erroBanco) {
      try {
        await storage.excluir(caminhoRelativo);
      } catch (erroExclusao) {
        console.error(
          "Falha ao excluir arquivo após erro no banco:",
          erroExclusao,
        );
      }

      throw erroBanco;
    }
  } catch (erro) {
    const mensagem =
      erro instanceof Error
        ? erro.message
        : "Erro ao adicionar documento à entrada de compra.";

    if (
      mensagem === "Entrada de compra não encontrada." ||
      mensagem === "Somente entradas em RASCUNHO podem receber documentos."
    ) {
      return NextResponse.json(
        { erro: mensagem },
        { status: mensagem.includes("RASCUNHO") ? 409 : 404 },
      );
    }

    console.error("Erro no upload de documento:", erro);

    return NextResponse.json(
      { erro: mensagem },
      { status: 500 },
    );
  }
}