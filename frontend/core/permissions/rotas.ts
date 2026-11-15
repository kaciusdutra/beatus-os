import type { Permission } from "./permissionTypes";

// A tabela central de quem pode acessar o quê, por tela e por rota da API.
// É aplicada em um só lugar (proxy.ts), antes de qualquer tela ou rota rodar,
// então uma rota nova nunca fica aberta por esquecimento: o que não tem regra
// cai no padrão mais restrito (só quem pode gerenciar as configurações).

export type Exigencia =
  | { tipo: "PUBLICA" }
  | { tipo: "AUTENTICADA" }
  | { tipo: "PERMISSAO"; qualquer: Permission[] };

type Metodos = "LEITURA" | "ESCRITA";

interface Regra {
  // Segmentos do caminho. ":x" aceita qualquer valor naquele lugar.
  padrao: string;
  // Sem isso, vale para qualquer método. LEITURA = GET e HEAD; ESCRITA = o resto.
  metodos?: Metodos;
  // Só o caminho exato; senão vale também para tudo que vem depois.
  exato?: boolean;
  exige: Exigencia;
}

const publica: Exigencia = { tipo: "PUBLICA" };

const autenticada: Exigencia = { tipo: "AUTENTICADA" };

function p(...qualquer: Permission[]): Exigencia {
  return { tipo: "PERMISSAO", qualquer };
}

// Padrão para o que não tem regra: o mais restrito.
export const EXIGENCIA_PADRAO: Exigencia = p("configuracoes.gerenciar");

const REGRAS: Regra[] = [
  // ---------- Sem login ----------
  { padrao: "/login", exige: publica },
  { padrao: "/primeiro-acesso", exige: publica },
  { padrao: "/api/auth/login", exige: publica },
  { padrao: "/api/auth/primeiro-acesso", exige: publica },
  { padrao: "/api/auth/status", exige: publica },
  // O site (cardápio online) é público. Na API pública só entra leitura: qualquer
  // escrita futura (checkout) precisa de regra própria e cai no padrão restrito até lá.
  { padrao: "/cardapio", exige: publica },
  { padrao: "/api/publico", metodos: "LEITURA", exige: publica },

  // ---------- Qualquer pessoa que entrou ----------
  { padrao: "/api/auth", exige: autenticada },
  { padrao: "/conta", exige: autenticada },
  { padrao: "/acesso-negado", exige: autenticada },
  // O sistema todo consulta o horário e o estado do checklist para saber se a operação está aberta.
  { padrao: "/api/operacao/horarios", metodos: "LEITURA", exige: autenticada },
  { padrao: "/api/operacao/checklist/estado", metodos: "LEITURA", exige: autenticada },

  // ---------- Telas ----------
  { padrao: "/", exato: true, exige: p("dashboard.visualizar") },
  { padrao: "/atividades", exige: p("configuracoes.visualizar") },
  { padrao: "/celular", exige: p("operacao.visualizar") },
  { padrao: "/q", exige: p("operacao.visualizar") },
  { padrao: "/clientes", exige: p("pdv.visualizar") },
  { padrao: "/compras", exige: p("compras.visualizar") },
  { padrao: "/configuracoes", exige: p("configuracoes.visualizar") },
  { padrao: "/configuracoes/usuarios", exige: p("configuracoes.gerenciar") },
  { padrao: "/cozinha", exige: p("producao.visualizar", "pedidos.visualizar") },
  { padrao: "/estoque", exige: p("estoque.visualizar") },
  { padrao: "/fichas", exige: p("financeiro.visualizar") },
  { padrao: "/fichas/nova", exige: p("financeiro.gerenciar") },
  // A ficha de produção é a que o funcionário lê na cozinha (nunca mostra custo).
  { padrao: "/fichas/:x/producao", exige: p("producao.visualizar", "financeiro.visualizar") },
  { padrao: "/financeiro", exige: p("financeiro.visualizar") },
  { padrao: "/insumos", exige: p("financeiro.visualizar", "estoque.gerenciar") },
  { padrao: "/integracoes", exige: p("configuracoes.visualizar") },
  { padrao: "/inteligencia", exige: p("inteligencia.visualizar") },
  { padrao: "/operacao", exige: p("operacao.visualizar") },
  { padrao: "/operacao/editar", exige: p("configuracoes.gerenciar") },
  { padrao: "/operacao/horarios", exige: p("configuracoes.visualizar") },
  { padrao: "/pdv", exige: p("pdv.visualizar") },
  { padrao: "/pedidos", exige: p("pedidos.visualizar") },
  { padrao: "/producao", exige: p("producao.visualizar") },

  // ---------- API ----------
  { padrao: "/api/atividades", exige: p("configuracoes.visualizar") },
  { padrao: "/api/beatriz", exige: p("inteligencia.visualizar") },
  { padrao: "/api/cep", exige: p("pdv.visualizar") },
  { padrao: "/api/clientes", metodos: "LEITURA", exige: p("pdv.visualizar") },
  { padrao: "/api/clientes", metodos: "ESCRITA", exige: p("pdv.gerenciar") },
  { padrao: "/api/compras", exige: p("compras.visualizar") },
  { padrao: "/api/fornecedores", exige: p("compras.visualizar") },
  { padrao: "/api/custos-fixos", metodos: "LEITURA", exige: p("financeiro.visualizar") },
  { padrao: "/api/custos-fixos", metodos: "ESCRITA", exige: p("financeiro.gerenciar") },
  { padrao: "/api/dashboard", exige: p("financeiro.visualizar") },

  { padrao: "/api/estoque", metodos: "LEITURA", exige: p("estoque.visualizar") },
  { padrao: "/api/estoque", metodos: "ESCRITA", exige: p("estoque.gerenciar") },
  // Ações do dia a dia da cozinha: quem produz também pode.
  { padrao: "/api/estoque/quadro/mover", metodos: "ESCRITA", exige: p("estoque.gerenciar", "producao.gerenciar") },
  { padrao: "/api/estoque/quadro/descartar", metodos: "ESCRITA", exige: p("estoque.gerenciar", "producao.gerenciar") },
  { padrao: "/api/estoque/perda", metodos: "ESCRITA", exige: p("estoque.gerenciar", "producao.gerenciar") },
  { padrao: "/api/estoque/configuracao", metodos: "ESCRITA", exige: p("estoque.gerenciar", "producao.gerenciar") },
  { padrao: "/api/estoque/etiqueta/impressao", metodos: "ESCRITA", exige: p("estoque.gerenciar", "producao.gerenciar") },

  { padrao: "/api/fichas", metodos: "LEITURA", exige: p("producao.visualizar", "financeiro.visualizar", "estoque.visualizar") },
  { padrao: "/api/fichas", metodos: "ESCRITA", exige: p("financeiro.gerenciar") },
  { padrao: "/api/financeiro", metodos: "LEITURA", exige: p("financeiro.visualizar") },
  { padrao: "/api/financeiro", metodos: "ESCRITA", exige: p("financeiro.gerenciar") },
  { padrao: "/api/impressao", exige: p("pedidos.visualizar", "producao.visualizar", "pdv.visualizar") },
  // A cozinha lê insumos para montar a ficha de produção; o servidor tira os custos de quem não vê o financeiro.
  { padrao: "/api/insumos", metodos: "LEITURA", exige: p("financeiro.visualizar", "estoque.gerenciar", "producao.visualizar") },
  { padrao: "/api/insumos", metodos: "ESCRITA", exige: p("financeiro.gerenciar", "estoque.gerenciar") },
  { padrao: "/api/integracoes", metodos: "LEITURA", exige: p("configuracoes.visualizar") },
  { padrao: "/api/integracoes", metodos: "ESCRITA", exige: p("configuracoes.gerenciar") },

  { padrao: "/api/operacao", exige: p("operacao.visualizar") },
  { padrao: "/api/operacao/horarios", metodos: "ESCRITA", exige: p("configuracoes.gerenciar") },
  { padrao: "/api/operacao/checklist/modelo", metodos: "ESCRITA", exige: p("configuracoes.gerenciar") },

  { padrao: "/api/pedidos", metodos: "LEITURA", exige: p("pedidos.visualizar", "producao.visualizar", "pdv.visualizar") },
  { padrao: "/api/pedidos", metodos: "ESCRITA", exige: p("pdv.gerenciar", "pedidos.gerenciar") },
  { padrao: "/api/pedidos/calcular", exige: p("pdv.visualizar") },
  // A cozinha muda o status (preparo, pronto). Cancelar é conferido dentro da rota.
  { padrao: "/api/pedidos/:x/status", metodos: "ESCRITA", exige: p("pedidos.gerenciar", "producao.gerenciar") },
  { padrao: "/api/pedidos/:x/ticket", exige: p("pedidos.visualizar", "producao.visualizar") },
  { padrao: "/api/pedidos/:x/consumo", exige: p("pedidos.visualizar", "producao.visualizar") },

  { padrao: "/api/pix/cobranca", exige: p("pdv.gerenciar", "financeiro.gerenciar") },
  { padrao: "/api/pix/configuracao", metodos: "LEITURA", exige: p("financeiro.visualizar", "pdv.visualizar") },
  { padrao: "/api/pix/configuracao", metodos: "ESCRITA", exige: p("financeiro.gerenciar") },
  { padrao: "/api/pix/teste", exige: p("pdv.gerenciar", "financeiro.gerenciar") },
  { padrao: "/api/precificacao", metodos: "LEITURA", exige: p("financeiro.visualizar", "pdv.visualizar") },
  { padrao: "/api/precificacao", metodos: "ESCRITA", exige: p("financeiro.gerenciar") },
  { padrao: "/api/produtos", metodos: "LEITURA", exige: p("pdv.visualizar", "financeiro.visualizar", "producao.visualizar") },
  { padrao: "/api/produtos", metodos: "ESCRITA", exige: p("financeiro.gerenciar") },
  { padrao: "/api/producao", metodos: "LEITURA", exige: p("producao.visualizar") },
  { padrao: "/api/producao", metodos: "ESCRITA", exige: p("producao.gerenciar") },
  { padrao: "/api/qr", exige: p("operacao.visualizar") },
  { padrao: "/api/usuarios", exige: p("configuracoes.gerenciar") },
];

function segmentos(caminho: string): string[] {
  return caminho.split("/").filter(Boolean);
}

function casa(regra: Regra, partes: string[]): boolean {
  const alvo = segmentos(regra.padrao);

  if (regra.exato) {
    return alvo.length === partes.length && alvo.every((parte, indice) => parte === ":x" || parte === partes[indice]);
  }

  return alvo.length <= partes.length && alvo.every((parte, indice) => parte === ":x" || parte === partes[indice]);
}

export interface Resolucao {
  exige: Exigencia;
  // Falso quando nenhuma regra cobriu o caminho e valeu o padrão restrito.
  explicita: boolean;
}

// A regra mais específica ganha (mais segmentos; empate: a que nomeia o método).
export function exigenciaDaRota(metodo: string, caminho: string): Resolucao {
  const tipo: Metodos = metodo === "GET" || metodo === "HEAD" ? "LEITURA" : "ESCRITA";

  const partes = segmentos(caminho.split("?")[0]);

  let melhor: Regra | null = null;

  let melhorPontos = -1;

  for (const regra of REGRAS) {
    if (regra.metodos && regra.metodos !== tipo) {
      continue;
    }

    if (!casa(regra, partes)) {
      continue;
    }

    const pontos = segmentos(regra.padrao).length * 10 + (regra.metodos ? 1 : 0) + (regra.exato ? 2 : 0);

    if (pontos > melhorPontos) {
      melhor = regra;
      melhorPontos = pontos;
    }
  }

  return melhor ? { exige: melhor.exige, explicita: true } : { exige: EXIGENCIA_PADRAO, explicita: false };
}

// Para a lista de papéis: quem tem pelo menos uma das permissões exigidas.
export function permissaoAtende(exige: Exigencia, temPermissao: (permissao: Permission) => boolean): boolean {
  if (exige.tipo !== "PERMISSAO") {
    return true;
  }

  return exige.qualquer.some(temPermissao);
}
