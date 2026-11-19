// Troca da palavra-passe das contas de demonstração (as do seed, com email
// @matriz.test). Usada por reset-demo-passwords.ts; separada para ser testada
// contra a base de dados de testes.
import bcrypt from 'bcryptjs';
import type { PrismaClient } from '../src/generated/prisma/client.js';

/** O mesmo custo e o mesmo mínimo do seed (D06, DE15). */
export const BCRYPT_COST = 12;
export const MIN_PASSWORD_LENGTH = 12;

/** Domínio das contas de demonstração do seed (.test é reservado: nunca é real). */
export const DEMO_EMAIL_DOMAIN = '@matriz.test';

/**
 * Contas afetadas: as de demonstração que já têm palavra-passe. As pendentes
 * ficam sem palavra-passe (DE15).
 */
export const demoAccountsWithPassword = {
  email: { endsWith: DEMO_EMAIL_DOMAIN },
  passwordHash: { not: null },
} as const;

export function assertValidPassword(password: string): void {
  if (password.trim().length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `A palavra-passe tem de ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres (DE15).`,
    );
  }
}

/** Emails das contas que `resetDemoPasswords` vai mudar, por ordem. */
export async function listDemoAccounts(prisma: PrismaClient): Promise<string[]> {
  const accounts = await prisma.account.findMany({
    where: demoAccountsWithPassword,
    select: { email: true },
    orderBy: { email: 'asc' },
  });
  return accounts.map((a) => a.email);
}

/**
 * Guarda o hash bcrypt de `password` nas contas de demonstração com
 * palavra-passe. Não muda mais nada (nem estados, nem projetos, nem tarefas).
 * Devolve o número de contas alteradas.
 */
export async function resetDemoPasswords(
  prisma: PrismaClient,
  password: string,
  cost = BCRYPT_COST,
): Promise<number> {
  assertValidPassword(password);
  const passwordHash = await bcrypt.hash(password, cost);
  const { count } = await prisma.account.updateMany({
    where: demoAccountsWithPassword,
    data: { passwordHash },
  });
  return count;
}
