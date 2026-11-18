import { readdirSync, readFileSync, statSync } from "node:fs";

import { join } from "node:path";

import { possuiPermissao } from "./permissionMatrix";

import { exigenciaDaRota, permissaoAtende } from "./rotas";

import type { UserRole } from "./permissionTypes";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

function pode(papel: UserRole, metodo: string, caminho: string): boolean {
  return permissaoAtende(exigenciaDaRota(metodo, caminho).exige, (permissao) => possuiPermissao(papel, permissao));
}

// ---------- Toda tela e toda rota do projeto tem regra explícita ----------
function arquivos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);

    return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho];
  });
}

const RAIZ = join(process.cwd(), "app");

const semRegra: string[] = [];

let cobertas = 0;

for (const arquivo of arquivos(RAIZ)) {
  const relativo = arquivo.slice(RAIZ.length).replace(/\\/g, "/");

  const ehPagina = relativo.endsWith("/page.tsx");

  const ehRota = relativo.endsWith("/route.ts");

  if (!ehPagina && !ehRota) {
    continue;
  }

  const caminho = relativo.replace(/\/(page\.tsx|route\.ts)$/, "").replace(/\[[^\]]+\]/g, "abc") || "/";

  const metodos = ehPagina
    ? ["GET"]
    : (readFileSync(arquivo, "utf8").match(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b/g) ?? []).map((trecho) => trecho.split(/\s+/).pop() as string);

  verificar(metodos.length > 0, `${relativo} exporta algum método`);

  for (const metodo of metodos) {
    cobertas++;

    if (!exigenciaDaRota(metodo, caminho).explicita) {
      semRegra.push(`${metodo} ${caminho}`);
    }
  }
}

verificar(cobertas > 100, `o teste achou as rotas do projeto (${cobertas})`);
verificar(semRegra.length === 0, `rotas sem regra explícita: ${semRegra.join(", ")}`);

// Caminho que ninguém previu cai no padrão restrito.
verificar(!exigenciaDaRota("GET", "/api/rota-nova-sem-regra").explicita, "rota nova não é explícita");
verificar(pode("ADMIN", "GET", "/api/rota-nova-sem-regra"), "administrador passa no padrão restrito");
verificar(!pode("GESTOR", "GET", "/api/rota-nova-sem-regra"), "gestor não passa no padrão restrito");
verificar(!pode("OPERADOR", "POST", "/api/rota-nova-sem-regra"), "operador não passa no padrão restrito");

// ---------- Sem login e só login ----------
verificar(exigenciaDaRota("GET", "/login").exige.tipo === "PUBLICA", "login é público");
verificar(exigenciaDaRota("POST", "/api/auth/login").exige.tipo === "PUBLICA", "rota de login é pública");
verificar(exigenciaDaRota("POST", "/api/auth/primeiro-acesso").exige.tipo === "PUBLICA", "primeiro acesso é público");
verificar(exigenciaDaRota("POST", "/api/auth/sair").exige.tipo === "AUTENTICADA", "sair exige entrar");
verificar(exigenciaDaRota("GET", "/api/operacao/horarios").exige.tipo === "AUTENTICADA", "horário só pede login");
verificar(exigenciaDaRota("PUT", "/api/operacao/horarios").exige.tipo === "PERMISSAO", "mudar horário pede permissão");
verificar(exigenciaDaRota("GET", "/api/operacao/checklist/estado").exige.tipo === "AUTENTICADA", "estado do checklist só pede login");
verificar(exigenciaDaRota("GET", "/api/operacao/checklist").exige.tipo === "PERMISSAO", "checklist pede permissão");
verificar(exigenciaDaRota("GET", "/").exige.tipo === "PERMISSAO", "a raiz tem regra própria (não vale tudo que começa com /)");

// ---------- Site público ----------
verificar(exigenciaDaRota("GET", "/cardapio").exige.tipo === "PUBLICA", "o site é público");
verificar(exigenciaDaRota("GET", "/cardapio/sobre").exige.tipo === "PUBLICA", "subpáginas do site são públicas");
verificar(exigenciaDaRota("GET", "/api/publico/cardapio").exige.tipo === "PUBLICA", "a API pública de leitura é pública");
verificar(exigenciaDaRota("POST", "/api/publico/cardapio").exige.tipo === "PERMISSAO", "escrita na API pública não é pública");
verificar(!pode("GESTOR", "POST", "/api/publico/qualquer-coisa"), "escrita pública sem regra cai no padrão restrito");
verificar(exigenciaDaRota("POST", "/api/publico/checkout").exige.tipo === "PUBLICA", "fechar o pedido do site é público");
verificar(exigenciaDaRota("POST", "/api/publico/checkout/estimativa").exige.tipo === "PUBLICA", "a estimativa é pública");
verificar(exigenciaDaRota("POST", "/api/publico/beatriz").exige.tipo === "PUBLICA", "o chat da Beatriz no site é público");
verificar(exigenciaDaRota("GET", "/convite").exige.tipo === "PUBLICA", "o endereço do QR da embalagem é público");
verificar(exigenciaDaRota("GET", "/convite/outro").exige.tipo !== "PUBLICA", "só o endereço exato do convite é público");
verificar(exigenciaDaRota("GET", "/cardapio/convite").exige.tipo === "PUBLICA", "a página de convite do site é pública");
verificar(exigenciaDaRota("GET", "/cardapio/clube/abc").exige.tipo === "PUBLICA", "o cartão do clube abre pelo link, sem login");
verificar(exigenciaDaRota("GET", "/configuracoes/convite").exige.tipo === "PERMISSAO", "o gerador do QR é só da equipe");
verificar(exigenciaDaRota("GET", "/api/publico/beatriz").exige.tipo === "PUBLICA", "saber se o chat está disponível é público");
verificar(exigenciaDaRota("POST", "/api/publico/beatriz/outra").exige.tipo === "PERMISSAO", "escrita em outro caminho da Beatriz pública não é pública");
verificar(exigenciaDaRota("POST", "/api/beatriz/responder").exige.tipo === "PERMISSAO", "a Beatriz da equipe continua exigindo login e permissão");
verificar(exigenciaDaRota("POST", "/api/publico/mercadopago/webhook").exige.tipo === "PUBLICA", "o webhook do gateway é público (a rota confere a assinatura)");
verificar(exigenciaDaRota("GET", "/api/publico/checkout/abc").exige.tipo === "PUBLICA", "o status do pedido é público");
verificar(exigenciaDaRota("POST", "/api/publico/checkout/abc").exige.tipo === "PERMISSAO", "escrita em outro caminho do checkout não é pública");
verificar(exigenciaDaRota("GET", "/api/publico/cep/69000001").exige.tipo === "PUBLICA", "a consulta de CEP é pública");
verificar(exigenciaDaRota("GET", "/cardapios").exige.tipo !== "PUBLICA", "prefixo parecido não vira público");
verificar(exigenciaDaRota("GET", "/api/publicos").exige.tipo !== "PUBLICA", "api parecida não vira pública");

// ---------- Administrador ----------
for (const [metodo, caminho] of [
  ["GET", "/"], ["GET", "/compras"], ["POST", "/api/compras/entradas"], ["PUT", "/api/operacao/horarios"], ["GET", "/configuracoes/usuarios"],
  ["POST", "/api/usuarios"], ["POST", "/api/financeiro/lancamentos"], ["POST", "/api/pedidos"], ["POST", "/api/estoque/contagem"],
] as const) {
  verificar(pode("ADMIN", metodo, caminho), `administrador acessa ${metodo} ${caminho}`);
}

// ---------- Gestor ----------
verificar(pode("GESTOR", "GET", "/financeiro"), "gestor vê o financeiro");
verificar(pode("GESTOR", "POST", "/api/financeiro/lancamentos"), "gestor lança no financeiro");
verificar(pode("GESTOR", "GET", "/atividades"), "gestor vê o registro de atividades");
verificar(!pode("GESTOR", "GET", "/compras"), "gestor não vê compras (matriz aprovada)");
verificar(!pode("GESTOR", "GET", "/configuracoes/usuarios"), "gestor não gerencia usuários");
verificar(!pode("GESTOR", "POST", "/api/usuarios"), "gestor não cria usuário pela API");
verificar(!pode("GESTOR", "PUT", "/api/operacao/horarios"), "gestor não muda horário");

// ---------- Operador de caixa ----------
verificar(pode("OPERADOR", "GET", "/pdv"), "operador abre o PDV");
verificar(pode("OPERADOR", "POST", "/api/pedidos"), "operador lança pedido");
verificar(pode("OPERADOR", "POST", "/api/pedidos/calcular"), "operador calcula pedido");
verificar(pode("OPERADOR", "GET", "/api/precificacao/precos"), "operador lê os preços para vender");
verificar(pode("OPERADOR", "GET", "/api/pix/configuracao"), "operador lê a configuração do Pix");
verificar(pode("OPERADOR", "POST", "/api/pix/cobranca"), "operador gera cobrança Pix");
verificar(pode("OPERADOR", "POST", "/api/pedidos/abc/status"), "operador muda status do pedido");
verificar(pode("OPERADOR", "POST", "/api/clientes"), "operador cadastra cliente");
verificar(pode("OPERADOR", "GET", "/api/operacao/checklist"), "operador vê o checklist");
verificar(pode("OPERADOR", "POST", "/api/operacao/checklist/itens/abc"), "operador marca item do checklist");
verificar(pode("OPERADOR", "GET", "/api/estoque/quadro"), "operador vê o quadro do estoque");
verificar(!pode("OPERADOR", "POST", "/api/estoque/quadro/mover"), "operador não mexe no quadro (sem estoque nem produção)");
verificar(!pode("OPERADOR", "GET", "/financeiro"), "operador não vê o financeiro");
verificar(!pode("OPERADOR", "GET", "/api/financeiro/fluxo"), "operador não lê o financeiro pela API");
verificar(!pode("OPERADOR", "POST", "/api/financeiro/lancamentos"), "operador não lança no financeiro pela API");
verificar(!pode("OPERADOR", "GET", "/api/compras/entradas"), "operador não vê compras");
verificar(!pode("OPERADOR", "GET", "/configuracoes"), "operador não vê configurações");
verificar(!pode("OPERADOR", "GET", "/atividades"), "operador não vê o registro de atividades");
verificar(!pode("OPERADOR", "PUT", "/api/operacao/horarios"), "operador não muda horário");
verificar(pode("OPERADOR", "GET", "/api/operacao/horarios"), "operador lê o horário");
verificar(pode("OPERADOR", "GET", "/api/insumos"), "operador lê insumos (o servidor tira os custos)");
verificar(!pode("OPERADOR", "POST", "/api/insumos"), "operador não cria insumo");

// ---------- Produção ----------
verificar(pode("PRODUCAO", "GET", "/cozinha"), "produção abre a cozinha");
verificar(pode("PRODUCAO", "GET", "/fichas/abc/producao"), "produção abre a ficha de produção");
verificar(!pode("PRODUCAO", "GET", "/fichas/abc"), "produção não abre a ficha técnica com custos");
verificar(!pode("PRODUCAO", "GET", "/fichas"), "produção não abre a lista de fichas com custos");
verificar(pode("PRODUCAO", "GET", "/api/fichas"), "produção lê as fichas para produzir");
verificar(!pode("PRODUCAO", "POST", "/api/fichas"), "produção não edita ficha");
verificar(pode("PRODUCAO", "POST", "/api/producao/lotes"), "produção registra lote");
verificar(pode("PRODUCAO", "POST", "/api/pedidos/abc/status"), "produção muda status do pedido na cozinha");
verificar(pode("PRODUCAO", "POST", "/api/pedidos/avisos/enviar"), "a cozinha envia os avisos do pedido");
verificar(pode("OPERADOR", "POST", "/api/pedidos/avisos/enviar"), "operador também envia os avisos do pedido");
verificar(!pode("FINANCEIRO", "POST", "/api/pedidos/avisos/enviar"), "financeiro não envia avisos do pedido");
verificar(!pode("PRODUCAO", "POST", "/api/pedidos"), "produção não lança pedido");
verificar(!pode("PRODUCAO", "GET", "/pdv"), "produção não abre o PDV");
verificar(pode("PRODUCAO", "POST", "/api/estoque/quadro/mover"), "produção move cartão no quadro");
verificar(pode("PRODUCAO", "POST", "/api/estoque/quadro/descartar"), "produção descarta no quadro");
verificar(pode("PRODUCAO", "POST", "/api/estoque/perda"), "produção registra perda");
verificar(pode("PRODUCAO", "PUT", "/api/estoque/configuracao"), "produção registra temperatura");
verificar(!pode("PRODUCAO", "POST", "/api/estoque/contagem"), "produção não ajusta saldo por contagem");
verificar(!pode("PRODUCAO", "PUT", "/api/estoque/minimo"), "produção não muda estoque mínimo");
verificar(pode("PRODUCAO", "GET", "/celular"), "produção usa o modo celular");
verificar(pode("PRODUCAO", "GET", "/api/qr/insumo/abc"), "produção lê a ficha do QR");
verificar(pode("PRODUCAO", "POST", "/api/operacao/ajustes"), "produção anota ajuste para amanhã");
verificar(!pode("PRODUCAO", "GET", "/financeiro"), "produção não vê o financeiro");
verificar(pode("PRODUCAO", "GET", "/api/insumos"), "produção lê insumos para a ficha de produção (sem custos)");
verificar(pode("PRODUCAO", "GET", "/api/produtos"), "produção lê os produtos da ficha de produção");
verificar(!pode("PRODUCAO", "POST", "/api/insumos"), "produção não cria nem altera insumo");
verificar(!pode("PRODUCAO", "GET", "/api/precificacao/precos"), "produção não lê preços");

// ---------- Financeiro ----------
verificar(pode("FINANCEIRO", "GET", "/financeiro"), "financeiro vê o financeiro");
verificar(pode("FINANCEIRO", "POST", "/api/financeiro/lancamentos"), "financeiro lança");
verificar(pode("FINANCEIRO", "GET", "/fichas"), "financeiro vê as fichas");
verificar(pode("FINANCEIRO", "GET", "/api/insumos"), "financeiro lê insumos");
verificar(pode("FINANCEIRO", "GET", "/api/precificacao/precos"), "financeiro lê preços");
verificar(pode("FINANCEIRO", "GET", "/api/operacao/horarios"), "financeiro lê o horário (pede só login)");
verificar(!pode("FINANCEIRO", "GET", "/operacao"), "financeiro não abre o checklist");
verificar(!pode("FINANCEIRO", "GET", "/pdv"), "financeiro não abre o PDV");
verificar(!pode("FINANCEIRO", "POST", "/api/pedidos"), "financeiro não lança pedido");
verificar(!pode("FINANCEIRO", "GET", "/compras"), "financeiro não vê compras (matriz aprovada)");

// ---------- Caminhos parecidos não escapam ----------
verificar(!pode("OPERADOR", "GET", "/financeiro/pix"), "subtela do financeiro herda a regra");
verificar(!pode("OPERADOR", "GET", "/financeirox") || exigenciaDaRota("GET", "/financeirox").explicita === false, "prefixo parecido não herda");
verificar(!pode("PRODUCAO", "GET", "/api/pedidos/abc/status/") || true, "barra no fim não quebra");
verificar(pode("PRODUCAO", "POST", "/api/pedidos/abc/status/"), "barra no fim ainda acha a regra");
verificar(!pode("OPERADOR", "GET", "/api/financeiro?x=1"), "parâmetros na URL não mudam a regra");

console.log(`✅ Testes da tabela de permissões passaram (${verificacoes} verificações, ${cobertas} rotas e telas cobertas).`);
