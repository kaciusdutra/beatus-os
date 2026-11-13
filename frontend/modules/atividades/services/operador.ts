// O operador escolhido no topo da tela vai no cabeçalho x-operador de cada
// requisição (provisório, até o login existir).
export const CABECALHO_DO_OPERADOR = "x-operador";

export function operadorDaRequisicao(request: Request): string | null {
  const bruto = request.headers.get(CABECALHO_DO_OPERADOR);

  if (!bruto) {
    return null;
  }

  try {
    return decodeURIComponent(bruto).trim().slice(0, 40) || null;
  } catch {
    return null;
  }
}
