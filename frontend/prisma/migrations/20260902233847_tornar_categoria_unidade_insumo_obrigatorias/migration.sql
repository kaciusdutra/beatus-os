/*
  Warnings:

  - You are about to drop the column `categoria` on the `Insumo` table. All the data in the column will be lost.
  - You are about to drop the column `unidadeCompra` on the `Insumo` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Insumo_empresaId_categoria_idx";

-- AlterTable
ALTER TABLE "Insumo" DROP COLUMN "categoria",
DROP COLUMN "unidadeCompra";
