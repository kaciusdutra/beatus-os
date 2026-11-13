import type { PrecificacaoRepositoryPort } from "../repositories/precificacaoRepositoryPort";

import {
  PARAMETROS_PADRAO,
  type CanalDeVenda,
  type CanalPrecificacaoDados,
  type ParametrosPrecificacao,
  type PrecoDoProduto,
} from "../types/precificacao";

import { PrecificacaoService } from "./precificacaoService";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

class RepositorioFake implements PrecificacaoRepositoryPort {
  parametros: ParametrosPrecificacao = { ...PARAMETROS_PADRAO };

  canais: CanalPrecificacaoDados[] = [];

  precos: PrecoDoProduto[] = [];

  async buscarParametros() {
    return this.parametros;
  }

  async salvarParametros(
    novos: Omit<ParametrosPrecificacao, "pedidosMensaisEstimados">
  ) {
    this.parametros = { ...this.parametros, ...novos };
  }

  async listarCanais() {
    return this.canais;
  }

  async salvarCanal(canal: CanalPrecificacaoDados) {
    this.canais = [
      ...this.canais.filter((item) => item.canal !== canal.canal),
      canal,
    ];
  }

  async listarPrecos() {
    return this.precos;
  }

  async salvarPreco(preco: PrecoDoProduto) {
    this.precos = [
      ...this.precos.filter(
        (item) =>
          !(item.produtoId === preco.produtoId && item.canal === preco.canal)
      ),
      preco,
    ];
  }

  async removerPreco(produtoId: string, canal: CanalDeVenda) {
    this.precos = this.precos.filter(
      (item) => !(item.produtoId === produtoId && item.canal === canal)
    );
  }
}

async function esperarErro(
  acao: () => Promise<unknown>,
  trecho: string
): Promise<void> {
  try {
    await acao();
  } catch (erro) {
    verificar(
      erro instanceof Error && erro.message.includes(trecho),
      `esperava erro com "${trecho}"`
    );

    return;
  }

  throw new Error(`Falha: esperava erro com "${trecho}".`);
}

async function executarTestes(): Promise<void> {
  const repositorio = new RepositorioFake();

  const service = new PrecificacaoService(repositorio);

  // Padrão: margens do Kacius e margem mínima de 20%
  const padrao = await service.buscarParametros();

  verificar(
    padrao.margensCenario.join(",") === "20,25,30,35" &&
      padrao.margemMinimaPercentual === 20,
    "margens e mínima padrão"
  );

  // Cinco canais, mesmo sem nada salvo
  const canais = await service.listarCanais();

  verificar(canais.length === 5, "cinco canais de venda");

  verificar(
    canais.every((canal) => canal.comissaoPercentual === 0),
    "canais começam sem percentuais"
  );

  // Salvar canal e ler de volta
  await service.salvarCanal({
    canal: "IFOOD",
    comissaoPercentual: 25.2,
    taxaMensal: 150,
    pedidosMensaisEstimados: 300,
    ativo: true,
  });

  const ifood = (await service.listarCanais()).find(
    (canal) => canal.canal === "IFOOD"
  );

  verificar(
    ifood?.comissaoPercentual === 25.2 && ifood.taxaMensal === 150,
    "iFood salvo com comissão e taxa mensal"
  );

  // Parâmetros
  const salvos = await service.salvarParametros({
    impostoPercentual: 4,
    taxaPagamentoPercentual: 1.5,
    embalagemPedido: 1.8,
    itensPorPedidoEstimados: 1.5,
    margensCenario: "35, 20, 25, 30",
    margemMinimaPercentual: 20,
  });

  verificar(
    salvos.margensCenario.join(",") === "20,25,30,35" &&
      salvos.embalagemPedido === 1.8,
    "parâmetros salvos, margens ordenadas"
  );

  // Preços
  await service.salvarPreco("produto-1", "SITE", 44.9);

  await service.salvarPreco("produto-1", "SITE", 46.9);

  verificar(
    (await service.listarPrecos()).length === 1 &&
      (await service.listarPrecos())[0].preco === 46.9,
    "o preço do mesmo produto e canal é substituído"
  );

  // Referência de custo e margem guardada junto com o preço
  await service.salvarPreco("produto-1", "SITE", 49.9, {
    custoReferencia: 14,
    margemReferencia: 30.1,
  });

  const comReferencia = (await service.listarPrecos())[0];

  verificar(
    comReferencia.custoReferencia === 14 &&
      comReferencia.margemReferencia === 30.1,
    "a referência acompanha o preço"
  );

  await service.salvarPreco("produto-1", "SITE", null);

  verificar(
    (await service.listarPrecos()).length === 0,
    "preço vazio remove"
  );

  // Validações
  await esperarErro(
    () =>
      service.salvarParametros({
        impostoPercentual: 100,
        taxaPagamentoPercentual: 0,
        embalagemPedido: 0,
        itensPorPedidoEstimados: 1,
        margensCenario: "20",
        margemMinimaPercentual: 20,
      }),
    "O imposto"
  );

  await esperarErro(
    () =>
      service.salvarParametros({
        impostoPercentual: 0,
        taxaPagamentoPercentual: 0,
        embalagemPedido: -1,
        itensPorPedidoEstimados: 1,
        margensCenario: "20",
        margemMinimaPercentual: 20,
      }),
    "embalagem"
  );

  await esperarErro(
    () =>
      service.salvarParametros({
        impostoPercentual: 0,
        taxaPagamentoPercentual: 0,
        embalagemPedido: 0,
        itensPorPedidoEstimados: 0.5,
        margensCenario: "20",
        margemMinimaPercentual: 20,
      }),
    "produtos por pedido"
  );

  await esperarErro(
    () =>
      service.salvarParametros({
        impostoPercentual: 0,
        taxaPagamentoPercentual: 0,
        embalagemPedido: 0,
        itensPorPedidoEstimados: 1,
        margensCenario: "20, x",
        margemMinimaPercentual: 20,
      }),
    "margem"
  );

  await esperarErro(
    () => service.salvarPreco("produto-1", "SITE", 0),
    "maior que zero"
  );

  await esperarErro(
    () =>
      service.salvarCanal({
        canal: "OUTRO" as CanalDeVenda,
        comissaoPercentual: 0,
        taxaMensal: 0,
        pedidosMensaisEstimados: 0,
        ativo: true,
      }),
    "Canal de venda inválido"
  );

  console.log(
    `✅ Testes da precificação passaram (${verificacoes} verificações).`
  );
}

executarTestes().catch((error) => {
  console.error("❌ Testes da precificação falharam:");
  console.error(error);
  process.exitCode = 1;
});
