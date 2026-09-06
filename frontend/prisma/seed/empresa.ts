import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../lib/generated/prisma/client";

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

const EMPRESA_DESENVOLVIMENTO_ID =
  "00000000-0000-0000-0000-000000000001";

async function main() {
  const empresa = await prisma.empresa.upsert({
    where: {
      id: EMPRESA_DESENVOLVIMENTO_ID,
    },

    update: {
      nome: "Beatus Desenvolvimento",
      nomeFantasia: "Beatus",
      ativo: true,
    },

    create: {
      id: EMPRESA_DESENVOLVIMENTO_ID,
      nome: "Beatus Desenvolvimento",
      nomeFantasia: "Beatus",
      ativo: true,
    },
  });

  console.log("Empresa de desenvolvimento:");
  console.log(empresa);
}

main()
  .catch((error) => {
    console.error(
      "Erro ao criar empresa:",
      error
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });