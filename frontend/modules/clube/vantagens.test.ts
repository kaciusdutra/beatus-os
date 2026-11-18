import { descreverVantagem, validarVantagem } from "./vantagens";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

function erro(bruto: unknown): string {
  const r = validarVantagem(bruto);

  return r.ok ? "" : r.erro;
}

// ---------- Item grátis ----------
{
  const r = validarVantagem({ nome: " Hambúrguer por conta da casa ", tipo: "ITEM_GRATIS", categoria: " HAMBÚRGUER ", valorMaximo: "50,5", ordem: 2 });

  verificar(r.ok && r.dados.nome === "Hambúrguer por conta da casa" && r.dados.categoria === "HAMBÚRGUER" && r.dados.valorMaximo === 50.5 && r.dados.ordem === 2 && r.dados.ativa && r.dados.percentual === null, "item grátis: limpa e aceita vírgula no valor");
}

verificar(validarVantagem({ nome: "Qualquer", tipo: "ITEM_GRATIS" }).ok, "item grátis sem categoria e sem teto vale");
verificar(erro({ nome: "Teto ruim", tipo: "ITEM_GRATIS", valorMaximo: -5 }).includes("valor máximo"), "valor máximo negativo é recusado");
verificar(erro({ nome: "Teto ruim", tipo: "ITEM_GRATIS", valorMaximo: "abc" }).includes("valor máximo"), "valor máximo que não é número é recusado");
verificar(erro({ nome: "Teto ruim", tipo: "ITEM_GRATIS", valorMaximo: 100000 }).includes("valor máximo"), "valor máximo absurdo é recusado");

// ---------- Desconto ----------
{
  const r = validarVantagem({ nome: "Dez por cento", tipo: "DESCONTO_PERCENTUAL", percentual: 10, categoria: "X", valorMaximo: 40 });

  verificar(r.ok && r.dados.percentual === 10 && r.dados.categoria === null && r.dados.valorMaximo === null, "desconto em %: ignora os campos que não são dele");
}

verificar(erro({ nome: "Sem pct", tipo: "DESCONTO_PERCENTUAL" }).includes("porcentagem"), "desconto sem porcentagem é recusado");
verificar(erro({ nome: "Zero", tipo: "DESCONTO_PERCENTUAL", percentual: 0 }).includes("porcentagem"), "0% é recusado");
verificar(erro({ nome: "Muito", tipo: "DESCONTO_PERCENTUAL", percentual: 101 }).includes("porcentagem"), "acima de 100% é recusado");
verificar(validarVantagem({ nome: "Tudo", tipo: "DESCONTO_PERCENTUAL", percentual: 100 }).ok, "100% é aceito");

// ---------- Entrega e geral ----------
verificar(validarVantagem({ nome: "Frete grátis", tipo: "ENTREGA_GRATIS", percentual: 50 }).ok, "entrega grátis vale");
verificar(erro({ nome: "A", tipo: "ENTREGA_GRATIS" }).includes("nome"), "nome curto é recusado");
verificar(erro({ nome: "x".repeat(61), tipo: "ENTREGA_GRATIS" }).includes("nome"), "nome longo é recusado");
verificar(erro({ nome: "Sem tipo" }).includes("tipo") && erro({ nome: "Tipo ruim", tipo: "OUTRO" }).includes("tipo"), "tipo ausente ou desconhecido é recusado");
verificar(erro(null).includes("nome") && erro("lixo").includes("nome"), "entrada estragada não quebra");

{
  const r = validarVantagem({ nome: "Desligada", tipo: "ENTREGA_GRATIS", ativa: false, ordem: 5000, descricao: "  " });

  verificar(r.ok && !r.dados.ativa && r.dados.ordem === 0 && r.dados.descricao === null, "desativar, ordem fora da faixa vira 0, descrição vazia vira nula");
}

// ---------- Descrição para o cliente ----------
verificar(descreverVantagem({ tipo: "ITEM_GRATIS", categoria: "HAMBÚRGUER" }) === "1 hambúrguer por conta da casa", "item grátis por categoria");
verificar(descreverVantagem({ tipo: "ITEM_GRATIS", categoria: "HAMBÚRGUER", valorMaximo: 45 }) === "1 hambúrguer por conta da casa (até 45)", "item grátis com teto, no preço premium");
verificar(descreverVantagem({ tipo: "ITEM_GRATIS" }) === "1 item por conta da casa", "item grátis sem categoria");
verificar(descreverVantagem({ tipo: "DESCONTO_PERCENTUAL", percentual: 10 }) === "10% de desconto nos itens do pedido" && descreverVantagem({ tipo: "DESCONTO_PERCENTUAL", percentual: 12.5 }) === "12,50% de desconto nos itens do pedido", "desconto em %");
verificar(descreverVantagem({ tipo: "ENTREGA_GRATIS" }) === "Entrega grátis" && descreverVantagem({ tipo: "X" }) === "Vantagem do clube", "entrega grátis e tipo desconhecido");

console.log(`✅ Testes do catálogo de vantagens passaram (${verificacoes} verificações).`);
