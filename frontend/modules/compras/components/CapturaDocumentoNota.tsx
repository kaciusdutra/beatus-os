"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  BrowserQRCodeReader,
  type IScannerControls,
} from "@zxing/browser";

interface CapturaDocumentoNotaProps {
  /**
   * Recebe a imagem original capturada ou selecionada.
   *
   * O componente não grava o arquivo no banco.
   * O fluxo superior decide quando e onde persistir.
   */
  onConfirmar: (
    arquivo: File
  ) => Promise<boolean> | boolean;

  /**
   * Recebe o conteúdo bruto do QR Code confirmado
   * pelo usuário.
   *
   * O componente não interpreta NFC-e nem grava o QR.
   * O fluxo superior decide como processar o conteúdo.
   */
  onQrCodeConfirmado?: (
    conteudo: string
  ) => Promise<boolean> | boolean;

  onCancelar?: () => void;

  disabled?: boolean;
}

type ModoCaptura =
  | "ESCOLHA"
  | "CAMERA"
  | "PREVIA";

export default function CapturaDocumentoNota({
  onConfirmar,
  onQrCodeConfirmado,
  onCancelar,
  disabled = false,
}: CapturaDocumentoNotaProps) {
  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  const scannerRef =
    useRef<BrowserQRCodeReader | null>(null);

  const scannerControlsRef =
    useRef<IScannerControls | null>(null);

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [modo, setModo] =
    useState<ModoCaptura>("ESCOLHA");

  const [arquivoPreview, setArquivoPreview] =
    useState<File | null>(null);

  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null);

  const [erro, setErro] =
    useState<string | null>(null);

  const [carregandoCamera, setCarregandoCamera] =
    useState(false);

  const [cameraPronta, setCameraPronta] =
    useState(false);

  const [confirmando, setConfirmando] =
    useState(false);

  const [processandoQr, setProcessandoQr] =
    useState(false);

  const [qrEncontrado, setQrEncontrado] =
    useState<string | null>(null);

  const [qrConfirmado, setQrConfirmado] =
    useState(false);

  /*
   * Encerra apenas o leitor ZXing.
   *
   * A câmera continua ligada. Isso permite que o usuário
   * fotografe a nota mesmo depois que um QR foi encontrado.
   */
  const pararScanner = useCallback(() => {
    if (scannerControlsRef.current) {
      scannerControlsRef.current.stop();
      scannerControlsRef.current = null;
    }

    scannerRef.current = null;
  }, []);

  /*
   * Encerra completamente a câmera.
   */
  const pararCamera = useCallback(() => {
    pararScanner();

    const video = videoRef.current;

    if (video) {
      video.pause();

      const stream =
        video.srcObject as MediaStream | null;

      if (stream) {
        stream.getTracks().forEach(
          (track) => track.stop()
        );
      }

      video.srcObject = null;
    }

    setCameraPronta(false);
  }, [pararScanner]);

  /*
   * Libera o objeto de preview da imagem.
   */
  const limparPreview = useCallback(() => {
    setPreviewUrl((urlAnterior) => {
      if (urlAnterior) {
        URL.revokeObjectURL(urlAnterior);
      }

      return null;
    });

    setArquivoPreview(null);
  }, []);

  /*
   * Volta ao estado inicial.
   */
  const voltarParaEscolha =
    useCallback(() => {
      pararCamera();
      limparPreview();

      setErro(null);
      setQrEncontrado(null);
      setQrConfirmado(false);
      setConfirmando(false);
      setProcessandoQr(false);
      setModo("ESCOLHA");
    }, [
      pararCamera,
      limparPreview,
    ]);

  /*
   * Inicia a leitura do QR pela câmera.
   *
   * O ZXing controla a leitura e alimenta o <video>.
   */
  const iniciarScanner =
    useCallback(async () => {
      const video = videoRef.current;

      if (!video) {
        return;
      }

      try {
        const scanner =
          new BrowserQRCodeReader();

        scannerRef.current = scanner;

        const controls =
          await scanner.decodeFromVideoDevice(
            undefined,
            video,
            (resultado) => {
              if (!resultado) {
                return;
              }

              const texto =
                resultado.getText();

              if (!texto) {
                return;
              }

              setQrEncontrado(texto);
              setQrConfirmado(false);
              setErro(null);

              /*
               * O QR foi encontrado.
               *
               * Paramos somente a leitura contínua.
               * A câmera permanece ativa.
               */
              if (
                scannerControlsRef.current
              ) {
                scannerControlsRef.current.stop();
                scannerControlsRef.current =
                  null;
              }

              scannerRef.current = null;
            }
          );

        scannerControlsRef.current =
          controls;
      } catch (error) {
        console.error(
          "Erro ao iniciar leitura do QR Code:",
          error
        );

        setErro(
          "Não foi possível iniciar a leitura do QR Code pela câmera."
        );
      }
    }, []);

  /*
   * Apenas entra no modo câmera.
   */
  const abrirCamera = () => {
    if (
      disabled ||
      carregandoCamera
    ) {
      return;
    }

    setErro(null);
    setQrEncontrado(null);
    setQrConfirmado(false);
    setCameraPronta(false);
    setCarregandoCamera(true);
    setModo("CAMERA");
    setCarregandoCamera(false);
  };

  /*
   * Quando o vídeo realmente estiver disponível,
   * marcamos a câmera como pronta.
   */
  const quandoVideoCarregar =
    useCallback(() => {
      const video = videoRef.current;

      if (!video) {
        return;
      }

      if (
        video.videoWidth > 0 &&
        video.videoHeight > 0
      ) {
        setCameraPronta(true);
        setErro(null);
      }
    }, []);

  /*
   * Inicializa o scanner quando entramos na câmera.
   */
  useEffect(() => {
    if (modo !== "CAMERA") {
      return;
    }

    void iniciarScanner();

    return () => {
      pararScanner();
    };
  }, [
    modo,
    iniciarScanner,
    pararScanner,
  ]);

  /*
   * Confirma o QR e entrega seu conteúdo ao fluxo superior.
   *
   * O componente não interpreta o conteúdo.
   */
  const usarQrCode = async () => {
    if (
      !qrEncontrado ||
      bloqueado
    ) {
      return;
    }

    try {
      setProcessandoQr(true);
      setErro(null);

      if (onQrCodeConfirmado) {
        const sucesso =
          await onQrCodeConfirmado(
            qrEncontrado
          );

        if (!sucesso) {
          return;
        }
      }

      setQrConfirmado(true);
    } catch (error) {
      console.error(
        "Erro ao confirmar QR Code:",
        error
      );

      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível processar o QR Code."
      );
    } finally {
      setProcessandoQr(false);
    }
  };

  /*
   * O usuário decidiu fotografar a nota mesmo
   * depois de o QR ter sido encontrado.
   *
   * A câmera continua ativa.
   */
  const fotografarNota = () => {
    setQrEncontrado(null);
    setQrConfirmado(false);
    setProcessandoQr(false);
    setErro(null);
  };

  /*
   * Captura o frame atual da câmera como JPEG.
   */
  const capturarFoto = () => {
    const video = videoRef.current;

    if (!video) {
      setErro(
        "A visualização da câmera não está disponível."
      );

      return;
    }

    if (
      !cameraPronta ||
      video.videoWidth <= 0 ||
      video.videoHeight <= 0
    ) {
      setErro(
        "A câmera ainda não está pronta para capturar a imagem."
      );

      return;
    }

    const canvas =
      document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const contexto =
      canvas.getContext("2d");

    if (!contexto) {
      setErro(
        "Não foi possível preparar a imagem capturada."
      );

      return;
    }

    contexto.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setErro(
            "Não foi possível gerar a fotografia."
          );

          return;
        }

        const agora = new Date();

        const nomeArquivo =
          [
            "nota-fiscal",
            agora.getFullYear(),
            String(
              agora.getMonth() + 1
            ).padStart(2, "0"),
            String(
              agora.getDate()
            ).padStart(2, "0"),
            String(
              agora.getHours()
            ).padStart(2, "0"),
            String(
              agora.getMinutes()
            ).padStart(2, "0"),
            String(
              agora.getSeconds()
            ).padStart(2, "0"),
          ].join("-") + ".jpg";

        const arquivo = new File(
          [blob],
          nomeArquivo,
          {
            type: "image/jpeg",
            lastModified: Date.now(),
          }
        );

        const novaPreviewUrl =
          URL.createObjectURL(blob);

        setPreviewUrl((urlAnterior) => {
          if (urlAnterior) {
            URL.revokeObjectURL(
              urlAnterior
            );
          }

          return novaPreviewUrl;
        });

        setArquivoPreview(arquivo);
        setErro(null);

        pararCamera();
        setModo("PREVIA");
      },
      "image/jpeg",
      0.92
    );
  };

  /*
   * Seleção de imagem existente no dispositivo.
   */
  const selecionarArquivo = (
    evento: React.ChangeEvent<HTMLInputElement>
  ) => {
    const arquivo =
      evento.target.files?.[0];

    if (!arquivo) {
      return;
    }

    if (
      !arquivo.type.startsWith("image/")
    ) {
      setErro(
        "Selecione uma imagem da nota fiscal."
      );

      evento.target.value = "";

      return;
    }

    const novaPreviewUrl =
      URL.createObjectURL(arquivo);

    setPreviewUrl((urlAnterior) => {
      if (urlAnterior) {
        URL.revokeObjectURL(
          urlAnterior
        );
      }

      return novaPreviewUrl;
    });

    setArquivoPreview(arquivo);
    setErro(null);
    setQrEncontrado(null);
    setQrConfirmado(false);
    setProcessandoQr(false);
    setModo("PREVIA");

    evento.target.value = "";
  };

  /*
   * Confirma a fotografia e entrega o arquivo
   * original ao fluxo superior.
   */
  const confirmarFoto = async () => {
    if (
      !arquivoPreview ||
      disabled ||
      confirmando
    ) {
      return;
    }

    try {
      setConfirmando(true);
      setErro(null);

      const sucesso =
        await onConfirmar(
          arquivoPreview
        );

      if (!sucesso) {
        return;
      }

      voltarParaEscolha();
    } catch (error) {
      console.error(
        "Erro ao confirmar fotografia:",
        error
      );

      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível confirmar a fotografia."
      );
    } finally {
      setConfirmando(false);
    }
  };

  /*
   * Segurança extra para garantir que a câmera
   * e URLs sejam encerradas quando o componente
   * for desmontado.
   */
  useEffect(() => {
    return () => {
      pararCamera();

      if (previewUrl) {
        URL.revokeObjectURL(
          previewUrl
        );
      }
    };
  }, [
    pararCamera,
    previewUrl,
  ]);

  const bloqueado =
    disabled ||
    confirmando ||
    processandoQr;

  /*
   * ESTADO: ESCOLHA
   */
  if (modo === "ESCOLHA") {
    return (
      <section
        aria-label="Adicionar documento da nota fiscal"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          width: "100%",
          maxWidth: 520,
          margin: "0 auto",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            Adicionar nota fiscal
          </h2>

          <p
            style={{
              marginTop: 8,
              marginBottom: 0,
              lineHeight: 1.5,
              opacity: 0.75,
            }}
          >
            Fotografe a nota ou escolha uma
            imagem já existente.
          </p>
        </div>

        <button
          type="button"
          onClick={abrirCamera}
          disabled={
            bloqueado ||
            carregandoCamera
          }
          style={{
            minHeight: 56,
            borderRadius: 12,
            border:
              "1px solid #d4d4d4",
            background: "#111",
            color: "#fff",
            fontSize: 16,
            fontWeight: 700,
            cursor:
              bloqueado ||
              carregandoCamera
                ? "not-allowed"
                : "pointer",
            opacity:
              bloqueado ||
              carregandoCamera
                ? 0.6
                : 1,
          }}
        >
          {carregandoCamera
            ? "Abrindo câmera..."
            : "📷 Tirar foto"}
        </button>

        <button
          type="button"
          onClick={() =>
            fileInputRef.current?.click()
          }
          disabled={bloqueado}
          style={{
            minHeight: 56,
            borderRadius: 12,
            border:
              "1px solid #d4d4d4",
            background: "#fff",
            color: "#111",
            fontSize: 16,
            fontWeight: 700,
            cursor: bloqueado
              ? "not-allowed"
              : "pointer",
            opacity: bloqueado
              ? 0.6
              : 1,
          }}
        >
          🖼️ Escolher imagem
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={selecionarArquivo}
          disabled={bloqueado}
          style={{
            display: "none",
          }}
        />

        {erro && (
          <div
            role="alert"
            style={{
              padding: 12,
              borderRadius: 10,
              background: "#fef2f2",
              color: "#991b1b",
              fontSize: 14,
              lineHeight: 1.4,
            }}
          >
            {erro}
          </div>
        )}

        {onCancelar && (
          <button
            type="button"
            onClick={onCancelar}
            disabled={bloqueado}
            style={{
              border: "none",
              background:
                "transparent",
              padding: 8,
              fontSize: 14,
              cursor: bloqueado
                ? "not-allowed"
                : "pointer",
              opacity: bloqueado
                ? 0.6
                : 1,
            }}
          >
            Cancelar
          </button>
        )}
      </section>
    );
  }

  /*
   * ESTADO: CAMERA
   */
  if (modo === "CAMERA") {
    return (
      <section
        aria-label="Câmera para fotografar nota fiscal"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          width: "100%",
          maxWidth: 720,
          margin: "0 auto",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            Fotografar nota fiscal
          </h2>

          <p
            style={{
              marginTop: 8,
              marginBottom: 0,
              lineHeight: 1.5,
              opacity: 0.75,
            }}
          >
            Primeiro tentaremos localizar o
            QR Code. Se ele não for utilizado,
            você poderá fotografar a nota.
          </p>
        </div>

        <div
          style={{
            position: "relative",
            width: "100%",
            overflow: "hidden",
            borderRadius: 16,
            background: "#000",
            aspectRatio: "4 / 3",
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={
              quandoVideoCarregar
            }
            onCanPlay={
              quandoVideoCarregar
            }
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />

          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: "30%",
              border:
                "2px solid rgba(255,255,255,0.9)",
              borderRadius: 8,
              pointerEvents:
                "none",
            }}
          />

          {!cameraPronta && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                background:
                  "rgba(0,0,0,0.35)",
                fontWeight: 700,
              }}
            >
              Preparando câmera...
            </div>
          )}

          {cameraPronta &&
            !qrEncontrado && (
              <div
                style={{
                  position: "absolute",
                  left: 16,
                  right: 16,
                  bottom: 16,
                  padding: 10,
                  borderRadius: 10,
                  background:
                    "rgba(0,0,0,0.65)",
                  color: "#fff",
                  textAlign: "center",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Procurando QR Code...
              </div>
            )}
        </div>

        {qrEncontrado && (
          <div
            role="status"
            style={{
              padding: 14,
              borderRadius: 12,
              background: "#eff6ff",
              color: "#1e3a8a",
              border:
                "1px solid #bfdbfe",
            }}
          >
            <strong>
              QR Code detectado
            </strong>

            <div
              style={{
                marginTop: 8,
                wordBreak:
                  "break-word",
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: 13,
              }}
            >
              {qrEncontrado}
            </div>

            {qrConfirmado && (
              <div
                style={{
                  marginTop: 10,
                  fontWeight: 700,
                }}
              >
                ✓ QR Code confirmado
              </div>
            )}
          </div>
        )}

        {erro && (
          <div
            role="alert"
            style={{
              padding: 12,
              borderRadius: 10,
              background: "#fef2f2",
              color: "#991b1b",
              fontSize: 14,
              lineHeight: 1.4,
            }}
          >
            {erro}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr",
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={
              voltarParaEscolha
            }
            disabled={bloqueado}
            style={{
              minHeight: 54,
              borderRadius: 12,
              border:
                "1px solid #d4d4d4",
              background: "#fff",
              color: "#111",
              fontSize: 16,
              fontWeight: 700,
              cursor: bloqueado
                ? "not-allowed"
                : "pointer",
              opacity: bloqueado
                ? 0.6
                : 1,
            }}
          >
            Voltar
          </button>

          {qrEncontrado ? (
            <>
              <button
                type="button"
                onClick={
                  usarQrCode
                }
                disabled={
                  bloqueado ||
                  qrConfirmado
                }
                style={{
                  minHeight: 54,
                  borderRadius: 12,
                  border:
                    "1px solid #111",
                  background: "#111",
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: 700,
                  cursor:
                    bloqueado ||
                    qrConfirmado
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    bloqueado ||
                    qrConfirmado
                      ? 0.6
                      : 1,
                }}
              >
                {processandoQr
                  ? "Processando QR Code..."
                  : qrConfirmado
                    ? "✓ QR Code confirmado"
                    : "✓ Usar este QR Code"}
              </button>

              <button
                type="button"
                onClick={
                  fotografarNota
                }
                disabled={
                  bloqueado
                }
                style={{
                  minHeight: 54,
                  borderRadius: 12,
                  border:
                    "1px solid #d4d4d4",
                  background: "#fff",
                  color: "#111",
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: bloqueado
                    ? "not-allowed"
                    : "pointer",
                  opacity: bloqueado
                    ? 0.6
                    : 1,
                }}
              >
                📄 Fotografar nota
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={
                capturarFoto
              }
              disabled={
                !cameraPronta ||
                bloqueado
              }
              style={{
                minHeight: 54,
                borderRadius: 12,
                border:
                  "1px solid #111",
                background: "#111",
                color: "#fff",
                fontSize: 16,
                fontWeight: 700,
                cursor:
                  !cameraPronta ||
                  bloqueado
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  !cameraPronta ||
                  bloqueado
                    ? 0.5
                    : 1,
              }}
            >
              📸 Capturar
            </button>
          )}
        </div>
      </section>
    );
  }

  /*
   * ESTADO: PREVIA
   */
  return (
    <section
      aria-label="Pré-visualização da nota fiscal"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        width: "100%",
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          Conferir fotografia
        </h2>

        <p
          style={{
            marginTop: 8,
            marginBottom: 0,
            lineHeight: 1.5,
            opacity: 0.75,
          }}
        >
          Verifique se toda a nota está
          visível e legível antes de
          confirmar.
        </p>
      </div>

      {previewUrl && (
        <div
          style={{
            width: "100%",
            overflow: "hidden",
            borderRadius: 16,
            background: "#f5f5f5",
          }}
        >
          <img
            src={previewUrl}
            alt="Pré-visualização da nota fiscal"
            style={{
              display: "block",
              width: "100%",
              height: "auto",
              maxHeight: "70vh",
              objectFit: "contain",
            }}
          />
        </div>
      )}

      {arquivoPreview && (
        <div
          style={{
            fontSize: 14,
            lineHeight: 1.5,
            opacity: 0.75,
          }}
        >
          <strong>
            Arquivo:
          </strong>{" "}
          {arquivoPreview.name}
          <br />
          <strong>
            Tamanho:
          </strong>{" "}
          {(
            arquivoPreview.size /
            1024 /
            1024
          ).toFixed(2)}{" "}
          MB
        </div>
      )}

      {erro && (
        <div
          role="alert"
          style={{
            padding: 12,
            borderRadius: 10,
            background: "#fef2f2",
            color: "#991b1b",
            fontSize: 14,
            lineHeight: 1.4,
          }}
        >
          {erro}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1fr 1fr",
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={
            voltarParaEscolha
          }
          disabled={bloqueado}
          style={{
            minHeight: 54,
            borderRadius: 12,
            border:
              "1px solid #d4d4d4",
            background: "#fff",
            color: "#111",
            fontSize: 16,
            fontWeight: 700,
            cursor: bloqueado
              ? "not-allowed"
              : "pointer",
            opacity: bloqueado
              ? 0.6
              : 1,
          }}
        >
          Refazer
        </button>

        <button
          type="button"
          onClick={
            confirmarFoto
          }
          disabled={
            bloqueado ||
            !arquivoPreview
          }
          style={{
            minHeight: 54,
            borderRadius: 12,
            border:
              "1px solid #111",
            background: "#111",
            color: "#fff",
            fontSize: 16,
            fontWeight: 700,
            cursor:
              bloqueado ||
              !arquivoPreview
                ? "not-allowed"
                : "pointer",
            opacity:
              bloqueado ||
              !arquivoPreview
                ? 0.6
                : 1,
          }}
        >
          {confirmando
            ? "Processando..."
            : "✓ Usar esta imagem"}
        </button>
      </div>
    </section>
  );
}