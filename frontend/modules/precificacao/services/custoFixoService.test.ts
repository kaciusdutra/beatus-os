import type { CustoFixoRepositoryPort } from "../repositories/custoFixoRepositoryPort";

import type {
  ConfiguracaoPrecificacao,
  CustoFixo,
} from "../types/custoFixo";

import {
  custoFixoPorPedido,
  custoFixoVigente,
  totalMensalVigente,
} from "./calcularCustoFixo";

import { CustoFixoService } from "./custoFixoService";

let verificacoes = 0;

function verificar(condicao: boolean, mensagem: string): void {
  verificacoes++;

  if (!condicao) {
    throw new Error(`Falha: ${mensagem}`);
  }
}

class RepositorioFake implements CustoFixoRepositoryPort {
  custos: CustoFixo[] = [];

  configuracao: ConfiguracaoPrecificacao = {
    pedidosMensaisEstimados: 0,
  };

  async listar() {
    return this.custos;
  }

  async buscarPorId(id: string) {
    return this.custos.find((custo) => custo.id === id);
  }

  async criar(custo: CustoFixo) {
    this.custos.push(custo);

    return custo;
  }

  async atualizar(custo: CustoFixo) {
    this.custos = this.custos.map((item) =>
      item.id === custo.id ? custo : item
    );

    return custo;
  }

  async buscarConfiguracao() {
    return this.configuracao;
  }

  async salvarConfiguracao(configuracao: ConfiguracaoPrecificacao) {
    this.configuracao = configuracao;

    return configuracao;
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
  const agora = new Date("2026-11-11T12:00:00.000Z");

  // Vigência
  verificar(
    custoFixoVigente(
      {
        ativo: true,
        inicioVigencia: "2026-01-01T00:00:00.000Z",
      },
      agora
    ),
    "ativo e já iniciado vale"
  );

  verificar(
    !custoFixoVigente(
      { ativo: false, inicioVigencia: "2026-01-01T00:00:00.000Z" },
      agora
    ),
    "inativo não vale"
  );

  verificar(
    !custoFixoVigente(
      { ativo: true, inicioVigencia: "2026-12-01T00:00:00.000Z" },
      agora
    ),
    "ainda não iniciado não vale"
  );

  verificar(
    !custoFixoVigente(
      {
        ativo: true,
        inicioVigencia: "2026-01-01T00:00:00.000Z",
        fimVigencia: "2026-10-31T00:00:00.000Z",
      },
      agora
    ),
    "vigência encerrada não vale"
  );

  // Rateio por pedido
  verificar(
    custoFixoPorPedido(3000, 1000) === 3,
    "R$ 3.000 em 1.000 pedidos = R$ 3 por pedido"
  );

  verificar(
    custoFixoPorPedido(3000, 0) === undefined,
    "sem pedidos não há rateio"
  );

  // Serviço
  const repositorio = new RepositorioFake();

  const service = new CustoFixoService(repositorio);

  const aluguel = await service.criar({
    nome: "Aluguel",
    valorMensal: 1500,
    inicioVigencia: "2026-01-01T00:00:00.000Z",
  });

  await service.criar({
    nome: "Energia",
    valorMensal: 480.5,
    inicioVigencia: "2026-01-01T00:00:00.000Z",
  });

  const antigo = await service.criar({
    nome: "Plano antigo",
    valorMensal: 200,
    inicioVigencia: "2025-01-01T00:00:00.000Z",
    fimVigencia: "2025-12-31T00:00:00.000Z",
  });

  let resumo = await service.resumo(agora);

  verificar(
    resumo.totalMensal === 1980.5,
    "soma só os custos vigentes (1.500 + 480,50)"
  );

  verificar(
    resumo.custoPorPedido === undefined,
    "sem estimativa, sem custo por pedido"
  );

  await service.salvarPedidosMensais(1000);

  resumo = await service.resumo(agora);

  verificar(
    resumo.custoPorPedido === 1.9805,
    "custo fixo por pedido com 1.000 pedidos"
  );

  // Inativar tira do total, sem apagar
  await service.atualizar(aluguel.id, {
    nome: "Aluguel",
    valorMensal: 1500,
    ativo: false,
  });

  resumo = await service.resumo(agora);

  verificar(resumo.totalMensal === 480.5, "inativo sai do total");

  verificar(
    (await service.listar()).length === 3,
    "o custo inativo continua na lista"
  );

  verificar(
    (await service.listar()).some((c) => c.id === antigo.id),
    "custo encerrado continua na lista"
  );

  // Validações
  await esperarErro(
    () => service.criar({ nome: " ", valorMensal: 10 }),
    "Nome do custo fixo"
  );

  await esperarErro(
    () => service.criar({ nome: "Gás", valorMensal: -1 }),
    "valor mensal"
  );

  await esperarErro(
    () =>
      service.criar({
        nome: "Gás",
        valorMensal: 10,
        inicioVigencia: "2026-05-01T00:00:00.000Z",
        fimVigencia: "2026-04-01T00:00:00.000Z",
      }),
    "fim da vigência"
  );

  await esperarErro(
    () => service.salvarPedidosMensais(10.5),
    "número inteiro"
  );

  await esperarErro(
    () => service.atualizar("inexistente", { nome: "X", valorMensal: 1 }),
    "não encontrado"
  );

  console.log(
    `✅ Testes dos custos fixos passaram (${verificacoes} verificações).`
  );
}

executarTestes().catch((error) => {
  console.error("❌ Testes dos custos fixos falharam:");
  console.error(error);
  process.exitCode = 1;
});
