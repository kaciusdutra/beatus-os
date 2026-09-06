-- AlterTable
ALTER TABLE "EntradaCompra" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'RASCUNHO';

-- CreateIndex
CREATE INDEX "EntradaCompra_empresaId_status_idx" ON "EntradaCompra"("empresaId", "status");
