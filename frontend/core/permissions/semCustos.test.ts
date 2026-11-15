import { paraOPapel, podeVerCustos, removerCustos } from "./semCustos";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

const insumo = { id: "i1", nome: "Blend", quantidadeCompra: 10, precoCompra: 99.9, custoUnitario: 9.99, perdaLimpeza: 5, ativo: true };

const limpo = removerCustos(insumo) as Record<string, unknown>;

verificar(!("precoCompra" in limpo) && !("custoUnitario" in limpo), "tira preço e custo do insumo");
verificar(limpo.nome === "Blend" && limpo.quantidadeCompra === 10 && limpo.perdaLimpeza === 5 && limpo.ativo === true, "mantém nome, quantidade e perda");

const saldo = { nome: "Pão", saldo: 12, minimo: 20, custoUnitario: 1.2, valor: 14.4, unidade: "un" };

verificar(JSON.stringify(Object.keys(removerCustos(saldo))) === JSON.stringify(["nome", "saldo", "minimo", "unidade"]), "saldo sem custo e sem valor");

// Listas e objetos aninhados.
const ficha = { id: "f1", nome: "Burger", itens: [{ insumoId: "i1", quantidade: 160, custoCalculado: 5.5 }], precoVenda: 30, margemReferencia: 40 };

const fichaLimpa = removerCustos(ficha) as { itens: Record<string, unknown>[] } & Record<string, unknown>;

verificar(!("precoVenda" in fichaLimpa) && !("margemReferencia" in fichaLimpa), "tira preço e margem da ficha");
verificar(!("custoCalculado" in fichaLimpa.itens[0]) && fichaLimpa.itens[0].quantidade === 160, "tira custo dos itens, mantém a quantidade");
verificar(Array.isArray(removerCustos([insumo, insumo])) && (removerCustos([insumo, insumo]) as unknown[]).length === 2, "lista continua lista");

// Valores simples e datas passam como estão.
const data = new Date();

verificar(removerCustos(null) === null && removerCustos(5) === 5 && removerCustos("x") === "x", "valores simples");
verificar(removerCustos(data) === data, "data intacta");
verificar(removerCustos({ criadoEm: data }).criadoEm === data, "data dentro de objeto intacta");

// Não altera o original.
verificar(insumo.precoCompra === 99.9, "o original não é mexido");

// Por perfil.
verificar(podeVerCustos("ADMIN") && podeVerCustos("GESTOR") && podeVerCustos("FINANCEIRO"), "admin, gestor e financeiro veem custos");
verificar(!podeVerCustos("PRODUCAO") && !podeVerCustos("OPERADOR") && !podeVerCustos(undefined), "produção, operador e sem perfil não veem");
verificar("custoUnitario" in (paraOPapel("ADMIN", insumo) as object), "administrador recebe tudo");
verificar(!("custoUnitario" in (paraOPapel("PRODUCAO", insumo) as object)), "produção recebe sem custo");

console.log(`✅ Testes de custos escondidos passaram (${verificacoes} verificações).`);
