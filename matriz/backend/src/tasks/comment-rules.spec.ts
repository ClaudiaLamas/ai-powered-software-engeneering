import { ProblemException } from '../common/problem.js';
import { COMMENT_BODY_MAX, normalizeCommentBody } from './comment-rules.js';

function problemOf(fn: () => unknown): ProblemException {
  try {
    fn();
  } catch (error) {
    if (error instanceof ProblemException) return error;
    throw error;
  }
  throw new Error('Era esperado um ProblemException.');
}

describe('Regras do comentário (PN15)', () => {
  it('guarda o texto sem os espaços das pontas', () => {
    expect(normalizeCommentBody('  \n Está pronto para rever. \t ')).toBe(
      'Está pronto para rever.',
    );
  });

  it('mantém os espaços e as quebras de linha do meio', () => {
    expect(normalizeCommentBody('Linha 1\n\nLinha  2')).toBe(
      'Linha 1\n\nLinha  2',
    );
  });

  it.each([
    ['com 1 caráter', 'a'],
    ['com 2000 caracteres', 'a'.repeat(COMMENT_BODY_MAX)],
    [
      'com 2000 caracteres e espaços nas pontas',
      `  ${'a'.repeat(COMMENT_BODY_MAX)}  `,
    ],
    ['com 2000 emojis (pontos de código)', '😀'.repeat(COMMENT_BODY_MAX)],
  ])('aceita um comentário %s', (_, body) => {
    expect(normalizeCommentBody(body)).toBe(body.trim());
  });

  it.each([
    ['em falta', undefined],
    ['vazio', ''],
    ['só com espaços', '   '],
    ['só com quebras de linha e tabs', '\n\t \n'],
  ])('recusa um comentário %s com BODY_INVALID', (_, body) => {
    const problem = problemOf(() => normalizeCommentBody(body));
    expect(problem.status).toBe(400);
    expect(problem.code).toBe('BODY_INVALID');
    expect(problem.toProblem().errors).toEqual([
      { field: 'body', message: 'O comentário não pode estar vazio.' },
    ]);
  });

  it('recusa um comentário com mais de 2000 caracteres com BODY_INVALID', () => {
    const problem = problemOf(() =>
      normalizeCommentBody('a'.repeat(COMMENT_BODY_MAX + 1)),
    );
    expect(problem.code).toBe('BODY_INVALID');
    expect(problem.detail).toBe(
      'O comentário pode ter no máximo 2000 caracteres.',
    );
  });
});
