// O endereço que vai dentro do QR impresso (ex.: https://beatus.exemplo.com).
// Por padrão é o endereço em que o sistema está aberto agora. Quando o sistema
// estiver hospedado, basta imprimir as etiquetas de lá, ou informar o endereço
// fixo na tela de impressão. Fica guardado neste navegador.

const CHAVE = "beatus.enderecoDoQr";

const EVENTO = "beatus-endereco-do-qr";

export function lerEnderecoDoQr(): string {
  try {
    const guardado = localStorage.getItem(CHAVE);

    if (guardado) {
      return guardado;
    }
  } catch {
    // sem armazenamento: usa o endereço atual
  }

  return window.location.origin;
}

// Vazio volta ao endereço atual.
export function guardarEnderecoDoQr(endereco: string): void {
  try {
    if (endereco.trim()) {
      localStorage.setItem(CHAVE, endereco.trim());
    } else {
      localStorage.removeItem(CHAVE);
    }
  } catch {
    // sem armazenamento: vale só até recarregar
  }

  window.dispatchEvent(new Event(EVENTO));
}

export function assinarEnderecoDoQr(aviso: () => void): () => void {
  window.addEventListener(EVENTO, aviso);
  window.addEventListener("storage", aviso);

  return () => {
    window.removeEventListener(EVENTO, aviso);
    window.removeEventListener("storage", aviso);
  };
}
