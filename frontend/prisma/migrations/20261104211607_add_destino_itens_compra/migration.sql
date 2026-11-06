-- AlterTable
ALTER TABLE "EntradaCompraItem" ADD COLUMN     "destino" TEXT,
ADD COLUMN     "insumoId" TEXT;

-- AlterTable
ALTER TABLE "Fornecedor" ADD COLUMN     "destinoPadrao" TEXT;

-- CreateTable
CREATE TABLE "ClassificacaoItemCompra" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "fornecedorId" TEXT NOT NULL,
    "descricaoNormalizada" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "insumoId" TEXT,
    "vezesUsada" INTEGER NOT NULL DEFAULT 1,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassificacaoItemCompra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassificacaoItemCompra_empresaId_idx" ON "ClassificacaoItemCompra"("empresaId");

-- CreateIndex
CREATE INDEX "ClassificacaoItemCompra_insumoId_idx" ON "ClassificacaoItemCompra"("insumoId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassificacaoItemCompra_empresaId_fornecedorId_descricaoNor_key" ON "ClassificacaoItemCompra"("empresaId", "fornecedorId", "descricaoNormalizada");

-- CreateIndex
CREATE INDEX "EntradaCompraItem_insumoId_idx" ON "EntradaCompraItem"("insumoId");

-- AddForeignKey
ALTER TABLE "EntradaCompraItem" ADD CONSTRAINT "EntradaCompraItem_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificacaoItemCompra" ADD CONSTRAINT "ClassificacaoItemCompra_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificacaoItemCompra" ADD CONSTRAINT "ClassificacaoItemCompra_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificacaoItemCompra" ADD CONSTRAINT "ClassificacaoItemCompra_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
