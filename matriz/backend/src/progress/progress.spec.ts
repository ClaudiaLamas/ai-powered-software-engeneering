import { percentDone, progressFrom } from './progress.js';

describe('percentDone (PN13)', () => {
  it('é null sem tarefas ("Sem tarefas")', () => {
    expect(percentDone(0, 0)).toBeNull();
  });

  it('dá 75 com 3 de 4 tarefas concluídas (US05)', () => {
    expect(percentDone(3, 4)).toBe(75);
  });

  it('arredonda à unidade', () => {
    expect(percentDone(1, 3)).toBe(33);
    expect(percentDone(2, 3)).toBe(67);
    expect(percentDone(1, 8)).toBe(13);
  });

  it('dá 0 sem tarefas concluídas e 100 com todas', () => {
    expect(percentDone(0, 5)).toBe(0);
    expect(percentDone(5, 5)).toBe(100);
  });
});

describe('progressFrom', () => {
  it('soma os estados e calcula a percentagem', () => {
    expect(progressFrom({ TODO: 1, DONE: 3 })).toEqual({
      todo: 1,
      inProgress: 0,
      done: 3,
      total: 4,
      percentDone: 75,
    });
  });

  it('sem contagens, tudo a 0 e percentagem null', () => {
    expect(progressFrom({})).toEqual({
      todo: 0,
      inProgress: 0,
      done: 0,
      total: 0,
      percentDone: null,
    });
  });
});
