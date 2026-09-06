import "dotenv/config";

import {
  PrismaPg,
} from "@prisma/adapter-pg";

import {
  PrismaClient,
} from "../../lib/generated/prisma/client";

const EMPRESA_DESENVOLVIMENTO_ID =
  "00000000-0000-0000-0000-000000000001";

const connectionString =
  process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL não configurada."
  );
}

const adapter =
  new PrismaPg({
    connectionString,
  });

const prisma =
  new PrismaClient({
    adapter,
  });

const categorias = [
  "Carnes",
  "Embutidos",
  "Laticínios",
  "Hortifruti",
  "Padaria",
  "Mercearia",
  "Molhos",
  "Temperos",
  "Bebidas",
  "Embalagens",
  "Outros",
];

const unidades = [
  {
    nome: "Quilograma",
    abreviacao: "kg",
  },
  {
    nome: "Grama",
    abreviacao: "g",
  },
  {
    nome: "Litro",
    abreviacao: "L",
  },
  {
    nome: "Mililitro",
    abreviacao: "ml",
  },
  {
    nome: "Unidade",
    abreviacao: "un",
  },
  {
    nome: "Caixa",
    abreviacao: "cx",
  },
  {
    nome: "Pacote",
    abreviacao: "pct",
  },
  {
    nome: "Fardo",
    abreviacao: "fd",
  },
];

async function main() {
  console.log(
    "Carregando categorias de insumos..."
  );

  for (const nome of categorias) {
    const categoria =
      await prisma.categoriaInsumo.upsert({
        where: {
          empresaId_nome: {
            empresaId:
              EMPRESA_DESENVOLVIMENTO_ID,
            nome,
          },
        },

        update: {
          ativo: true,
        },

        create: {
          empresaId:
            EMPRESA_DESENVOLVIMENTO_ID,
          nome,
          ativo: true,
        },
      });

    console.log(
      `Categoria carregada: ${categoria.nome}`
    );
  }

  console.log(
    "Carregando unidades de medida..."
  );

  for (const unidade of unidades) {
    const unidadeCriada =
      await prisma.unidadeMedida.upsert({
        where: {
          empresaId_abreviacao: {
            empresaId:
              EMPRESA_DESENVOLVIMENTO_ID,
            abreviacao:
              unidade.abreviacao,
          },
        },

        update: {
          nome: unidade.nome,
          ativo: true,
        },

        create: {
          empresaId:
            EMPRESA_DESENVOLVIMENTO_ID,
          nome: unidade.nome,
          abreviacao:
            unidade.abreviacao,
          ativo: true,
        },
      });

    console.log(
      `Unidade carregada: ${unidadeCriada.nome} (${unidadeCriada.abreviacao})`
    );
  }

  console.log(
    "Categorias e unidades carregadas com sucesso."
  );
}

main()
  .catch((error) => {
    console.error(
      "Erro ao carregar categorias e unidades:",
      error
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });