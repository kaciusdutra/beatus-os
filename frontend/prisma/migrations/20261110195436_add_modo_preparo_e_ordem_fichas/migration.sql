-- AlterTable
ALTER TABLE "FichaTecnica" ADD COLUMN     "modoPreparo" TEXT,
ADD COLUMN     "montagem" TEXT,
ADD COLUMN     "observacoes" TEXT,
ADD COLUMN     "porcaoQuantidade" DECIMAL(12,4),
ADD COLUMN     "porcaoUnidade" TEXT,
ADD COLUMN     "tempoPreparoMin" INTEGER,
ADD COLUMN     "validadeDias" INTEGER;

-- AlterTable
ALTER TABLE "FichaTecnicaItem" ADD COLUMN     "ordem" INTEGER NOT NULL DEFAULT 0;
