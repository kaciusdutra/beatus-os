import "server-only";

import { prisma } from "@/lib/prisma";
import type { EmpresaContext } from "@/core/context/empresaContext";

import type { CustoFixoRepositoryPort } from "../custoFixoRepositoryPort";

import type {
  ConfiguracaoPrecificacao,
  CustoFixo,
} from "../../types/custoFixo";

function mapearCustoFixo(custo: {
  id: string;
  nome: string;
  valorMensal: unknown;
  inicioVigencia: Date;
  fimVigencia: Date | null;
  ativo: boolean;
  observacao: string | null;
  criadoEm: Date;
  atualizadoEm: Date;
}): CustoFixo {
  return {
    id: custo.id,
    nome: custo.nome,
    valorMensal: Number(custo.valorMensal),
    inicioVigencia: custo.inicioVigencia.toISOString(),
    fimVigencia: custo.fimVigencia?.toISOString(),
    ativo: custo.ativo,
    observacao: custo.observacao ?? undefined,
    criadoEm: custo.criadoEm.toISOString(),
    atualizadoEm: custo.atualizadoEm.toISOString(),
  };
}

export class CustoFixoRepositoryPostgres
  implements CustoFixoRepositoryPort
{
  constructor(private readonly contexto: EmpresaContext) {}

  async listar(): Promise<CustoFixo[]> {
    const custos = await prisma.custoFixo.findMany({
      where: { empresaId: this.contexto.empresaId },
      orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    });

    return custos.map(mapearCustoFixo);
  }

  async buscarPorId(id: string): Promise<CustoFixo | undefined> {
    const custo = await prisma.custoFixo.findFirst({
      where: { id, empresaId: this.contexto.empresaId },
    });

    return custo ? mapearCustoFixo(custo) : undefined;
  }

  async criar(custo: CustoFixo): Promise<CustoFixo> {
    const criado = await prisma.custoFixo.create({
      data: {
        id: custo.id,
        empresaId: this.contexto.empresaId,
        nome: custo.nome,
        valorMensal: custo.valorMensal,
        inicioVigencia: new Date(custo.inicioVigencia),
        fimVigencia: custo.fimVigencia
          ? new Date(custo.fimVigencia)
          : null,
        ativo: custo.ativo,
        observacao: custo.observacao ?? null,
      },
    });

    return mapearCustoFixo(criado);
  }

  async atualizar(custo: CustoFixo): Promise<CustoFixo> {
    const resultado = await prisma.custoFixo.updateMany({
      where: {
        id: custo.id,
        empresaId: this.contexto.empresaId,
      },
      data: {
        nome: custo.nome,
        valorMensal: custo.valorMensal,
        inicioVigencia: new Date(custo.inicioVigencia),
        fimVigencia: custo.fimVigencia
          ? new Date(custo.fimVigencia)
          : null,
        ativo: custo.ativo,
        observacao: custo.observacao ?? null,
      },
    });

    if (resultado.count === 0) {
      throw new Error("Custo fixo não encontrado.");
    }

    const atualizado = await this.buscarPorId(custo.id);

    if (!atualizado) {
      throw new Error("Custo fixo não encontrado.");
    }

    return atualizado;
  }

  async buscarConfiguracao(): Promise<ConfiguracaoPrecificacao> {
    const configuracao =
      await prisma.configuracaoPrecificacao.findUnique({
        where: { empresaId: this.contexto.empresaId },
      });

    return {
      pedidosMensaisEstimados:
        configuracao?.pedidosMensaisEstimados ?? 0,
    };
  }

  async salvarConfiguracao(
    configuracao: ConfiguracaoPrecificacao
  ): Promise<ConfiguracaoPrecificacao> {
    const salva = await prisma.configuracaoPrecificacao.upsert({
      where: { empresaId: this.contexto.empresaId },
      create: {
        empresaId: this.contexto.empresaId,
        pedidosMensaisEstimados:
          configuracao.pedidosMensaisEstimados,
      },
      update: {
        pedidosMensaisEstimados:
          configuracao.pedidosMensaisEstimados,
      },
    });

    return {
      pedidosMensaisEstimados: salva.pedidosMensaisEstimados,
    };
  }
}

export function criarCustoFixoRepositoryPostgres(
  contexto: EmpresaContext
): CustoFixoRepositoryPostgres {
  return new CustoFixoRepositoryPostgres(contexto);
}
