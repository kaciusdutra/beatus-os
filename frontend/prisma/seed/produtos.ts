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

const produtos = [
  {
    id: "burger-bacon-double",
    nome: "Bacon Double",
    descricao:
      "Pão brioche, 2 carnes, queijo, bacon e molho especial.",
    categoria: "HAMBÚRGUER",
    preco: 42.9,
    ativo: true,
  },
  {
    id: "burger-classico",
    nome: "Hambúrguer Clássico",
    descricao:
      "Pão brioche, carne 150g, queijo e molho especial.",
    categoria: "HAMBÚRGUER",
    preco: 32.9,
    ativo: true,
  },
  {
    id: "burger-provolone",
    nome: "Provolone",
    descricao:
      "Carne 150g, provolone, rúcula e geleia de bacon.",
    categoria: "HAMBÚRGUER",
    preco: 44.9,
    ativo: true,
  },
  {
    id: "burger-gorgonzola",
    nome: "Gorgonzola",
    descricao:
      "Carne 150g, molho de gorgonzola e bacon.",
    categoria: "HAMBÚRGUER",
    preco: 46.9,
    ativo: true,
  },
  {
    id: "burger-costela",
    nome: "Costela",
    descricao:
      "Hambúrguer de costela, queijo e molho especial.",
    categoria: "HAMBÚRGUER",
    preco: 48.9,
    ativo: true,
  },
  {
    id: "batata-frita",
    nome: "Batata Frita",
    descricao:
      "Batata frita crocante 200g.",
    categoria: "ACOMPANHAMENTO",
    preco: 14.9,
    ativo: true,
  },
  {
    id: "batata-especial",
    nome: "Batata Especial",
    descricao:
      "Batata crocante com molho especial.",
    categoria: "ACOMPANHAMENTO",
    preco: 19.9,
    ativo: true,
  },
  {
    id: "refrigerante-lata",
    nome: "Refrigerante Lata",
    descricao:
      "Lata 350ml.",
    categoria: "BEBIDA",
    preco: 7.0,
    ativo: true,
  },
];

async function main() {
  for (const produto of produtos) {
    await prisma.produto.upsert({
      where: {
        id: produto.id,
      },
      update: {
        nome: produto.nome,
        descricao: produto.descricao,
        categoria: produto.categoria,
        preco: produto.preco,
        ativo: produto.ativo,
        empresaId:
          EMPRESA_DESENVOLVIMENTO_ID,
      },
      create: {
        id: produto.id,
        empresaId:
          EMPRESA_DESENVOLVIMENTO_ID,
        nome: produto.nome,
        descricao: produto.descricao,
        categoria: produto.categoria,
        preco: produto.preco,
        ativo: produto.ativo,
      },
    });

    console.log(
      `Produto carregado: ${produto.nome}`
    );
  }
}

main()
  .catch((error) => {
    console.error(
      "Erro ao carregar produtos:",
      error
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });