// Os textos institucionais do site. >>> TEXTOS PROVISÓRIOS <<<
// Foram escritos como ponto de partida (sem inventar fatos da história da casa) e
// devem ser substituídos pelo texto do Kacius. É só editar este arquivo.

export interface ValorDaMarca {
  titulo: string;
  texto: string;
}

export const INSTITUCIONAL = {
  nome: "Beatus Burger Delivery",

  chamada: "Hambúrguer feito com cuidado, entregue na sua porta.",

  historia: [
    "A história do Beatus está sendo escrita. Em breve contamos por aqui como tudo começou.",
  ],

  missao: "Levar até você um hambúrguer feito com ingredientes de qualidade e muito cuidado, do preparo à entrega.",

  objetivo: "Ser o hambúrguer em que você pensa quando quer pedir bem, e voltar a pedir.",

  valores: [
    { titulo: "Qualidade", texto: "Ingredientes bem escolhidos e receitas padronizadas, para o hambúrguer chegar sempre no mesmo ponto." },
    { titulo: "Cuidado", texto: "Higiene, validade e temperatura levadas a sério em cada etapa da cozinha." },
    { titulo: "Pontualidade", texto: "Respeito pelo seu tempo: pedido anotado certo e entregue no prazo combinado." },
    { titulo: "Respeito ao cliente", texto: "Atendimento claro e honesto, do pedido ao pós-venda." },
  ] as ValorDaMarca[],
};
