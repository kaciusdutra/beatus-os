-- DropForeignKey
ALTER TABLE "FichaTecnica" DROP CONSTRAINT "FichaTecnica_produtoId_fkey";

-- AlterTable
ALTER TABLE "FichaTecnica" ADD COLUMN     "tipo" TEXT NOT NULL DEFAULT 'PRODUTO',
ALTER COLUMN "produtoId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "FichaTecnica_empresaId_tipo_idx" ON "FichaTecnica"("empresaId", "tipo");

-- AddForeignKey
ALTER TABLE "FichaTecnica" ADD CONSTRAINT "FichaTecnica_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
