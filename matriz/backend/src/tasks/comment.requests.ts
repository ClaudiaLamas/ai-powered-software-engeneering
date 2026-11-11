import { IsString, ValidateIf } from 'class-validator';

/**
 * Corpo de `POST /tasks/{taskId}/comments` e de `PATCH /comments/{commentId}`
 * (`CommentBodyRequest`, openapi.yaml). Só o texto: `authorId`, `taskId`,
 * `createdAt` ou qualquer outro campo dá `400 VALIDATION_ERROR` (campo
 * desconhecido); o autor é a conta do token e as datas são da base de dados
 * e do backend. Aqui só se valida o tipo; o comprimento e "não só espaços"
 * (PN15) são verificados no serviço, depois do `404`, do `403` e do `409`.
 */
export class CommentBodyRequest {
  /** Em falta dá `BODY_INVALID` no serviço; `null` ou outro tipo é erro de formato. */
  @ValidateIf((request: CommentBodyRequest) => request.body !== undefined)
  @IsString({ message: 'O comentário tem de ser texto.' })
  body?: string;
}
