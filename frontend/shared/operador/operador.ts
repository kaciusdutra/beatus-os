// Operador provisório (até existir login): escolhido no topo da tela, guardado
// no navegador e enviado no cabeçalho x-operador de cada requisição à API.
// O registro de atividades grava esse nome.

export const OPERADORES = ["Kacius", "Irmão"] as const;

const CHAVE = "beatus.operador";

const EVENTO = "beatus-operador";

export function lerOperador(): string {
  try {
    return localStorage.getItem(CHAVE) || OPERADORES[0];
  } catch {
    return OPERADORES[0];
  }
}

export function guardarOperador(nome: string): void {
  try {
    localStorage.setItem(CHAVE, nome);
  } catch {
    // sem armazenamento: continua com o padrão
  }

  window.dispatchEvent(new Event(EVENTO));
}

export function assinarOperador(aviso: () => void): () => void {
  window.addEventListener(EVENTO, aviso);
  window.addEventListener("storage", aviso);

  return () => {
    window.removeEventListener(EVENTO, aviso);
    window.removeEventListener("storage", aviso);
  };
}

let instalado = false;

// Faz toda chamada a /api/ levar o operador atual.
export function instalarOperadorNasRequisicoes(): void {
  if (instalado || typeof window === "undefined") {
    return;
  }

  instalado = true;

  const original = window.fetch.bind(window);

  window.fetch = (entrada, inicio) => {
    const url =
      typeof entrada === "string"
        ? entrada
        : entrada instanceof URL
          ? entrada.pathname
          : entrada.url;

    if (url.startsWith("/api/") || url.includes("/api/")) {
      const cabecalhos = new Headers(inicio?.headers);

      if (!cabecalhos.has("x-operador")) {
        cabecalhos.set("x-operador", encodeURIComponent(lerOperador()));
      }

      return original(entrada, { ...inicio, headers: cabecalhos });
    }

    return original(entrada, inicio);
  };
}
