-- CreateEnum
CREATE TYPE "OrigemVenda" AS ENUM ('PDV', 'PUBLICA');

-- CreateEnum
CREATE TYPE "StatusPagamento" AS ENUM ('PENDENTE', 'APROVADO', 'RECUSADO');

-- AlterTable
ALTER TABLE "estabelecimentos"
ADD COLUMN "identificador_publico" TEXT;

UPDATE "estabelecimentos"
SET "identificador_publico" = gen_random_uuid()::TEXT
WHERE "identificador_publico" IS NULL;

ALTER TABLE "estabelecimentos"
ALTER COLUMN "identificador_publico" SET NOT NULL;

-- CreateTable
CREATE TABLE "compras" (
    "id" SERIAL NOT NULL,
    "estabelecimento_id" INTEGER NOT NULL,
    "cliente_id" INTEGER,
    "origem" "OrigemVenda" NOT NULL,
    "status_pagamento" "StatusPagamento" NOT NULL DEFAULT 'PENDENTE',
    "chave_idempotencia" TEXT,
    "valor_total" DECIMAL(12,2) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "compras_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "vendas_ingressos"
ADD COLUMN "compra_id" INTEGER;

ALTER TABLE "vendas_ingressos"
ALTER COLUMN "usuario_vendedor_id" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "estabelecimentos_identificador_publico_key"
ON "estabelecimentos"("identificador_publico");

CREATE UNIQUE INDEX "compras_estabelecimento_id_chave_idempotencia_key"
ON "compras"("estabelecimento_id", "chave_idempotencia");

CREATE INDEX "compras_estabelecimento_id_origem_idx"
ON "compras"("estabelecimento_id", "origem");

CREATE INDEX "compras_estabelecimento_id_status_pagamento_idx"
ON "compras"("estabelecimento_id", "status_pagamento");

-- Cria uma compra histórica por ingresso para permitir a associação sem
-- alterar os registros existentes do PDV.
INSERT INTO "compras" (
    "estabelecimento_id", "cliente_id", "origem", "status_pagamento",
    "chave_idempotencia", "valor_total", "criado_em", "atualizado_em"
)
SELECT
    "estabelecimento_id", "cliente_id", 'PDV', 'APROVADO',
    'migracao-venda-' || "id", "valor_pago", "criado_em", "atualizado_em"
FROM "vendas_ingressos";

UPDATE "vendas_ingressos" AS venda
SET "compra_id" = compra."id"
FROM "compras" AS compra
WHERE compra."chave_idempotencia" = 'migracao-venda-' || venda."id";

UPDATE "compras"
SET "chave_idempotencia" = NULL
WHERE "chave_idempotencia" LIKE 'migracao-venda-%';

ALTER TABLE "vendas_ingressos"
ALTER COLUMN "compra_id" SET NOT NULL;

-- Chaves candidatas para que as FKs compostas validem também o estabelecimento.
ALTER TABLE "clientes"
ADD CONSTRAINT "clientes_estabelecimento_id_id_key"
UNIQUE ("estabelecimento_id", "id");

ALTER TABLE "compras"
ADD CONSTRAINT "compras_estabelecimento_id_id_key"
UNIQUE ("estabelecimento_id", "id");

-- Foreign keys
ALTER TABLE "compras"
ADD CONSTRAINT "compras_estabelecimento_id_fkey"
FOREIGN KEY ("estabelecimento_id") REFERENCES "estabelecimentos"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "vendas_ingressos"
DROP CONSTRAINT "vendas_ingressos_cliente_id_fkey";

ALTER TABLE "compras"
ADD CONSTRAINT "compras_estabelecimento_id_cliente_id_fkey"
FOREIGN KEY ("estabelecimento_id", "cliente_id")
REFERENCES "clientes"("estabelecimento_id", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "vendas_ingressos"
ADD CONSTRAINT "vendas_ingressos_estabelecimento_id_compra_id_fkey"
FOREIGN KEY ("estabelecimento_id", "compra_id")
REFERENCES "compras"("estabelecimento_id", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "vendas_ingressos"
ADD CONSTRAINT "vendas_ingressos_estabelecimento_id_cliente_id_fkey"
FOREIGN KEY ("estabelecimento_id", "cliente_id")
REFERENCES "clientes"("estabelecimento_id", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "vendas_ingressos_estabelecimento_id_compra_id_idx"
ON "vendas_ingressos"("estabelecimento_id", "compra_id");
