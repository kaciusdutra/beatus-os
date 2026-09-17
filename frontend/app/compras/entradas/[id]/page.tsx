"use client";

import { useEffect, useState } from "react";

import CapturaDocumentoNota from "@/modules/compras/components/CapturaDocumentoNota";



interface EntradaCompraDocumento {
  id: string;
  nomeArquivo: string;
  mimeType: string;
  tamanho: number;
  tipoDocumento: string;
  origem: string;
  statusLeitura: string;
}

interface EntradaCompra {
  id: string;
  fornecedorId: string;
  tipoDocumento: string;
  status: string;
  numeroDocumento?: string;
  documentos: EntradaCompraDocumento[];
}

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export default function EntradaCompraPage({
  params,
}: Props) {
  const [entradaId, setEntradaId] = useState<string | null>(
    null,
  );

  const [entrada, setEntrada] =
    useState<EntradaCompra | null>(null);

  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let ativo = true;

    async function carregarEntrada() {
      try {
        setCarregando(true);
        setErro(null);

        const { id } = await params;

        if (!ativo) {
          return;
        }

        setEntradaId(id);

        const resposta = await fetch(
          `/api/compras/entradas?id=${encodeURIComponent(id)}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const dados = await resposta.json();

        if (!resposta.ok || !dados?.sucesso) {
          throw new Error(
            dados?.mensagem ??
              "Não foi possível carregar a entrada de compra.",
          );
        }

        if (!dados.encontrada || !dados.entrada) {
          throw new Error(
            "Entrada de compra não encontrada.",
          );
        }

        if (ativo) {
          setEntrada(dados.entrada);
        }
      } catch (error) {
        if (!ativo) {
          return;
        }

        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar a entrada de compra.",
        );
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    carregarEntrada();

    return () => {
      ativo = false;
    };
  }, [params]);

  async function adicionarFotografia(
  arquivo: File,
): Promise<boolean> {
  if (!entradaId) {
    setErro(
      "A entrada de compra ainda não foi identificada.",
    );

    return false;
  }

  try {
    setErro(null);
    setMensagem(null);

    const formData = new FormData();

    formData.append("arquivo", arquivo);
    formData.append(
      "tipoDocumento",
      "NOTA_FISCAL",
    );
    formData.append(
      "origem",
      "FOTOGRAFIA",
    );

    const resposta = await fetch(
      `/api/compras/entradas/${encodeURIComponent(
        entradaId,
      )}/documentos`,
      {
        method: "POST",
        body: formData,
      },
    );

    const dados = await resposta.json();

    if (!resposta.ok || !dados?.sucesso) {
      throw new Error(
        dados?.erro ??
          dados?.mensagem ??
          "Não foi possível adicionar a fotografia.",
      );
    }

    setMensagem(
      "Fotografia da nota adicionada com sucesso.",
    );

    setEntrada((atual) => {
      if (!atual || !dados.documento) {
        return atual;
      }

      return {
        ...atual,
        documentos: [
          ...atual.documentos,
          dados.documento,
        ],
      };
    });

    return true;
  } catch (error) {
    setErro(
      error instanceof Error
        ? error.message
        : "Não foi possível adicionar a fotografia da nota.",
    );

    return false;
  }
}

  if (carregando) {
    return (
      <main
        style={{
          padding: 32,
        }}
      >
        <p>Carregando entrada de compra...</p>
      </main>
    );
  }

  if (erro && !entrada) {
    return (
      <main
        style={{
          padding: 32,
        }}
      >
        <h1
          style={{
            marginTop: 0,
          }}
        >
          Entrada de Compra
        </h1>

        <div
          role="alert"
          style={{
            padding: 16,
            borderRadius: 12,
            background: "#fef2f2",
            color: "#991b1b",
          }}
        >
          {erro}
        </div>
      </main>
    );
  }

  if (!entrada) {
    return null;
  }

  const podeReceberDocumento =
    entrada.status === "RASCUNHO";

  return (
    <main
      style={{
        padding: 32,
        maxWidth: 1000,
        margin: "0 auto",
      }}
    >
      <header
        style={{
          marginBottom: 32,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 30,
            fontWeight: 700,
          }}
        >
          Entrada de Compra
        </h1>

        <p
          style={{
            marginTop: 8,
            marginBottom: 0,
            opacity: 0.7,
          }}
        >
          Entrada: {entrada.id}
        </p>
      </header>

      <section
        style={{
          padding: 24,
          border: "1px solid #e5e5e5",
          borderRadius: 16,
          marginBottom: 24,
        }}
      >
        <h2
          style={{
            marginTop: 0,
          }}
        >
          Documento fiscal
        </h2>

        <p
          style={{
            lineHeight: 1.5,
            opacity: 0.75,
          }}
        >
          Adicione a nota fiscal desta entrada por
          fotografia.
        </p>

        {erro && (
          <div
            role="alert"
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 10,
              background: "#fef2f2",
              color: "#991b1b",
            }}
          >
            {erro}
          </div>
        )}

        {mensagem && (
          <div
            role="status"
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 10,
              background: "#f0fdf4",
              color: "#166534",
            }}
          >
            {mensagem}
          </div>
        )}

        {!podeReceberDocumento && (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 10,
              background: "#fff7ed",
              color: "#9a3412",
            }}
          >
            Esta entrada está {entrada.status} e não pode
            receber novos documentos.
          </div>
        )}

        {podeReceberDocumento && (
          <CapturaDocumentoNota
            onConfirmar={adicionarFotografia}
            disabled={enviando}
          />
        )}

        {enviando && (
          <p
            style={{
              marginTop: 16,
              fontWeight: 600,
            }}
          >
            Salvando fotografia...
          </p>
        )}
      </section>

      <section
        style={{
          padding: 24,
          border: "1px solid #e5e5e5",
          borderRadius: 16,
        }}
      >
        <h2
          style={{
            marginTop: 0,
          }}
        >
          Documentos anexados
        </h2>

        {entrada.documentos.length === 0 ? (
          <p
            style={{
              opacity: 0.7,
            }}
          >
            Nenhum documento anexado a esta entrada.
          </p>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {entrada.documentos.map((documento) => (
              <div
                key={documento.id}
                style={{
                  padding: 16,
                  border: "1px solid #e5e5e5",
                  borderRadius: 12,
                }}
              >
                <strong>
                  {documento.nomeArquivo}
                </strong>

                <div
                  style={{
                    marginTop: 6,
                    fontSize: 14,
                    opacity: 0.7,
                  }}
                >
                  {documento.tipoDocumento} ·{" "}
                  {documento.origem} ·{" "}
                  {documento.statusLeitura}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}