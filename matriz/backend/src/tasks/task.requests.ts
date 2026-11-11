import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import type { TaskPriority, TaskStatus } from '../generated/prisma/client.js';

/**
 * Pedidos de tarefas (openapi.yaml 0.5.0). Aqui só se valida o formato
 * (`400 VALIDATION_ERROR`): tipos, enums, UUID e campos desconhecidos, como
 * `projectId` ou `status` no corpo. As regras (título aparado com 3–150
 * caracteres, descrição até 2000, responsável) são verificadas no serviço,
 * depois do `404`, do `403` e do `409`, como pede a ordem das verificações.
 */

export const TASK_STATUSES = [
  'TODO',
  'IN_PROGRESS',
  'DONE',
] as const satisfies readonly TaskStatus[];
export const TASK_PRIORITIES = [
  'LOW',
  'MEDIUM',
  'HIGH',
] as const satisfies readonly TaskPriority[];

export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_MAX = 100;

const PRIORITY_MESSAGE = 'A prioridade tem de ser LOW, MEDIUM ou HIGH.';
const STATUS_MESSAGE = 'O estado tem de ser TODO, IN_PROGRESS ou DONE.';

/**
 * Chave de comparação de `@ArrayUnique` para UUID: em minúsculas. Um
 * elemento que não é texto fica como está (dá erro em `@IsUUID`).
 */
function sameUuid(id: unknown): unknown {
  return typeof id === 'string' ? id.toLowerCase() : id;
}

/** Campos comuns a `CreateTaskRequest` e `UpdateTaskRequest`. */
class TaskFields {
  /** Em falta dá `TITLE_INVALID` no serviço (ao criar); `null` ou outro tipo é erro de formato. */
  @ValidateIf((body: TaskFields) => body.title !== undefined)
  @IsString({ message: 'O título tem de ser texto.' })
  title?: string;

  @IsOptional()
  @IsString({ message: 'A descrição tem de ser texto.' })
  description?: string | null;

  /** Não aceita `null`: a prioridade é obrigatória na tarefa (PN19). */
  @ValidateIf((body: TaskFields) => body.priority !== undefined)
  @IsIn(TASK_PRIORITIES, { message: PRIORITY_MESSAGE })
  priority?: TaskPriority;
}

/** Corpo de `POST /projects/{projectId}/tasks`. Sem `status` (PN10) nem `projectId`. */
export class CreateTaskRequest extends TaskFields {
  /** Responsáveis (DE16), sem repetidos; omitido ou vazio = "Sem responsável". */
  @IsOptional()
  @IsArray({ message: 'Os responsáveis têm de ser uma lista.' })
  // O PostgreSQL compara UUID sem distinguir maiúsculas: aqui também.
  @ArrayUnique(sameUuid, {
    message: 'Os responsáveis não podem ter repetidos.',
  })
  @IsUUID('all', { each: true, message: 'Um dos responsáveis não é válido.' })
  assigneeIds?: string[];
}

/**
 * Corpo de `PATCH /tasks/{taskId}`: pelo menos um campo; sem `status`,
 * `projectId` nem responsáveis (mudam-se com `/tasks/{taskId}/assignees`).
 */
export class UpdateTaskRequest extends TaskFields {}

/** Corpo de `POST /tasks/{taskId}/assignees` (`AccountIdRequest`, DE16). */
export class AddAssigneeRequest {
  @IsUUID('all', { message: 'A conta não é válida.' })
  accountId!: string;
}

/** Corpo de `PUT /tasks/{taskId}/status` (US07): só o estado. */
export class ChangeTaskStatusRequest {
  @IsIn(TASK_STATUSES, { message: STATUS_MESSAGE })
  status!: TaskStatus;
}

/** Query de `GET /projects/{projectId}/tasks` (PN20). */
export class ListTasksQuery {
  @IsOptional()
  @IsIn(TASK_STATUSES, { message: STATUS_MESSAGE })
  status?: TaskStatus;

  @IsOptional()
  @IsIn(TASK_PRIORITIES, { message: PRIORITY_MESSAGE })
  priority?: TaskPriority;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'A página tem de ser um número inteiro.' })
  @Min(1, { message: 'A página começa em 1.' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O tamanho da página tem de ser um número inteiro.' })
  @Min(1, {
    message: `O tamanho da página tem de estar entre 1 e ${PAGE_SIZE_MAX}.`,
  })
  @Max(PAGE_SIZE_MAX, {
    message: `O tamanho da página tem de estar entre 1 e ${PAGE_SIZE_MAX}.`,
  })
  pageSize: number = PAGE_SIZE_DEFAULT;
}
