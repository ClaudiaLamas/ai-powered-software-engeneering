import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';

/** Corpo de `POST /auth/login` (`LoginRequest` em openapi.yaml). */
export class LoginRequest {
  /** Aparado antes de ser validado: espaços à volta do email não o tornam inválido. */
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsEmail({}, { message: 'Indique um email válido.' })
  email!: string;

  @IsString({ message: 'Indique a palavra-passe.' })
  @MinLength(1, { message: 'Indique a palavra-passe.' })
  password!: string;
}
