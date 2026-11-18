// As regras do clube de vantagens num lugar só (seção 28 de docs/REGRAS_DE_NEGOCIO.md). Quem desenha texto
// (página de convite, cartão, Beatriz) lê daqui, para o número nunca divergir. Mais tarde estes valores viram
// parâmetros que o Kacius muda numa tela; por enquanto, mudar aqui.

// O clube só é anunciado ao cliente quando os selos automáticos estiverem funcionando. Enquanto for falso,
// a página de convite convida a pedir direto sem prometer vantagem. Ligue junto com a entrega do cartão.
export const CLUBE_ATIVO = false;

// Pedido entregue com pelo menos este valor em itens (sem a taxa de entrega) dá 1 selo.
export const VALOR_MINIMO_DO_SELO = 50;

// Selos para completar o cartão e ganhar uma vantagem (a primeira: 1 hambúrguer por conta da casa).
export const SELOS_PARA_A_VANTAGEM = 8;

// O cartão reinicia depois deste tempo sem pedir.
export const DIAS_PARA_O_CARTAO_REINICIAR = 60;

// Uma vantagem ganha e não usada vale este tempo.
export const DIAS_DE_VALIDADE_DA_VANTAGEM = 15;

// Preço premium (regra 23.8): inteiro sem centavos, com centavos nunca arredonda.
export function valorPremium(valor: number): string {
  return Number.isInteger(valor) ? valor.toLocaleString("pt-BR") : valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
