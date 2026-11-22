// Muda a palavra-passe das contas de demonstração (@matriz.test) numa base de
// dados onde o seed já correu. O seed nunca altera contas que já existem: este
// script é para quando a palavra-passe usada no seed se perdeu (por exemplo, no
// Neon do deploy).
//
// Corre só a pedido, a partir de backend/, no mesmo terminal:
//
//   read -rs "DATABASE_URL?URL direct da base de dados: " && export DATABASE_URL
//   read -rs "RESET_DEMO_PASSWORD?Palavra-passe nova: " && export RESET_DEMO_PASSWORD
//   npx tsx prisma/reset-demo-passwords.ts
//
// Mostra o host da base de dados (sem credenciais) e as contas que vai mudar,
// e só altera depois de se escrever SIM. Não mostra palavras-passe nem hashes.
import 'dotenv/config';
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import {
  assertValidPassword,
  listDemoAccounts,
  resetDemoPasswords,
} from './demo-passwords.js';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta a variável de ambiente ${name}.`);
  return value;
}

async function main(): Promise<void> {
  const databaseUrl = requireEnv('DATABASE_URL');
  const password = requireEnv('RESET_DEMO_PASSWORD');
  assertValidPassword(password);

  // Host e nome da base de dados, sem utilizador nem palavra-passe.
  const url = new URL(databaseUrl);
  const host = `${url.host}${url.pathname}`;
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });

  try {
    const emails = await listDemoAccounts(prisma);
    if (emails.length === 0) {
      console.log(`Não há contas de demonstração com palavra-passe em ${host}. Nada a fazer.`);
      return;
    }
    console.log(`Base de dados: ${host}`);
    console.log(`Contas a mudar (${emails.length}):`);
    for (const email of emails) console.log(`  - ${email}`);

    const rl = createInterface({ input: stdin, output: stdout });
    const answer = await rl.question('Escreve SIM para mudar a palavra-passe destas contas: ');
    rl.close();
    if (answer.trim() !== 'SIM') {
      console.log('Cancelado: nada foi alterado.');
      return;
    }

    const count = await resetDemoPasswords(prisma, password);
    console.log(`Palavra-passe mudada em ${count} conta(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
