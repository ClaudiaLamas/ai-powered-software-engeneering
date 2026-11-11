-- Vários responsáveis por tarefa (DE16, database.md TASK_ASSIGNEE).
-- Copia o responsável atual de cada tarefa para task_assignee e só depois
-- remove a coluna task.assignee_id.

-- CreateTable
CREATE TABLE "task_assignee" (
    "task_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_assignee_pkey" PRIMARY KEY ("task_id","account_id")
);

-- CreateIndex
CREATE INDEX "task_assignee_account_id_idx" ON "task_assignee"("account_id");

-- AddForeignKey
ALTER TABLE "task_assignee" ADD CONSTRAINT "task_assignee_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignee" ADD CONSTRAINT "task_assignee_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Copiar os responsáveis existentes (a data da atribuição não era guardada:
-- usa-se a última alteração da tarefa).
INSERT INTO "task_assignee" ("task_id", "account_id", "assigned_at")
SELECT "id", "assignee_id", "updated_at" FROM "task" WHERE "assignee_id" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "task" DROP CONSTRAINT "task_assignee_id_fkey";

-- DropIndex
DROP INDEX "task_assignee_id_idx";

-- AlterTable
ALTER TABLE "task" DROP COLUMN "assignee_id";
