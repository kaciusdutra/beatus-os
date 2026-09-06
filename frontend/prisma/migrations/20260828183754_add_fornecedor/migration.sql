-- CreateTable
CREATE TABLE "Fornecedor" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "cnpj" TEXT,
    "cpf" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "observacao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fornecedor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Fornecedor_empresaId_idx" ON "Fornecedor"("empresaId");

-- CreateIndex
CREATE INDEX "Fornecedor_empresaId_ativo_idx" ON "Fornecedor"("empresaId", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "Fornecedor_empresaId_cnpj_key" ON "Fornecedor"("empresaId", "cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Fornecedor_empresaId_cpf_key" ON "Fornecedor"("empresaId", "cpf");

-- AddForeignKey
ALTER TABLE "Fornecedor" ADD CONSTRAINT "Fornecedor_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
