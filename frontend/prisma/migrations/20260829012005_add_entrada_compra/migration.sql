-- CreateTable
CREATE TABLE "EntradaCompra" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "fornecedorId" TEXT NOT NULL,
    "tipoDocumento" TEXT NOT NULL,
    "numeroDocumento" TEXT,
    "serie" TEXT,
    "chaveAcesso" TEXT,
    "dataDocumento" TIMESTAMP(3),
    "dataEntrada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valorProdutos" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valorDesconto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valorFrete" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valorTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "documentoArquivo" TEXT,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntradaCompra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntradaCompraItem" (
    "id" TEXT NOT NULL,
    "entradaCompraId" TEXT NOT NULL,
    "descricaoOriginal" TEXT NOT NULL,
    "codigoFornecedor" TEXT,
    "quantidade" DECIMAL(12,3) NOT NULL,
    "unidade" TEXT NOT NULL,
    "valorUnitario" DECIMAL(12,4) NOT NULL,
    "desconto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valorTotal" DECIMAL(12,2) NOT NULL,
    "lote" TEXT,
    "validade" TIMESTAMP(3),
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntradaCompraItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EntradaCompra_empresaId_idx" ON "EntradaCompra"("empresaId");

-- CreateIndex
CREATE INDEX "EntradaCompra_empresaId_fornecedorId_idx" ON "EntradaCompra"("empresaId", "fornecedorId");

-- CreateIndex
CREATE INDEX "EntradaCompra_empresaId_dataEntrada_idx" ON "EntradaCompra"("empresaId", "dataEntrada");

-- CreateIndex
CREATE INDEX "EntradaCompra_empresaId_tipoDocumento_idx" ON "EntradaCompra"("empresaId", "tipoDocumento");

-- CreateIndex
CREATE INDEX "EntradaCompraItem_entradaCompraId_idx" ON "EntradaCompraItem"("entradaCompraId");

-- AddForeignKey
ALTER TABLE "EntradaCompra" ADD CONSTRAINT "EntradaCompra_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntradaCompra" ADD CONSTRAINT "EntradaCompra_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntradaCompraItem" ADD CONSTRAINT "EntradaCompraItem_entradaCompraId_fkey" FOREIGN KEY ("entradaCompraId") REFERENCES "EntradaCompra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
