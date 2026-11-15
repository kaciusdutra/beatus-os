// Chamada simples às rotas do sistema pelo navegador. As rotas respondem
// { sucesso, mensagem, ... } com a mensagem já escrita para a pessoa.
export async function chamarApi<T = Record<string, unknown>>(
  url: string,
  opcoes: { metodo?: "GET" | "POST" | "PUT"; corpo?: object; falha: string }
): Promise<T> {
  const resposta = await fetch(url, {
    method: opcoes.metodo ?? (opcoes.corpo ? "POST" : "GET"),
    headers: opcoes.corpo ? { "Content-Type": "application/json" } : undefined,
    body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : undefined,
    cache: "no-store",
  });

  let dados: (T & { sucesso?: boolean; mensagem?: string }) | null = null;

  try {
    dados = await resposta.json();
  } catch {
    dados = null;
  }

  if (!resposta.ok || !dados || dados.sucesso === false) {
    throw new Error(dados?.mensagem || opcoes.falha);
  }

  return dados;
}

export function numeroDoCampo(texto: string): number {
  return Number(texto.trim().replace(",", "."));
}
