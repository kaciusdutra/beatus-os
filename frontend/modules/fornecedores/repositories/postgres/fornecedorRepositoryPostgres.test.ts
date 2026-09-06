import "dotenv/config";

import {
  criarContextoDesenvolvimento,
} from "@/core/context/empresaContext";

import {
  criarFornecedorRepositoryPostgres,
} from "./index";

import {
  prisma,
} from "@/lib/prisma";

async function executarTeste() {
  const contexto =
    criarContextoDesenvolvimento();

  const repository =
    criarFornecedorRepositoryPostgres(
      contexto
    );

  const id =
    crypto.randomUUID();

  const criado =
    await repository.criar({
      id,

      razaoSocial:
        "Fornecedor Teste Sprint 1",

      nomeFantasia:
        "Fornecedor Teste",

      cnpj:
        "12345678000190",

      telefone:
        "92999999999",

      email:
        "teste@fornecedor.com",

      observacao:
        "Fornecedor criado pelo teste da Sprint 1.",

      criadoEm:
        new Date().toISOString(),

      atualizadoEm:
        new Date().toISOString(),

      ativo: true,
    });

  if (
    criado.id !== id
  ) {
    throw new Error(
      "Falha ao criar fornecedor."
    );
  }

  if (
    criado.cnpj !==
    "12345678000190"
  ) {
    throw new Error(
      "Falha na normalização do CNPJ."
    );
  }

  const encontradoPorCnpj =
    await repository.buscarPorCnpj(
      "12.345.678/0001-90"
    );

  if (
    !encontradoPorCnpj ||
    encontradoPorCnpj.id !== id
  ) {
    throw new Error(
      "Falha na busca por CNPJ."
    );
  }

  const listado =
    await repository.listar();

  if (
    !listado.some(
      (fornecedor) =>
        fornecedor.id === id
    )
  ) {
    throw new Error(
      "Fornecedor criado não apareceu na listagem."
    );
  }

  const atualizado =
    await repository.atualizar({
      ...criado,

      razaoSocial:
        "Fornecedor Teste Atualizado",

      atualizadoEm:
        new Date().toISOString(),
    });

  if (
    atualizado.razaoSocial !==
    "Fornecedor Teste Atualizado"
  ) {
    throw new Error(
      "Falha na atualização do fornecedor."
    );
  }

  const encontradoPorId =
    await repository.buscarPorId(
      id
    );

  if (
    !encontradoPorId ||
    encontradoPorId.id !== id
  ) {
    throw new Error(
      "Falha na busca por ID."
    );
  }

  await repository.remover(
    id
  );

  const removido =
    await repository.buscarPorId(
      id
    );

  if (removido) {
    throw new Error(
      "Falha: fornecedor ainda existe após remoção."
    );
  }

  console.log(
    "✅ Repository PostgreSQL do Fornecedor validado com sucesso."
  );
}

executarTeste()
  .catch((error) => {
    console.error(
      "❌ Teste do Repository PostgreSQL falhou:"
    );

    console.error(error);

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });