-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "enderecoBairro" TEXT,
ADD COLUMN     "enderecoCep" TEXT,
ADD COLUMN     "enderecoCidade" TEXT,
ADD COLUMN     "enderecoComplemento" TEXT,
ADD COLUMN     "enderecoEstado" TEXT,
ADD COLUMN     "enderecoLatitude" DECIMAL(10,7),
ADD COLUMN     "enderecoLogradouro" TEXT,
ADD COLUMN     "enderecoLongitude" DECIMAL(10,7),
ADD COLUMN     "enderecoNumero" TEXT,
ADD COLUMN     "enderecoRotulo" TEXT;
