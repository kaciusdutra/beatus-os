// Política de privacidade do site. >>> RASCUNHO PARA REVISÃO JURÍDICA <<<
// Os trechos entre colchetes são dados da empresa que faltam (o CNPJ está em revisão).
// Ao mudar o texto, mude também a versão em modules/checkout/services/entradaDoCheckout.ts
// (VERSAO_DA_POLITICA): ela fica gravada no cadastro de quem aceita.

export interface SecaoDaPolitica {
  titulo: string;
  paragrafos: string[];
}

export const DADOS_DO_CONTROLADOR = {
  razaoSocial: "[RAZÃO SOCIAL DO BEATUS]",
  cnpj: "[CNPJ]",
  endereco: "[ENDEREÇO DA EMPRESA]",
  contato: "[E-MAIL DE CONTATO PARA ASSUNTOS DE PRIVACIDADE]",
};

export const POLITICA_DE_PRIVACIDADE: SecaoDaPolitica[] = [
  {
    titulo: "1. Quem somos",
    paragrafos: [
      `O Beatus Burger Delivery (${DADOS_DO_CONTROLADOR.razaoSocial}, CNPJ ${DADOS_DO_CONTROLADOR.cnpj}, ${DADOS_DO_CONTROLADOR.endereco}) é o responsável pelo tratamento dos seus dados pessoais neste site, nos termos da Lei Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018).`,
      `Para falar sobre os seus dados, escreva para ${DADOS_DO_CONTROLADOR.contato}.`,
    ],
  },
  {
    titulo: "2. Quais dados coletamos",
    paragrafos: [
      "Ao fazer um pedido: nome, telefone, CPF, endereço de entrega e, se você informar, e-mail e data de nascimento.",
      "Do pedido: o que você pediu, os valores, a forma de pagamento e o histórico dos seus pedidos.",
      "Seu carrinho fica guardado no próprio aparelho (armazenamento do navegador) e não é enviado para nós até você fechar o pedido.",
      "Se você conversar com a Beatriz, o que você escreve na conversa (veja a seção 5) e, com o tempo, o que aprendemos sobre o seu gosto (por exemplo, o hambúrguer preferido, o que você não gosta de comer, como gosta de ser chamado e a data do seu aniversário).",
      "Se você chegar pelo link de um anúncio, guardamos de qual campanha veio (origem do anúncio), para saber o que funciona.",
    ],
  },
  {
    titulo: "3. Para que usamos",
    paragrafos: [
      "Para receber, preparar, entregar e cobrar o seu pedido, e para falar com você sobre ele (execução do contrato).",
      "O CPF é usado para o pagamento e para identificar o seu cadastro, sem duplicidade.",
      "Para manter o seu cadastro e o seu histórico, e para o clube de vantagens do Beatus, quando ele existir (legítimo interesse e execução do contrato).",
      "Para enviar promoções e novidades: somente se você marcar a caixa de autorização de mensagens. Essa autorização é separada da política de privacidade, nunca vem marcada e você pode retirá-la quando quiser.",
      "A data de nascimento é opcional e serve para ações de aniversário.",
    ],
  },
  {
    titulo: "4. Pagamento e dados do cartão",
    paragrafos: [
      "O pagamento é feito no ambiente do Mercado Pago. Os dados do seu cartão são digitados lá e nunca passam pelos nossos sistemas nem ficam guardados conosco. Recebemos apenas a confirmação do pagamento, o valor e o meio usado (Pix, crédito ou débito).",
    ],
  },
  {
    titulo: "5. A Beatriz, nossa atendente virtual, e a memória do seu gosto",
    paragrafos: [
      "A Beatriz é uma atendente virtual, feita com inteligência artificial (IA), que conversa com você, tira dúvidas do cardápio e anota o seu pedido. Ela avisa que é virtual e, quando o assunto precisa de uma pessoa (reclamação, alergia, desconto), a nossa equipe assume. Quem confirma a compra é você, ao pagar: a IA não decide nada sozinha sobre você.",
      "Para responder, o texto que você escreve é enviado ao nosso provedor de IA, a Anthropic, que fica fora do Brasil (transferência internacional de dados, com as garantias previstas na LGPD). No chat do site não enviamos o seu nome, telefone ou CPF cadastrados. Quando você fala com a Beatriz pelo WhatsApp, ela reconhece o seu número e também usa, na conversa, o seu primeiro nome, o seu último pedido e o que já aprendeu do seu gosto. Por isso, não escreva senha, CPF nem dados de cartão na conversa.",
      "No site, a conversa fica guardada somente no seu aparelho, por 24 horas, e não é guardada por nós. O que a Beatriz aprende do seu gosto fica no seu cadastro como etiquetas curtas (por exemplo, o hambúrguer preferido, o que você evita, como gosta de ser chamado, o aniversário). Nunca guardamos como etiqueta dados de saúde, alergia, religião, política, vida íntima, telefone, CPF ou endereço. Quem conversou conosco e ainda não é cliente tem essas etiquetas apagadas em 30 dias, se não fizer um pedido.",
      "Usamos a memória para atender melhor (por exemplo, perguntar se você quer o mesmo pedido de sempre ou experimentar um sabor novo). Convites e lembretes do clube de vantagens só chegam para quem aceitou receber mensagens. Você pode pedir a qualquer momento para ver ou apagar o que a Beatriz sabe de você.",
    ],
  },
  {
    titulo: "6. Com quem compartilhamos",
    paragrafos: [
      "Compartilhamos o mínimo necessário com o Mercado Pago (para cobrar o pagamento), com o provedor de IA da Beatriz (seção 5), com a Meta (WhatsApp, para os avisos do pedido e a conversa) e, quando houver, com serviços de entrega que usamos para atender você. Não vendemos os seus dados.",
      "Podemos compartilhar dados quando a lei ou uma autoridade exigir.",
    ],
  },
  {
    titulo: "7. Por quanto tempo guardamos",
    paragrafos: [
      "Guardamos os dados enquanto você for nosso cliente e pelo tempo exigido por lei para documentos fiscais e contábeis. Depois disso, eliminamos ou anonimizamos. Os prazos da conversa com a Beatriz e das etiquetas estão na seção 5.",
    ],
  },
  {
    titulo: "8. Seus direitos",
    paragrafos: [
      "Você pode, a qualquer momento: confirmar que tratamos seus dados e acessá-los (inclusive o que a Beatriz aprendeu do seu gosto), corrigir dados incompletos ou errados, pedir a eliminação de dados tratados com o seu consentimento, pedir a portabilidade, saber com quem compartilhamos, pedir a revisão por uma pessoa de uma decisão tomada pela IA e retirar o consentimento de marketing.",
      `Faça o pedido por ${DADOS_DO_CONTROLADOR.contato}. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).`,
    ],
  },
  {
    titulo: "9. Segurança",
    paragrafos: [
      "Usamos conexão segura, acesso restrito por perfil, senhas guardadas de forma protegida e registro de quem acessa o quê. Nenhum sistema é totalmente imune, e em caso de incidente relevante avisaremos você e a ANPD, como manda a lei.",
    ],
  },
  {
    titulo: "10. Mudanças nesta política",
    paragrafos: [
      "Podemos atualizar esta política. A versão em vigor fica nesta página e a versão que você aceitou fica registrada no seu cadastro.",
    ],
  },
];
