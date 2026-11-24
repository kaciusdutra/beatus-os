-- AlterTable
ALTER TABLE "PagamentoOnline" ADD COLUMN "taxaGateway" DECIMAL(12,2),
ADD COLUMN "valorLiquido" DECIMAL(12,2),
ADD COLUMN "liberadoEm" TIMESTAMP(3);
