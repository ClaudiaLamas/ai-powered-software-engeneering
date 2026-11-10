import { IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

/**
 * Corpos dos pedidos de projetos (openapi.yaml). Aqui só se valida o formato
 * (`400 VALIDATION_ERROR`): tipos, UUID e campos desconhecidos. As regras
 * (comprimentos, Gestor em falta ou desativado) são verificadas no serviço,
 * depois do `404`, como pede a ordem das verificações do contrato.
 */

/** Corpo de `POST /projects` (`CreateProjectRequest`). */
export class CreateProjectRequest {
  /** Em falta dá `NAME_INVALID` no serviço; `null` ou outro tipo é erro de formato. */
  @ValidateIf((body: CreateProjectRequest) => body.name !== undefined)
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  /** Em falta dá `MANAGER_REQUIRED` no serviço; `null` ou um valor que não é UUID é erro de formato. */
  @ValidateIf((body: CreateProjectRequest) => body.managerId !== undefined)
  @IsUUID('all')
  managerId?: string;
}

/** Corpo de `PATCH /projects/{projectId}` (`UpdateProjectRequest`): pelo menos um campo. */
export class UpdateProjectRequest {
  @ValidateIf((body: UpdateProjectRequest) => body.name !== undefined)
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;
}
