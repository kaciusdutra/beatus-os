-- DropForeignKey
ALTER TABLE "FichaTecnicaItem" DROP CONSTRAINT "FichaTecnicaItem_insumoId_fkey";

-- DropIndex
DROP INDEX "FichaTecnica_empresaId_produtoId_key";

-- AlterTable
ALTER TABLE "FichaTecnicaItem" ADD COLUMN     "preparacaoId" TEXT,
ADD COLUMN     "tipo" TEXT NOT NULL DEFAULT 'INSUMO',
ALTER COLUMN "insumoId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "FichaTecnicaItem_preparacaoId_idx" ON "FichaTecnicaItem"("preparacaoId");

-- AddForeignKey
ALTER TABLE "FichaTecnicaItem" ADD CONSTRAINT "FichaTecnicaItem_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FichaTecnicaItem" ADD CONSTRAINT "FichaTecnicaItem_preparacaoId_fkey" FOREIGN KEY ("preparacaoId") REFERENCES "FichaTecnica"("id") ON DELETE SET NULL ON UPDATE CASCADE;
