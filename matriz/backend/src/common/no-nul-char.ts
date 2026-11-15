import { Matches } from 'class-validator';

/**
 * Recusa o carácter nulo (`\u0000`) num texto do pedido: o PostgreSQL não o
 * aceita em colunas de texto e a escrita falhava com `500`. É um erro de
 * formato (`400 VALIDATION_ERROR`, antes do `404`), como o tipo errado.
 */
export const NoNulChar = () =>
  // O carácter de controlo é o que se quer recusar.
  // oxlint-disable-next-line eslint/no-control-regex
  Matches(/^[^\u0000]*$/, { message: 'O texto tem um carácter inválido.' });
