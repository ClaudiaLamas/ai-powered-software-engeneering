import { IsEmail, IsString, MinLength } from 'class-validator';

/** Corpo de `POST /auth/login` (`LoginRequest` em openapi.yaml). */
export class LoginRequest {
  @IsEmail({}, { message: 'Indique um email válido.' })
  email!: string;

  @IsString({ message: 'Indique a palavra-passe.' })
  @MinLength(1, { message: 'Indique a palavra-passe.' })
  password!: string;
}
