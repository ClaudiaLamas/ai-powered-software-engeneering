import { ProblemException } from '../common/problem.js';
import { normalizeDescription, normalizeName } from './project-rules.js';

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(ProblemException);
    return (error as ProblemException).code;
  }
  return undefined;
}

describe('normalizeName (PN12)', () => {
  it('apara os espaços das pontas', () => {
    expect(normalizeName('  Site  ')).toBe('Site');
  });

  it('aceita 3 e 100 caracteres', () => {
    expect(normalizeName('abc')).toBe('abc');
    expect(normalizeName('a'.repeat(100))).toHaveLength(100);
  });

  it.each([
    ['em falta', undefined],
    ['vazio', ''],
    ['só espaços', '     '],
    ['com 2 caracteres', 'ab'],
    ['com 2 caracteres depois de aparar', '  ab  '],
    ['com 101 caracteres', 'a'.repeat(101)],
  ])('recusa um nome %s com NAME_INVALID', (_, name) => {
    expect(codeOf(() => normalizeName(name))).toBe('NAME_INVALID');
  });

  it('conta caracteres, não unidades UTF-16', () => {
    expect(normalizeName('😀'.repeat(100))).toBe('😀'.repeat(100));
  });
});

describe('normalizeDescription (PN12)', () => {
  it.each([
    ['em falta', undefined],
    ['null', null],
    ['vazia', ''],
    ['só com espaços', '   '],
  ])('fica null quando está %s', (_, description) => {
    expect(normalizeDescription(description)).toBeNull();
  });

  it('é guardada como foi escrita', () => {
    expect(normalizeDescription(' Texto ')).toBe(' Texto ');
  });

  it('aceita 1000 caracteres e recusa 1001 com DESCRIPTION_TOO_LONG', () => {
    expect(normalizeDescription('a'.repeat(1000))).toHaveLength(1000);
    expect(codeOf(() => normalizeDescription('a'.repeat(1001)))).toBe(
      'DESCRIPTION_TOO_LONG',
    );
  });
});
