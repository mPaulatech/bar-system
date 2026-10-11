-- CreateEnum
CREATE TYPE "PerfilUsuario" AS ENUM ('GESTOR', 'FUNCIONARIO');

-- CreateEnum
CREATE TYPE "StatusEvento" AS ENUM ('RASCUNHO', 'ATIVO', 'ENCERRADO');

-- CreateEnum
CREATE TYPE "StatusVenda" AS ENUM ('CONFIRMADA', 'ESTORNADA');

-- CreateEnum
CREATE TYPE "StatusCheckin" AS ENUM ('PENDENTE', 'UTILIZADO');

-- CreateEnum
CREATE TYPE "TipoRestricao" AS ENUM ('DEBITO', 'COMPORTAMENTO', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusRestricao" AS ENUM ('ATIVA', 'RESOLVIDA');

-- CreateEnum
CREATE TYPE "TipoInsight" AS ENUM ('PROGRAMACAO', 'PRECIFICACAO', 'RECUPERACAO_CLIENTES', 'CONSUMO');

-- CreateEnum
CREATE TYPE "StatusRecomendacao" AS ENUM ('NOVA', 'VISTA', 'APLICADA', 'DESCARTADA');

-- CreateTable
CREATE TABLE "estabelecimentos" (
    "id" SERIAL NOT NULL,
    "nome_fantasia" TEXT NOT NULL,
    "razao_social" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "email_contato" TEXT NOT NULL,
    "api_key_hash" TEXT,
    "api_key_prefixo" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estabelecimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "estabelecimento_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "perfil" "PerfilUsuario" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos" (
    "id" SERIAL NOT NULL,
    "estabelecimento_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "genero_musical" TEXT NOT NULL,
    "atracoes" TEXT,
    "data_hora" TIMESTAMP(3) NOT NULL,
    "duracao_horas" INTEGER NOT NULL DEFAULT 12,
    "status" "StatusEvento" NOT NULL DEFAULT 'RASCUNHO',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "estabelecimento_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "data_nascimento" DATE,
    "telefone" TEXT,
    "email" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restricoes_clientes" (
    "id" SERIAL NOT NULL,
    "estabelecimento_id" INTEGER NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "tipo" "TipoRestricao" NOT NULL,
    "descricao" TEXT NOT NULL,
    "bloqueia_entrada" BOOLEAN NOT NULL DEFAULT false,
    "status" "StatusRestricao" NOT NULL DEFAULT 'ATIVA',
    "criado_por_id" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvido_por_id" INTEGER,
    "resolvido_em" TIMESTAMP(3),

    CONSTRAINT "restricoes_clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingressos_tipos" (
    "id" SERIAL NOT NULL,
    "estabelecimento_id" INTEGER NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "preco" DECIMAL(12,2) NOT NULL,
    "quantidade_disponivel" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingressos_tipos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendas_ingressos" (
    "id" SERIAL NOT NULL,
    "estabelecimento_id" INTEGER NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "ingresso_tipo_id" INTEGER NOT NULL,
    "cliente_id" INTEGER,
    "usuario_vendedor_id" INTEGER NOT NULL,
    "codigo_ingresso" TEXT NOT NULL,
    "valor_pago" DECIMAL(12,2) NOT NULL,
    "status_venda" "StatusVenda" NOT NULL DEFAULT 'CONFIRMADA',
    "estornada_em" TIMESTAMP(3),
    "status_checkin" "StatusCheckin" NOT NULL DEFAULT 'PENDENTE',
    "checkin_em" TIMESTAMP(3),
    "checkin_por_id" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendas_ingressos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendas_consumo_api" (
    "id" SERIAL NOT NULL,
    "estabelecimento_id" INTEGER NOT NULL,
    "evento_id" INTEGER,
    "cliente_id" INTEGER,
    "id_transacao_externa" TEXT NOT NULL,
    "valor_total" DECIMAL(12,2) NOT NULL,
    "data_hora_transacao" TIMESTAMP(3) NOT NULL,
    "itens" JSONB,
    "payload_original" JSONB NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendas_consumo_api_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recomendacoes_gestao" (
    "id" SERIAL NOT NULL,
    "estabelecimento_id" INTEGER NOT NULL,
    "tipo_insight" "TipoInsight" NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "prioridade" INTEGER NOT NULL DEFAULT 2,
    "dados_suporte" JSONB,
    "status" "StatusRecomendacao" NOT NULL DEFAULT 'NOVA',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recomendacoes_gestao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "estabelecimentos_cnpj_key" ON "estabelecimentos"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "estabelecimentos_api_key_hash_key" ON "estabelecimentos"("api_key_hash");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_estabelecimento_id_idx" ON "usuarios"("estabelecimento_id");

-- CreateIndex
CREATE INDEX "eventos_estabelecimento_id_data_hora_idx" ON "eventos"("estabelecimento_id", "data_hora");

-- CreateIndex
CREATE INDEX "eventos_estabelecimento_id_status_idx" ON "eventos"("estabelecimento_id", "status");

-- CreateIndex
CREATE INDEX "clientes_estabelecimento_id_nome_idx" ON "clientes"("estabelecimento_id", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_estabelecimento_id_cpf_key" ON "clientes"("estabelecimento_id", "cpf");

-- CreateIndex
CREATE INDEX "restricoes_clientes_estabelecimento_id_cliente_id_status_idx" ON "restricoes_clientes"("estabelecimento_id", "cliente_id", "status");

-- CreateIndex
CREATE INDEX "ingressos_tipos_estabelecimento_id_evento_id_idx" ON "ingressos_tipos"("estabelecimento_id", "evento_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendas_ingressos_codigo_ingresso_key" ON "vendas_ingressos"("codigo_ingresso");

-- CreateIndex
CREATE INDEX "vendas_ingressos_estabelecimento_id_evento_id_idx" ON "vendas_ingressos"("estabelecimento_id", "evento_id");

-- CreateIndex
CREATE INDEX "vendas_ingressos_estabelecimento_id_cliente_id_idx" ON "vendas_ingressos"("estabelecimento_id", "cliente_id");

-- CreateIndex
CREATE INDEX "vendas_ingressos_estabelecimento_id_criado_em_idx" ON "vendas_ingressos"("estabelecimento_id", "criado_em");

-- CreateIndex
CREATE INDEX "vendas_consumo_api_estabelecimento_id_evento_id_idx" ON "vendas_consumo_api"("estabelecimento_id", "evento_id");

-- CreateIndex
CREATE INDEX "vendas_consumo_api_estabelecimento_id_cliente_id_idx" ON "vendas_consumo_api"("estabelecimento_id", "cliente_id");

-- CreateIndex
CREATE INDEX "vendas_consumo_api_estabelecimento_id_data_hora_transacao_idx" ON "vendas_consumo_api"("estabelecimento_id", "data_hora_transacao");

-- CreateIndex
CREATE UNIQUE INDEX "vendas_consumo_api_estabelecimento_id_id_transacao_externa_key" ON "vendas_consumo_api"("estabelecimento_id", "id_transacao_externa");

-- CreateIndex
CREATE INDEX "recomendacoes_gestao_estabelecimento_id_status_idx" ON "recomendacoes_gestao"("estabelecimento_id", "status");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_estabelecimento_id_fkey" FOREIGN KEY ("estabelecimento_id") REFERENCES "estabelecimentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_estabelecimento_id_fkey" FOREIGN KEY ("estabelecimento_id") REFERENCES "estabelecimentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_estabelecimento_id_fkey" FOREIGN KEY ("estabelecimento_id") REFERENCES "estabelecimentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restricoes_clientes" ADD CONSTRAINT "restricoes_clientes_estabelecimento_id_fkey" FOREIGN KEY ("estabelecimento_id") REFERENCES "estabelecimentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restricoes_clientes" ADD CONSTRAINT "restricoes_clientes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restricoes_clientes" ADD CONSTRAINT "restricoes_clientes_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restricoes_clientes" ADD CONSTRAINT "restricoes_clientes_resolvido_por_id_fkey" FOREIGN KEY ("resolvido_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingressos_tipos" ADD CONSTRAINT "ingressos_tipos_estabelecimento_id_fkey" FOREIGN KEY ("estabelecimento_id") REFERENCES "estabelecimentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingressos_tipos" ADD CONSTRAINT "ingressos_tipos_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendas_ingressos" ADD CONSTRAINT "vendas_ingressos_estabelecimento_id_fkey" FOREIGN KEY ("estabelecimento_id") REFERENCES "estabelecimentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendas_ingressos" ADD CONSTRAINT "vendas_ingressos_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendas_ingressos" ADD CONSTRAINT "vendas_ingressos_ingresso_tipo_id_fkey" FOREIGN KEY ("ingresso_tipo_id") REFERENCES "ingressos_tipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendas_ingressos" ADD CONSTRAINT "vendas_ingressos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendas_ingressos" ADD CONSTRAINT "vendas_ingressos_usuario_vendedor_id_fkey" FOREIGN KEY ("usuario_vendedor_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendas_ingressos" ADD CONSTRAINT "vendas_ingressos_checkin_por_id_fkey" FOREIGN KEY ("checkin_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendas_consumo_api" ADD CONSTRAINT "vendas_consumo_api_estabelecimento_id_fkey" FOREIGN KEY ("estabelecimento_id") REFERENCES "estabelecimentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendas_consumo_api" ADD CONSTRAINT "vendas_consumo_api_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendas_consumo_api" ADD CONSTRAINT "vendas_consumo_api_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recomendacoes_gestao" ADD CONSTRAINT "recomendacoes_gestao_estabelecimento_id_fkey" FOREIGN KEY ("estabelecimento_id") REFERENCES "estabelecimentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
