-- AlterTable
ALTER TABLE "ClassificacaoItemCompra" ADD COLUMN     "fatorQuantidade" DECIMAL(14,4),
ADD COLUMN     "fatorUnidade" TEXT;

-- AlterTable
ALTER TABLE "EntradaCompraItem" ADD COLUMN     "quantidadeReal" DECIMAL(14,4),
ADD COLUMN     "unidadeReal" TEXT;
