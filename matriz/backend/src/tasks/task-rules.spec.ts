import { ProblemException } from '../common/problem.js';
import {
  assigneesRemovedOnStatusChange,
  normalizeDescription,
  normalizeTitle,
} from './task-rules.js';

// Limites vindos do requisito, não do código de produção: se o código mudar
// sem o requisito mudar, estes testes falham.
const TITLE_MIN = 3; // PN12
const TITLE_MAX = 150; // PN12
const DESCRIPTION_MAX = 2000; // PN12

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
      // "Só espaços" é qualquer espaço em branco Unicode, como o pattern '\S'
      // do OpenAPI (docs/test-plan.md, H2).
      ['só com tabs', '\t\t\t'],
      ['só com quebras de linha', '\n\n\n'],
      ['só com espaços não separáveis (NBSP)', '   '],
      // Contagem em pontos de código (docs/test-plan.md, H1).
      ['longo demais, com acentos', 'é'.repeat(TITLE_MAX + 1)],
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

describe('Reabrir uma tarefa (PN10, DE14, DE16)', () => {
  const member = { accountId: 'ana', active: true, isProjectMember: true };
  const formerMember = { accountId: 'rui', active: true, isProjectMember: false };
  const deactivated = { accountId: 'eva', active: false, isProjectMember: true };
  const both = { accountId: 'luis', active: false, isProjectMember: false };

  it.each([
    ['já não é membro', formerMember],
    ['tem a conta desativada', deactivated],
    ['está nas duas situações', both],
  ])('ao sair de "Concluída", tira o responsável que %s', (_, assignee) => {
    expect(assigneesRemovedOnStatusChange('DONE', 'IN_PROGRESS', [assignee])).toEqual([
      assignee.accountId,
    ]);
    expect(assigneesRemovedOnStatusChange('DONE', 'TODO', [assignee])).toEqual([
      assignee.accountId,
    ]);
  });

  it('tira só quem já não pode ser responsável e mantém os outros', () => {
    expect(
      assigneesRemovedOnStatusChange('DONE', 'TODO', [member, formerMember, deactivated]),
    ).toEqual(['rui', 'eva']);
  });

  it('mantém o responsável que continua membro com a conta ativa', () => {
    expect(assigneesRemovedOnStatusChange('DONE', 'TODO', [member])).toEqual([]);
  });

  it('não mexe nos responsáveis se a tarefa não sai de "Concluída"', () => {
    expect(assigneesRemovedOnStatusChange('DONE', 'DONE', [formerMember])).toEqual([]);
    expect(assigneesRemovedOnStatusChange('TODO', 'DONE', [deactivated])).toEqual([]);
    expect(assigneesRemovedOnStatusChange('IN_PROGRESS', 'TODO', [both])).toEqual([]);
  });

  it('sem responsáveis, não há nada a tirar', () => {
    expect(assigneesRemovedOnStatusChange('DONE', 'TODO', [])).toEqual([]);
  });
});
