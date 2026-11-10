-- CreateEnum
CREATE TYPE "task_priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterTable
ALTER TABLE "task" ADD COLUMN     "priority" "task_priority" NOT NULL DEFAULT 'MEDIUM';

-- CreateIndex
CREATE INDEX "task_project_id_priority_idx" ON "task"("project_id", "priority");
