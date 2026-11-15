import {
  CHECKLIST_PADRAO,
  TIPOS_DE_CHECKLIST,
  VERIFICACOES_AUTOMATICAS,
  avaliarVerificacao,
  itemCumprido,
  leituraDeTemperatura,
  problemaNoItemDoModelo,
  situacaoDoChecklist,
  tiposDoDia,
  type FatosDoDia,
} from "./checklist";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

const SEM_PROBLEMAS: FatosDoDia = {
  leiturasDoFreezer: 1,
  leiturasDaGeladeira: 1,
  cartoesVencidos: [],
  abaixoDoMinimo: [],
};

function executarTestes(): void {
  // ---------- Lista inicial ----------
  verificar(TIPOS_DE_CHECKLIST.every((tipo) => CHECKLIST_PADRAO[tipo].length > 0), "cada tipo tem itens iniciais");

  const todos = TIPOS_DE_CHECKLIST.flatMap((tipo) => CHECKLIST_PADRAO[tipo]);

  verificar(todos.every((item) => problemaNoItemDoModelo(item) === null), "todos os itens iniciais são válidos");
  verificar(
    todos.filter((item) => item.verificacao).every((item) => VERIFICACOES_AUTOMATICAS.some((v) => v.chave === item.verificacao)),
    "toda verificação usada na lista existe"
  );
  verificar(CHECKLIST_PADRAO.FECHAMENTO.some((item) => item.verificacao === "TEMPERATURA_FREEZER:2"), "o fechamento pede a 2ª leitura de temperatura (norma)");
  verificar(CHECKLIST_PADRAO.ABERTURA.some((item) => item.titulo.includes("Higienizar")), "a abertura tem a higienização");
  verificar(CHECKLIST_PADRAO.FECHAMENTO.some((item) => item.titulo.includes("sobra do blend")), "o fechamento tem a sobra do blend");

  // ---------- Tipos do dia ----------
  verificar(tiposDoDia({ aberto: true, diaDeProducao: false }).join() === "ABERTURA,FECHAMENTO", "dia de venda: abertura e fechamento");
  verificar(tiposDoDia({ aberto: false, diaDeProducao: true }).join() === "PRODUCAO", "segunda e terça fechadas: produção");
  verificar(tiposDoDia({ aberto: false, diaDeProducao: false }).length === 0, "outro dia fechado: nenhum checklist");

  // ---------- Itens automáticos ----------
  verificar(avaliarVerificacao("TEMPERATURA_FREEZER:1", SEM_PROBLEMAS).ok, "1 leitura do freezer atende a 1ª");

  const segunda = avaliarVerificacao("TEMPERATURA_FREEZER:2", SEM_PROBLEMAS);

  verificar(!segunda.ok && segunda.detalhe.includes("1 de 2") && segunda.link === "/estoque/gavetas", "1 leitura não atende a 2ª e aponta onde registrar");
  verificar(avaliarVerificacao("TEMPERATURA_FREEZER:2", { ...SEM_PROBLEMAS, leiturasDoFreezer: 2 }).ok, "2 leituras atendem a 2ª");
  verificar(!avaliarVerificacao("TEMPERATURA_GELADEIRA:1", { ...SEM_PROBLEMAS, leiturasDaGeladeira: 0 }).ok, "sem leitura da geladeira não atende");
  verificar(avaliarVerificacao("TEMPERATURA_GELADEIRA:1", SEM_PROBLEMAS).ok, "a geladeira usa a própria contagem");
  verificar(avaliarVerificacao("CARTOES_VENCIDOS", SEM_PROBLEMAS).ok, "sem cartão vencido está ok");

  const vencidos = avaliarVerificacao("CARTOES_VENCIDOS", {
    ...SEM_PROBLEMAS,
    cartoesVencidos: [{ nome: "Blend" }, { nome: "Molho" }, { nome: "Bacon" }, { nome: "Queijo" }],
  });

  verificar(!vencidos.ok && vencidos.detalhe.includes("4 cartão(ões)") && vencidos.detalhe.includes("e mais 1") && vencidos.link === "/estoque/quadro", "cartões vencidos listam até 3 nomes e apontam o quadro");

  const minimo = avaliarVerificacao("ESTOQUE_MINIMO", {
    ...SEM_PROBLEMAS,
    abaixoDoMinimo: [{ nome: "Pão", saldo: 2, minimo: 10, unidade: "un" }],
  });

  verificar(!minimo.ok && minimo.detalhe.includes("Pão") && minimo.link === "/estoque", "estoque abaixo do mínimo lista e aponta o estoque");
  verificar(avaliarVerificacao("INVENTADA", SEM_PROBLEMAS).ok === false, "verificação desconhecida não passa");

  // ---------- Leitura de temperatura ----------
  verificar(leituraDeTemperatura("x", { freezer: -18, geladeira: null }).freezer && !leituraDeTemperatura("x", { freezer: -18, geladeira: null }).geladeira, "valores estruturados: só o freezer foi medido");
  verificar(leituraDeTemperatura("x", { freezer: null, geladeira: 4 }).geladeira && !leituraDeTemperatura("x", { freezer: null, geladeira: 4 }).freezer, "valores estruturados: só a geladeira");
  verificar(leituraDeTemperatura("Temperaturas: freezer -18 °C, geladeira 4 °C.").freezer && leituraDeTemperatura("Temperaturas: freezer -18 °C, geladeira 4 °C.").geladeira, "leitura antiga: as duas pelo texto");
  verificar(!leituraDeTemperatura("Temperaturas: freezer não medida °C, geladeira 4 °C.").freezer, "leitura antiga: freezer não medido");
  verificar(!leituraDeTemperatura("Temperaturas: freezer -18 °C, geladeira não medida °C.").geladeira, "leitura antiga: geladeira não medida");

  // ---------- Cumprido e situação ----------
  verificar(itemCumprido({ feito: true }), "marcado à mão está cumprido");
  verificar(itemCumprido({ feito: false, automatico: { ok: true, detalhe: "" } }), "verificado pelo sistema está cumprido");
  verificar(!itemCumprido({ feito: false, automatico: { ok: false, detalhe: "" } }), "automático com problema não está cumprido");
  verificar(!itemCumprido({ feito: false }), "item manual sem marca não está cumprido");

  const itens = [
    { titulo: "A", obrigatorio: true, cumprido: true },
    { titulo: "B", obrigatorio: true, cumprido: false },
    { titulo: "C", obrigatorio: false, cumprido: false },
    { titulo: "D", obrigatorio: false, cumprido: true },
  ];

  const situacao = situacaoDoChecklist(itens);

  verificar(situacao.total === 4 && situacao.cumpridos === 2 && situacao.percentual === 50, "2 de 4, 50%");
  verificar(!situacao.podeConcluir && situacao.obrigatoriosPendentes.join() === "B", "falta o obrigatório B");
  verificar(situacaoDoChecklist(itens.map((item) => (item.titulo === "B" ? { ...item, cumprido: true } : item))).podeConcluir, "só o item opcional pendente não impede de concluir");
  verificar(situacaoDoChecklist([]).podeConcluir && situacaoDoChecklist([]).percentual === 100, "sem itens, pode concluir");

  // ---------- Cadastro ----------
  verificar(problemaNoItemDoModelo({ titulo: "  ", obrigatorio: true }) !== null, "título vazio");
  verificar(problemaNoItemDoModelo({ titulo: "x".repeat(141), obrigatorio: true }) !== null, "título longo");
  verificar((problemaNoItemDoModelo({ titulo: "Ok", obrigatorio: true, verificacao: "XYZ" }) ?? "").includes("inválida"), "verificação inventada");
  verificar(problemaNoItemDoModelo({ titulo: "Ok", obrigatorio: false, verificacao: "CARTOES_VENCIDOS" }) === null, "item automático válido");
}

executarTestes();

console.log(`✅ Testes do checklist passaram (${verificacoes} verificações).`);
