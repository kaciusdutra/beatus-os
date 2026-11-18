-- CreateTable
CREATE TABLE "CartaoDoClube" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "ativadoEm" TIMESTAMP(3) NOT NULL,
    "ciclo" INTEGER NOT NULL DEFAULT 1,
    "cicloIniciadoEm" TIMESTAMP(3) NOT NULL,
    "ultimoPedidoEm" TIMESTAMP(3),
    "completoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartaoDoClube_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeloDoClube" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "cartaoId" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "ciclo" INTEGER NOT NULL,
    "valorDosItens" DECIMAL(12,2) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeloDoClube_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CartaoDoClube_codigo_key" ON "CartaoDoClube"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "CartaoDoClube_empresaId_clienteId_key" ON "CartaoDoClube"("empresaId", "clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "SeloDoClube_pedidoId_key" ON "SeloDoClube"("pedidoId");

-- CreateIndex
CREATE INDEX "SeloDoClube_cartaoId_ciclo_idx" ON "SeloDoClube"("cartaoId", "ciclo");

-- AddForeignKey
ALTER TABLE "CartaoDoClube" ADD CONSTRAINT "CartaoDoClube_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartaoDoClube" ADD CONSTRAINT "CartaoDoClube_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeloDoClube" ADD CONSTRAINT "SeloDoClube_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeloDoClube" ADD CONSTRAINT "SeloDoClube_cartaoId_fkey" FOREIGN KEY ("cartaoId") REFERENCES "CartaoDoClube"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeloDoClube" ADD CONSTRAINT "SeloDoClube_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
