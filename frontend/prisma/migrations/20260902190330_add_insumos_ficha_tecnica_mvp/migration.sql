-- CreateTable
CREATE TABLE "Insumo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "unidadeCompra" TEXT NOT NULL,
    "quantidadeCompra" DECIMAL(12,3) NOT NULL,
    "precoCompra" DECIMAL(12,4) NOT NULL,
    "custoUnitario" DECIMAL(12,4) NOT NULL,
    "fornecedorId" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Insumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FichaTecnica" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "rendimento" DECIMAL(12,3),
    "unidadeRendimento" TEXT,
    "embalagem" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FichaTecnica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FichaTecnicaItem" (
    "id" TEXT NOT NULL,
    "fichaTecnicaId" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "quantidade" DECIMAL(12,4) NOT NULL,
    "unidade" TEXT NOT NULL,
    "percentualPerda" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "custoCalculado" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FichaTecnicaItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Insumo_empresaId_idx" ON "Insumo"("empresaId");

-- CreateIndex
CREATE INDEX "Insumo_empresaId_categoria_idx" ON "Insumo"("empresaId", "categoria");

-- CreateIndex
CREATE INDEX "Insumo_empresaId_ativo_idx" ON "Insumo"("empresaId", "ativo");

-- CreateIndex
CREATE INDEX "Insumo_empresaId_fornecedorId_idx" ON "Insumo"("empresaId", "fornecedorId");

-- CreateIndex
CREATE UNIQUE INDEX "Insumo_empresaId_nome_key" ON "Insumo"("empresaId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "FichaTecnica_produtoId_key" ON "FichaTecnica"("produtoId");

-- CreateIndex
CREATE INDEX "FichaTecnica_empresaId_idx" ON "FichaTecnica"("empresaId");

-- CreateIndex
CREATE INDEX "FichaTecnica_empresaId_produtoId_idx" ON "FichaTecnica"("empresaId", "produtoId");

-- CreateIndex
CREATE UNIQUE INDEX "FichaTecnica_empresaId_produtoId_key" ON "FichaTecnica"("empresaId", "produtoId");

-- CreateIndex
CREATE INDEX "FichaTecnicaItem_fichaTecnicaId_idx" ON "FichaTecnicaItem"("fichaTecnicaId");

-- CreateIndex
CREATE INDEX "FichaTecnicaItem_insumoId_idx" ON "FichaTecnicaItem"("insumoId");

-- AddForeignKey
ALTER TABLE "Insumo" ADD CONSTRAINT "Insumo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Insumo" ADD CONSTRAINT "Insumo_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FichaTecnica" ADD CONSTRAINT "FichaTecnica_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FichaTecnica" ADD CONSTRAINT "FichaTecnica_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FichaTecnicaItem" ADD CONSTRAINT "FichaTecnicaItem_fichaTecnicaId_fkey" FOREIGN KEY ("fichaTecnicaId") REFERENCES "FichaTecnica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FichaTecnicaItem" ADD CONSTRAINT "FichaTecnicaItem_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
