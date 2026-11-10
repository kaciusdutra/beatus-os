-- AlterTable
ALTER TABLE "Insumo" ADD COLUMN     "equivalenciaQuantidade" DECIMAL(12,4),
ADD COLUMN     "equivalenciaUnidade" TEXT,
ADD COLUMN     "perdaLimpeza" DECIMAL(8,4) NOT NULL DEFAULT 0;
