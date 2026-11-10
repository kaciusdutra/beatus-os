import {
  FornecedorService,
} from "./fornecedorService";

import {
  FornecedorRepositoryPort,
} from "../repositories/fornecedorRepositoryPort";

import {
  Fornecedor,
} from "../types/fornecedor";

class FornecedorRepositoryFake
  implements FornecedorRepositoryPort
{
  private fornecedores: Fornecedor[] = [];

  async criar(
    fornecedor: Fornecedor
  ): Promise<Fornecedor> {
    this.fornecedores.push(
      fornecedor
    );

    return fornecedor;
  }

  async buscarPorId(
    id: string
  ): Promise<
    Fornecedor | undefined
  > {
    return this.fornecedores.find(
      (fornecedor) =>
        fornecedor.id === id
    );
  }

  async buscarPorCnpj(
    cnpj: string
  ): Promise<
    Fornecedor | undefined
  > {
    const normalizado =
      cnpj.replace(/\D/g, "");

    return this.fornecedores.find(
      (fornecedor) =>
        fornecedor.cnpj ===
        normalizado
    );
  }

  async buscarPorCpf(
    cpf: string
  ): Promise<
    Fornecedor | undefined
  > {
    const normalizado =
      cpf.replace(/\D/g, "");

    return this.fornecedores.find(
      (fornecedor) =>
        fornecedor.cpf ===
        normalizado
    );
  }

  async listar(): Promise<
    Fornecedor[]
  > {
    return this.fornecedores;
  }

  async atualizar(
    fornecedor: Fornecedor
  ): Promise<Fornecedor> {
    const index =
      this.fornecedores.findIndex(
        (item) =>
          item.id === fornecedor.id
      );

    if (index === -1) {
      throw new Error(
        "Fornecedor não encontrado."
      );
    }

    this.fornecedores[index] =
      fornecedor;

    return fornecedor;
  }

  async remover(
    id: string
  ): Promise<void> {
    this.fornecedores =
      this.fornecedores.filter(
        (fornecedor) =>
          fornecedor.id !== id
      );
  }
}

function criarFornecedor(
  dados?: Partial<Fornecedor>
): Fornecedor {
  return {
    id:
      dados?.id ??
      crypto.randomUUID(),

    razaoSocial:
      dados?.razaoSocial ??
      "Fornecedor Teste",

    nomeFantasia:
      dados?.nomeFantasia,

    cpf:
      dados?.cpf,

    cnpj:
      dados?.cnpj,

    telefone:
      dados?.telefone,

    email:
      dados?.email,

    observacao:
      dados?.observacao,

    destinoPadrao:
      dados?.destinoPadrao,

    criadoEm:
      dados?.criadoEm ??
      new Date().toISOString(),

    atualizadoEm:
      dados?.atualizadoEm ??
      new Date().toISOString(),

    ativo:
      dados?.ativo ??
      true,
  };
}

async function executarTestes() {
  const repository =
    new FornecedorRepositoryFake();

  const service =
    new FornecedorService(
      repository
    );

  const fornecedorCnpj =
    criarFornecedor({
      cnpj: "12.345.678/0001-95",
    });

  const criadoCnpj =
    await service.criarFornecedor({
      fornecedor:
        fornecedorCnpj,
    });

  if (
    criadoCnpj.cnpj !==
    "12345678000195"
  ) {
    throw new Error(
      "Falha: CNPJ não foi normalizado."
    );
  }

  const fornecedorCpf =
    criarFornecedor({
      id:
        crypto.randomUUID(),

      cpf: "123.456.789-09",
    });

  const criadoCpf =
    await service.criarFornecedor({
      fornecedor:
        fornecedorCpf,
    });

  if (
    criadoCpf.cpf !==
    "12345678909"
  ) {
    throw new Error(
      "Falha: CPF não foi normalizado."
    );
  }

  try {
    await service.criarFornecedor({
      fornecedor:
        criarFornecedor(),
    });

    throw new Error(
      "Falha: permitiu fornecedor sem CPF/CNPJ."
    );
  } catch (error) {
    if (
      !(error instanceof Error) ||
      error.message !==
        "Informe CPF ou CNPJ do fornecedor."
    ) {
      throw error;
    }
  }

  try {
    await service.criarFornecedor({
      fornecedor:
        criarFornecedor({
          id:
            crypto.randomUUID(),

          cpf:
            "111.111.111-11",

          cnpj:
            "22.222.222/0001-22",
        }),
    });

    throw new Error(
      "Falha: permitiu CPF e CNPJ simultaneamente."
    );
  } catch (error) {
    if (
      !(error instanceof Error) ||
      error.message !==
        "Informe apenas CPF ou CNPJ do fornecedor."
    ) {
      throw error;
    }
  }

  try {
    await service.criarFornecedor({
      fornecedor:
        criarFornecedor({
          id:
            crypto.randomUUID(),

          cnpj:
            "12.345.678/0001-95",
        }),
    });

    throw new Error(
      "Falha: permitiu CNPJ duplicado."
    );
  } catch (error) {
    if (
      !(error instanceof Error) ||
      error.message !==
        "Já existe um fornecedor cadastrado com este CNPJ."
    ) {
      throw error;
    }
  }

  try {
    await service.criarFornecedor({
      fornecedor:
        criarFornecedor({
          id:
            crypto.randomUUID(),

          cpf:
            "123.456.789-09",
        }),
    });

    throw new Error(
      "Falha: permitiu CPF duplicado."
    );
  } catch (error) {
    if (
      !(error instanceof Error) ||
      error.message !==
        "Já existe um fornecedor cadastrado com este CPF."
    ) {
      throw error;
    }
  }

  const encontradoPorCpf =
    await service.buscarPorCpf(
      "123.456.789-09"
    );

  if (
    !encontradoPorCpf ||
    encontradoPorCpf.id !==
      criadoCpf.id
  ) {
    throw new Error(
      "Falha: busca por CPF."
    );
  }

  const encontradoPorCnpj =
    await service.buscarPorCnpj(
      "12.345.678/0001-95"
    );

  if (
    !encontradoPorCnpj ||
    encontradoPorCnpj.id !==
      criadoCnpj.id
  ) {
    throw new Error(
      "Falha: busca por CNPJ."
    );
  }

  const fornecedorAtualizado =
    await service.atualizarFornecedor({
      fornecedor: {
        ...criadoCpf,

        razaoSocial:
          "Fornecedor Atualizado",

        atualizadoEm:
          new Date().toISOString(),
      },
    });

  if (
    fornecedorAtualizado.razaoSocial !==
    "Fornecedor Atualizado"
  ) {
    throw new Error(
      "Falha: atualização."
    );
  }

  async function esperarErro(
    acao: () => Promise<unknown>,
    mensagem: string,
    falha: string
  ) {
    try {
      await acao();
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === mensagem
      ) {
        return;
      }

      throw error;
    }

    throw new Error(falha);
  }

  // Bloco 7C: dígitos verificadores.
  await esperarErro(
    () =>
      service.criarFornecedor({
        fornecedor: criarFornecedor({
          id: crypto.randomUUID(),
          cnpj: "12.345.678/0001-90",
        }),
      }),
    "CNPJ do fornecedor inválido. Confira os números.",
    "Falha: aceitou CNPJ com dígito errado."
  );

  await esperarErro(
    () =>
      service.criarFornecedor({
        fornecedor: criarFornecedor({
          id: crypto.randomUUID(),
          cpf: "123.456.789-00",
        }),
      }),
    "CPF do fornecedor inválido. Confira os números.",
    "Falha: aceitou CPF com dígito errado."
  );

  // Bloco 7C: destino padrão.
  await esperarErro(
    () =>
      service.criarFornecedor({
        fornecedor: criarFornecedor({
          id: crypto.randomUUID(),
          cnpj: "11.222.333/0001-81",
          destinoPadrao: "BEBIDA",
        }),
      }),
    "Destino padrão do fornecedor inválido.",
    "Falha: aceitou destino padrão fora da lista."
  );

  const comDestino =
    await service.criarFornecedor({
      fornecedor: criarFornecedor({
        id: crypto.randomUUID(),
        cnpj: "11.222.333/0001-81",
        destinoPadrao: "EMBALAGEM",
      }),
    });

  if (comDestino.destinoPadrao !== "EMBALAGEM") {
    throw new Error(
      "Falha: destino padrão não foi gravado."
    );
  }

  const semDestino =
    await service.atualizarFornecedor({
      fornecedor: {
        ...comDestino,
        destinoPadrao: "",
      },
    });

  if (semDestino.destinoPadrao !== undefined) {
    throw new Error(
      "Falha: destino padrão vazio não foi limpo."
    );
  }

  // Cadastro antigo com CNPJ de dígito errado continua editável
  // (só o documento novo ou alterado é conferido).
  const antigo = criarFornecedor({
    id: crypto.randomUUID(),
    cnpj: "99999999000100",
  });

  await repository.criar(antigo);

  const antigoEditado =
    await service.atualizarFornecedor({
      fornecedor: {
        ...antigo,
        razaoSocial: "Antigo Editado",
        ativo: false,
      },
    });

  if (
    antigoEditado.razaoSocial !==
      "Antigo Editado" ||
    antigoEditado.ativo
  ) {
    throw new Error(
      "Falha: edição/inativação de cadastro antigo."
    );
  }

  console.log(
    "✅ Todos os testes do FornecedorService passaram."
  );
}

executarTestes().catch(
  (error) => {
    console.error(
      "❌ Testes do FornecedorService falharam:"
    );

    console.error(error);

    process.exitCode = 1;
  }
);