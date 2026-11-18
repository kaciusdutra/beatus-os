-- CreateTable
CREATE TABLE "VantagemDoClube" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" TEXT NOT NULL,
    "categoria" TEXT,
    "valorMaximo" DECIMAL(12,2),
    "percentual" DECIMAL(5,2),
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VantagemDoClube_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResgateDoClube" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "cartaoId" TEXT NOT NULL,
    "vantagemId" TEXT NOT NULL,
    "ciclo" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "categoria" TEXT,
    "valorMaximo" DECIMAL(12,2),
    "percentual" DECIMAL(5,2),
    "pedidoId" TEXT,
    "valorDoPremio" DECIMAL(12,2),
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResgateDoClube_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VantagemDoClube_empresaId_ativa_idx" ON "VantagemDoClube"("empresaId", "ativa");

-- CreateIndex
CREATE UNIQUE INDEX "ResgateDoClube_pedidoId_key" ON "ResgateDoClube"("pedidoId");

-- CreateIndex
CREATE INDEX "ResgateDoClube_empresaId_status_idx" ON "ResgateDoClube"("empresaId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ResgateDoClube_cartaoId_ciclo_key" ON "ResgateDoClube"("cartaoId", "ciclo");

-- AddForeignKey
ALTER TABLE "VantagemDoClube" ADD CONSTRAINT "VantagemDoClube_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResgateDoClube" ADD CONSTRAINT "ResgateDoClube_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResgateDoClube" ADD CONSTRAINT "ResgateDoClube_cartaoId_fkey" FOREIGN KEY ("cartaoId") REFERENCES "CartaoDoClube"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResgateDoClube" ADD CONSTRAINT "ResgateDoClube_vantagemId_fkey" FOREIGN KEY ("vantagemId") REFERENCES "VantagemDoClube"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResgateDoClube" ADD CONSTRAINT "ResgateDoClube_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
