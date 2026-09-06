-- CreateTable
CREATE TABLE "EntradaCompraDocumento" (
    "id" TEXT NOT NULL,
    "entradaCompraId" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "tipoDocumento" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "statusLeitura" TEXT NOT NULL DEFAULT 'PENDENTE',
    "caminhoArquivo" TEXT,
    "hashArquivo" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntradaCompraDocumento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EntradaCompraDocumento_entradaCompraId_idx" ON "EntradaCompraDocumento"("entradaCompraId");

-- CreateIndex
CREATE INDEX "EntradaCompraDocumento_entradaCompraId_tipoDocumento_idx" ON "EntradaCompraDocumento"("entradaCompraId", "tipoDocumento");

-- CreateIndex
CREATE INDEX "EntradaCompraDocumento_entradaCompraId_statusLeitura_idx" ON "EntradaCompraDocumento"("entradaCompraId", "statusLeitura");

-- AddForeignKey
ALTER TABLE "EntradaCompraDocumento" ADD CONSTRAINT "EntradaCompraDocumento_entradaCompraId_fkey" FOREIGN KEY ("entradaCompraId") REFERENCES "EntradaCompra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
