import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL não configurada.");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const empresas = await prisma.empresa.findMany({
    select: {
      id: true,
      nome: true,
      nomeFantasia: true,
      ativo: true,
    },
    orderBy: {
      criadoEm: "asc",
    },
  });

  console.table(empresas);
}

main()
  .catch((error) => {
    console.error("Erro ao consultar empresas:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
