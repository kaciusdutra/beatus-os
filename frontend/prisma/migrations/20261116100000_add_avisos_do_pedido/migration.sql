-- CreateTable
CREATE TABLE "AvisoDoPedido" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "evento" TEXT NOT NULL,
    "canalDoAviso" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "erro" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviadoEm" TIMESTAMP(3),

    CONSTRAINT "AvisoDoPedido_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AvisoDoPedido_pedidoId_evento_key" ON "AvisoDoPedido"("pedidoId", "evento");

-- CreateIndex
CREATE INDEX "AvisoDoPedido_empresaId_status_criadoEm_idx" ON "AvisoDoPedido"("empresaId", "status", "criadoEm");

-- AddForeignKey
ALTER TABLE "AvisoDoPedido" ADD CONSTRAINT "AvisoDoPedido_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvisoDoPedido" ADD CONSTRAINT "AvisoDoPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
