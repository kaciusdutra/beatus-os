import { createHmac, timingSafeEqual } from "node:crypto";

// Confere se o aviso (webhook) veio mesmo do Mercado Pago. O cabeçalho
// x-signature traz "ts=<momento>,v1=<assinatura>". A assinatura é o HMAC-SHA256
// (em hexadecimal), com a chave secreta do aplicativo, do texto
//   id:<data.id>;request-id:<x-request-id>;ts:<ts>;
// (parte ausente sai do texto; o id, se tiver letras, vai em minúsculas).
export function validarAssinaturaMercadoPago(dados: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  segredo: string;
}): boolean {
  if (!dados.xSignature || !dados.segredo) {
    return false;
  }

  let ts = "";

  let v1 = "";

  for (const parte of dados.xSignature.split(",")) {
    const [chave, ...resto] = parte.split("=");

    const valor = resto.join("=").trim();

    if (chave.trim() === "ts") {
      ts = valor;
    } else if (chave.trim() === "v1") {
      v1 = valor;
    }
  }

  if (!ts || !v1) {
    return false;
  }

  let texto = "";

  if (dados.dataId) {
    texto += `id:${dados.dataId.toLowerCase()};`;
  }

  if (dados.xRequestId) {
    texto += `request-id:${dados.xRequestId};`;
  }

  texto += `ts:${ts};`;

  const esperado = createHmac("sha256", dados.segredo).update(texto).digest("hex");

  const recebido = Buffer.from(v1, "utf8");

  const calculado = Buffer.from(esperado, "utf8");

  return recebido.length === calculado.length && timingSafeEqual(recebido, calculado);
}
