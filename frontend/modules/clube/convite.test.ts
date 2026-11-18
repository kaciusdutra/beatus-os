import { destinoDoConvite, enderecoDoConvite, enderecoEhDeTeste, mensagemDoConviteNoWhatsApp, origemDoConviteValida } from "./convite";

import { CLUBE_ATIVO, DIAS_DE_VALIDADE_DA_VANTAGEM, DIAS_PARA_O_CARTAO_REINICIAR, SELOS_PARA_A_VANTAGEM, VALOR_MINIMO_DO_SELO, valorPremium } from "./regras";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

// ---------- Regras do clube (seção 28) ----------

verificar(VALOR_MINIMO_DO_SELO === 50 && SELOS_PARA_A_VANTAGEM === 8 && DIAS_PARA_O_CARTAO_REINICIAR === 60 && DIAS_DE_VALIDADE_DA_VANTAGEM === 15, "os números batem com a seção 28 das regras");
verificar(CLUBE_ATIVO === false, "o clube só é anunciado depois de construído (ligue esta chave junto com o cartão)");
verificar(valorPremium(50) === "50" && valorPremium(44.9) === "44,90" && valorPremium(1250) === "1.250", "valor no formato premium");

// ---------- Origem ----------

verificar(origemDoConviteValida("ifood") === "ifood" && origemDoConviteValida(" IFood ") === "ifood" && origemDoConviteValida("99food") === "99food" && origemDoConviteValida("keeta") === "keeta" && origemDoConviteValida("proprio") === "proprio", "origens conhecidas");
verificar(origemDoConviteValida("<script>") === "proprio" && origemDoConviteValida("") === "proprio" && origemDoConviteValida(null) === "proprio" && origemDoConviteValida(undefined) === "proprio" && origemDoConviteValida("ifood&x=1") === "proprio", "o que não é conhecido vira canais próprios, sem confiar no que vem de fora");

// ---------- Endereços ----------

verificar(enderecoDoConvite("https://beatus.com.br", "ifood") === "https://beatus.com.br/convite?o=ifood", "endereço curto do QR com a origem");
verificar(enderecoDoConvite("https://beatus.com.br///", "keeta") === "https://beatus.com.br/convite?o=keeta", "barras sobrando saem");
verificar(enderecoDoConvite("https://beatus.com.br", "lixo") === "https://beatus.com.br/convite?o=proprio", "origem inválida no QR vira própria");
verificar(destinoDoConvite("ifood") === "/cardapio/convite?utm_source=qr&utm_medium=embalagem&utm_campaign=ifood", "destino leva a campanha da embalagem");
verificar(destinoDoConvite("<x>") === "/cardapio/convite?utm_source=qr&utm_medium=embalagem&utm_campaign=proprio", "destino com origem estranha cai em própria");

// ---------- WhatsApp ----------

verificar(mensagemDoConviteNoWhatsApp("ifood") === "Oi! Vi o QR no meu pedido do iFood e quero pedir direto.", "mensagem do iFood");
verificar(mensagemDoConviteNoWhatsApp("proprio") === "Oi! Vi o QR no meu pedido e quero pedir direto.", "mensagem dos canais próprios");
verificar(!mensagemDoConviteNoWhatsApp("keeta").includes("undefined"), "sem 'undefined' na mensagem");

// ---------- Endereço de teste ----------

verificar(enderecoEhDeTeste("http://localhost:3000") && enderecoEhDeTeste("http://192.168.0.245:3000") && enderecoEhDeTeste("http://beatus.com.br") && enderecoEhDeTeste("") && enderecoEhDeTeste("https://localhost"), "localhost, rede local e sem https são endereço de teste");
verificar(!enderecoEhDeTeste("https://beatus.com.br") && !enderecoEhDeTeste(" https://beatus.com.br "), "domínio com https vale");

console.log(`✅ Testes do convite e das regras do clube passaram (${verificacoes} verificações).`);
