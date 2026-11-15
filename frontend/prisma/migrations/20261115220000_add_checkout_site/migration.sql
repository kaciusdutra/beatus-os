-- CreateTable
CREATE TABLE "CheckoutSite" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "solicitado" JSONB NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "taxaEntrega" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "gateway" TEXT NOT NULL,
    "preferenciaExterna" TEXT,
    "checkoutUrl" TEXT,
    "metodo" TEXT,
    "transacaoExterna" TEXT,
    "statusExterno" TEXT,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "pedidoId" TEXT,
    "erro" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckoutSite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutSite_pedidoId_key" ON "CheckoutSite"("pedidoId");

-- CreateIndex
CREATE INDEX "CheckoutSite_empresaId_status_idx" ON "CheckoutSite"("empresaId", "status");

-- CreateIndex
CREATE INDEX "CheckoutSite_status_expiraEm_idx" ON "CheckoutSite"("status", "expiraEm");

-- AddForeignKey
ALTER TABLE "CheckoutSite" ADD CONSTRAINT "CheckoutSite_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

