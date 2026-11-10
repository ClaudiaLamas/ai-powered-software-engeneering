import { ProblemException } from '../common/problem.js';
import {
  DESCRIPTION_MAX,
  TITLE_MAX,
  TITLE_MIN,
  normalizeDescription,
  normalizeTitle,
} from './task-rules.js';

function problemOf(fn: () => unknown): ProblemException {
  try {
    fn();
  } catch (error) {
    if (error instanceof ProblemException) return error;
    throw error;
  }
  throw new Error('Era esperado um ProblemException.');
}

describe('Regras da tarefa (PN12)', () => {
  describe('normalizeTitle', () => {
    it('guarda o título sem os espaços das pontas', () => {
      expect(normalizeTitle('  Rever textos  ')).toBe('Rever textos');
    });

    it.each([
      ['no mínimo', 'a'.repeat(TITLE_MIN)],
      ['no máximo', 'a'.repeat(TITLE_MAX)],
      ['no máximo, com espaços nas pontas', `  ${'a'.repeat(TITLE_MAX)}  `],
      ['no máximo, com acentos', 'é'.repeat(TITLE_MAX)],
    ])('aceita um título com o comprimento %s', (_, title) => {
      expect(() => normalizeTitle(title)).not.toThrow();
    });

    it.each([
      ['em falta', undefined],
      ['vazio', ''],
      ['só com espaços', '     '],
      ['curto demais', 'ab'],
      ['curto demais depois de aparado', '  ab  '],
      ['longo demais', 'a'.repeat(TITLE_MAX + 1)],
    ])('recusa um título %s com TITLE_INVALID', (_, title) => {
      const problem = problemOf(() => normalizeTitle(title));
      expect(problem.status).toBe(400);
      expect(problem.code).toBe('TITLE_INVALID');
      expect(problem.options.errors).toEqual([
        { field: 'title', message: expect.any(String) },
      ]);
    });
  });

  describe('normalizeDescription', () => {
    it.each([
      ['em falta', undefined],
      ['null', null],
      ['vazia', ''],
      ['só com espaços', '   \n  '],
    ])('uma descrição %s fica null ("sem descrição")', (_, description) => {
      expect(normalizeDescription(description)).toBeNull();
    });

    it('guarda a descrição como foi escrita', () => {
      expect(normalizeDescription('  Rever a página.\n')).toBe(
        '  Rever a página.\n',
      );
    });

    it('aceita 2000 caracteres', () => {
      const text = 'a'.repeat(DESCRIPTION_MAX);
      expect(normalizeDescription(text)).toBe(text);
    });

    it('recusa mais de 2000 caracteres com DESCRIPTION_TOO_LONG', () => {
      const problem = problemOf(() =>
        normalizeDescription('a'.repeat(DESCRIPTION_MAX + 1)),
      );
      expect(problem.status).toBe(400);
      expect(problem.code).toBe('DESCRIPTION_TOO_LONG');
    });
  });
});
