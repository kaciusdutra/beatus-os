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

const burgersDeTeste = [
  "burger-bacon-double",
  "burger-classico",
  "burger-provolone",
  "burger-gorgonzola",
  "burger-costela",
];

const burgers = [
  {
    id: "burger-agnus",
    nome: "Agnus",
    descricao:
      "Pão brioche, blend bovino de 160g, geleia de bacon, rúcula e molho de queijo provolone.",
    categoria: "HAMBÚRGUER",
    preco: 0,
    ativo: true,
  },
  {
    id: "burger-sanctum",
    nome: "Sanctum",
    descricao:
      "Pão brioche, blend de costela de 160g, queijo coalho, abacaxi grelhado, melaço de cana e maionese verde.",
    categoria: "HAMBÚRGUER",
    preco: 0,
    ativo: true,
  },
  {
    id: "burger-aureus",
    nome: "Aureus",
    descricao:
      "Pão brioche, blend bovino de 160g, chimichurri, picles de pepino, bacon artesanal, rúcula e molho Blue Cheese.",
    categoria: "HAMBÚRGUER",
    preco: 0,
    ativo: true,
  },
  {
    id: "burger-virtus",
    nome: "Virtus",
    descricao:
      "Pão brioche, burger de frango de 160g, molho aligot, picles e cebola roxa em conserva.",
    categoria: "HAMBÚRGUER",
    preco: 0,
    ativo: true,
  },
  {
    id: "burger-ignis",
    nome: "Ignis",
    descricao:
      "Pão brioche, queijo Gruyère, blend bovino de 160g, creme de cebola caramelizada, maionese defumada e bacon artesanal.",
    categoria: "HAMBÚRGUER",
    preco: 0,
    ativo: true,
  },
];

async function main() {
  console.log(
    "Removendo burgers de teste..."
  );

  for (const id of burgersDeTeste) {
    const resultado =
      await prisma.produto.deleteMany({
        where: {
          id,
          empresaId:
            EMPRESA_DESENVOLVIMENTO_ID,
        },
      });

    if (resultado.count > 0) {
      console.log(
        `Removido: ${id}`
      );
    }
  }

  console.log(
    "Carregando burgers definitivos..."
  );

  for (const burger of burgers) {
    const produto =
      await prisma.produto.upsert({
        where: {
          id: burger.id,
        },

        update: {
          nome: burger.nome,
          descricao:
            burger.descricao,
          categoria:
            burger.categoria,
          preco: burger.preco,
          ativo: burger.ativo,
          empresaId:
            EMPRESA_DESENVOLVIMENTO_ID,
        },

        create: {
          id: burger.id,
          empresaId:
            EMPRESA_DESENVOLVIMENTO_ID,
          nome: burger.nome,
          descricao:
            burger.descricao,
          categoria:
            burger.categoria,
          preco: burger.preco,
          ativo: burger.ativo,
        },
      });

    console.log(
      `Burger carregado: ${produto.nome}`
    );
  }

  console.log(
    "Burgers do soft open atualizados com sucesso."
  );
}

main()
  .catch((error) => {
    console.error(
      "Erro ao atualizar burgers:",
      error
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });