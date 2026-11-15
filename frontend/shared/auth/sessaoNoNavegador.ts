// Páginas que não precisam de login (e onde um 401 não deve levar ao login de novo).
const CAMINHOS_DE_ENTRADA = ["/login", "/primeiro-acesso"];

let instalado = false;

export function irParaOLogin(): void {
  const atual = window.location.pathname + window.location.search;

  const destino = atual === "/" ? "/login" : `/login?proximo=${encodeURIComponent(atual)}`;

  window.location.assign(destino);
}

// Se a sessão acabar enquanto a pessoa usa o sistema (venceu, foi encerrada ou o
// usuário foi desativado), a próxima chamada à API volta 401 e leva ao login.
export function instalarTratamentoDeSessao(): void {
  if (instalado || typeof window === "undefined") {
    return;
  }

  instalado = true;

  const original = window.fetch.bind(window);

  window.fetch = async (entrada, inicio) => {
    const resposta = await original(entrada, inicio);

    if (resposta.status === 401 && !CAMINHOS_DE_ENTRADA.includes(window.location.pathname)) {
      const url = typeof entrada === "string" ? entrada : entrada instanceof URL ? entrada.pathname : entrada.url;

      // O login em si volta 401 para senha errada: isso a tela de login trata.
      if (url.includes("/api/") && !url.includes("/api/auth/login")) {
        irParaOLogin();
      }
    }

    return resposta;
  };
}

export async function sairDoSistema(): Promise<void> {
  try {
    await fetch("/api/auth/sair", { method: "POST" });
  } finally {
    window.location.assign("/login");
  }
}
