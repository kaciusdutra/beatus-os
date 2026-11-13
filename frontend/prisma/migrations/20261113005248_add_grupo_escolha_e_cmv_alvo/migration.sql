-- AlterTable
ALTER TABLE "ConfiguracaoPrecificacao" ADD COLUMN     "cmvAlvoPercentual" DECIMAL(8,4) NOT NULL DEFAULT 35;

-- AlterTable
ALTER TABLE "FichaTecnicaItem" ADD COLUMN     "grupoEscolha" TEXT;
