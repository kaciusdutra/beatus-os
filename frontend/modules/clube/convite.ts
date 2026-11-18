// O QR do convite, impresso em cada pedido que sai da cozinha. Ele aponta sempre para o mesmo endereço nosso
// (/convite), que redireciona para a página do site: assim dá para mudar o destino sem reimprimir, e a origem
// (iFood, 99Food, Keeta ou canais próprios) viaja nos parâmetros de campanha que o site já captura e grava no pedido
// (regra 27.8).

export interface OrigemDoConvite {
  chave: string;
  rotulo: string;
}

export const ORIGENS_DO_CONVITE: OrigemDoConvite[] = [
  { chave: "proprio", rotulo: "Canais próprios (site, WhatsApp, PDV)" },
  { chave: "ifood", rotulo: "iFood" },
  { chave: "99food", rotulo: "99Food" },
  { chave: "keeta", rotulo: "Keeta" },
];

export const ORIGEM_PADRAO_DO_CONVITE = "proprio";

// A origem que veio no endereço, ou a padrão se for desconhecida (nunca confia no que vem de fora).
export function origemDoConviteValida(bruta: string | null | undefined): string {
  const limpa = (bruta ?? "").trim().toLowerCase();

  return ORIGENS_DO_CONVITE.some((origem) => origem.chave === limpa) ? limpa : ORIGEM_PADRAO_DO_CONVITE;
}

// O que vai dentro do QR: o endereço curto do convite, com a origem. O endereço base vem do domínio definitivo.
export function enderecoDoConvite(base: string, origem: string): string {
  const semBarra = base.trim().replace(/\/+$/, "");

  return `${semBarra}/convite?o=${origemDoConviteValida(origem)}`;
}

// Para onde /convite redireciona: a página do site, com a campanha da embalagem (utm) para o pedido guardar de onde veio.
export function destinoDoConvite(origemBruta: string | null | undefined): string {
  return `/cardapio/convite?utm_source=qr&utm_medium=embalagem&utm_campaign=${origemDoConviteValida(origemBruta)}`;
}

// A conversa que o botão do WhatsApp já deixa escrita.
export function mensagemDoConviteNoWhatsApp(origemBruta: string | null | undefined): string {
  const origem = origemDoConviteValida(origemBruta);

  const rotulo = ORIGENS_DO_CONVITE.find((item) => item.chave === origem)?.rotulo;

  return origem === ORIGEM_PADRAO_DO_CONVITE ? "Oi! Vi o QR no meu pedido e quero pedir direto." : `Oi! Vi o QR no meu pedido do ${rotulo} e quero pedir direto.`;
}

// Endereço de teste (a máquina local): o QR impresso com ele não funcionaria para ninguém.
export function enderecoEhDeTeste(base: string): boolean {
  return /^https?:\/\/(localhost|127\.|0\.0\.0\.0|192\.168\.|10\.|\[::1\])/i.test(base.trim()) || !/^https:\/\//i.test(base.trim());
}
