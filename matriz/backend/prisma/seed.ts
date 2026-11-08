// Seed de demonstração da Matriz (incremento 1; ver docs/implementation-plan.md).
//
// Corre só a pedido: `npm run db:seed` (ou `npx prisma db seed`). Nunca corre no
// arranque da aplicação.
//
// Idempotente: cada registo tem um identificador fixo (as contas usam o email,
// que é único). O seed só cria o que falta; o que já existe fica como está —
// nunca altera nem apaga dados.
//
// Todos os dados são fictícios. A palavra-passe das contas de demonstração vem
// de SEED_DEMO_PASSWORD (backend/.env, ignorado pelo Git) e é guardada como
// hash bcrypt (D06).
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import {
  AccountStatus,
  PrismaClient,
  ProjectRole,
  TaskStatus,
} from '../src/generated/prisma/client.js';

const BCRYPT_COST = 12;
const MIN_PASSWORD_LENGTH = 12; // DE15

// ---------------------------------------------------------------------------
// Dados de demonstração
// ---------------------------------------------------------------------------

type AccountKey = 'system' | 'ana' | 'bruno' | 'carla' | 'duarte';

const ACCOUNTS: Record<
  AccountKey,
  {
    name: string;
    email: string;
    status: AccountStatus;
    isAdmin?: boolean;
    isSystemAccount?: boolean;
  }
> = {
  // Conta de sistema: primeiro Administrador, já ativa (DE04, PN16).
  system: {
    name: 'Administrador da Matriz',
    email: 'admin@matriz.test',
    status: AccountStatus.ACTIVE,
    isAdmin: true,
    isSystemAccount: true,
  },
  ana: {
    name: 'Ana Silva',
    email: 'ana.silva@matriz.test',
    status: AccountStatus.ACTIVE,
  },
  bruno: {
    name: 'Bruno Costa',
    email: 'bruno.costa@matriz.test',
    status: AccountStatus.ACTIVE,
  },
  // Pendente: sem palavra-passe nem token de ativação; não consegue entrar (DE15).
  carla: {
    name: 'Carla Mendes',
    email: 'carla.mendes@matriz.test',
    status: AccountStatus.PENDING,
  },
  // Desativada: tem palavra-passe, mas a entrada é recusada (US01, PN17).
  duarte: {
    name: 'Duarte Lopes',
    email: 'duarte.lopes@matriz.test',
    status: AccountStatus.DEACTIVATED,
  },
};

type ProjectKey = 'spring' | 'office' | 'portal';

// O Administrador só vê os projetos onde participa (DE02): a conta de sistema
// não é membro de nenhum. A Ana vê "spring" e "portal"; o Bruno vê "office" e "portal".
const PROJECTS: Record<
  ProjectKey,
  {
    id: string;
    name: string;
    description: string;
    members: { account: AccountKey; role: ProjectRole }[];
  }
> = {
  spring: {
    id: '5eed0000-0000-4000-8000-000000000101',
    name: 'Campanha de primavera',
    description: 'Preparação da campanha de marketing para a primavera.',
    members: [
      { account: 'ana', role: ProjectRole.MANAGER },
      // Uma conta pendente pode ser membro, mas não responsável (DE15).
      { account: 'carla', role: ProjectRole.MEMBER },
    ],
  },
  office: {
    id: '5eed0000-0000-4000-8000-000000000102',
    name: 'Renovação do escritório',
    description: 'Obras e mudança de mobiliário no piso 2.',
    members: [{ account: 'bruno', role: ProjectRole.MANAGER }],
  },
  portal: {
    id: '5eed0000-0000-4000-8000-000000000103',
    name: 'Portal de clientes',
    description: 'Nova área reservada para os clientes consultarem encomendas.',
    members: [
      { account: 'ana', role: ProjectRole.MANAGER },
      { account: 'bruno', role: ProjectRole.MEMBER },
    ],
  },
};

type TaskKey =
  | 'springBrief'
  | 'springVisuals'
  | 'springBudget'
  | 'officeQuotes'
  | 'officeMove'
  | 'portalLogin'
  | 'portalOrders'
  | 'portalDesign'
  | 'portalTests';

// Responsáveis: só membros ativos do projeto, ou nenhum ("Sem responsável", DE09).
const TASKS: Record<
  TaskKey,
  {
    id: string;
    project: ProjectKey;
    title: string;
    description?: string;
    status: TaskStatus;
    assignee?: AccountKey;
  }
> = {
  springBrief: {
    id: '5eed0000-0000-4000-8000-000000000201',
    project: 'spring',
    title: 'Escrever o briefing da campanha',
    description: 'Objetivos, público-alvo e mensagens principais.',
    status: TaskStatus.DONE,
    assignee: 'ana',
  },
  springVisuals: {
    id: '5eed0000-0000-4000-8000-000000000202',
    project: 'spring',
    title: 'Escolher as imagens da campanha',
    status: TaskStatus.TODO,
  },
  springBudget: {
    id: '5eed0000-0000-4000-8000-000000000203',
    project: 'spring',
    title: 'Aprovar o orçamento',
    status: TaskStatus.IN_PROGRESS,
    assignee: 'ana',
  },
  officeQuotes: {
    id: '5eed0000-0000-4000-8000-000000000204',
    project: 'office',
    title: 'Pedir três orçamentos de obras',
    status: TaskStatus.IN_PROGRESS,
    assignee: 'bruno',
  },
  officeMove: {
    id: '5eed0000-0000-4000-8000-000000000205',
    project: 'office',
    title: 'Planear a mudança do mobiliário',
    status: TaskStatus.TODO,
  },
  portalLogin: {
    id: '5eed0000-0000-4000-8000-000000000206',
    project: 'portal',
    title: 'Definir o fluxo de entrada dos clientes',
    description:
      'Entrada com email e palavra-passe; recuperação de acesso fica para depois.',
    status: TaskStatus.DONE,
    assignee: 'ana',
  },
  portalOrders: {
    id: '5eed0000-0000-4000-8000-000000000207',
    project: 'portal',
    title: 'Listar as encomendas do cliente',
    status: TaskStatus.IN_PROGRESS,
    assignee: 'bruno',
  },
  portalDesign: {
    id: '5eed0000-0000-4000-8000-000000000208',
    project: 'portal',
    title: 'Rever o design da página inicial',
    status: TaskStatus.TODO,
    assignee: 'bruno',
  },
  portalTests: {
    id: '5eed0000-0000-4000-8000-000000000209',
    project: 'portal',
    title: 'Preparar os testes de aceitação',
    status: TaskStatus.TODO,
  },
};

// Autores: membros do projeto da tarefa (PN15).
const COMMENTS: {
  id: string;
  task: TaskKey;
  author: AccountKey;
  body: string;
}[] = [
  {
    id: '5eed0000-0000-4000-8000-000000000301',
    task: 'springBudget',
    author: 'ana',
    body: 'Falta a confirmação da direção financeira.',
  },
  {
    id: '5eed0000-0000-4000-8000-000000000302',
    task: 'officeQuotes',
    author: 'bruno',
    body: 'Já recebi dois orçamentos; o terceiro chega na próxima semana.',
  },
  {
    id: '5eed0000-0000-4000-8000-000000000303',
    task: 'portalOrders',
    author: 'bruno',
    body: 'Começo pela listagem; os detalhes da encomenda ficam para a seguir.',
  },
  {
    id: '5eed0000-0000-4000-8000-000000000304',
    task: 'portalOrders',
    author: 'ana',
    body: 'Combinado. Mostra primeiro as encomendas mais recentes.',
  },
  {
    id: '5eed0000-0000-4000-8000-000000000305',
    task: 'portalDesign',
    author: 'ana',
    body: 'Usa as cores da marca que estão no guia de estilo.',
  },
];

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Falta a variável de ambiente ${name} (ver backend/.env.example).`,
    );
  }
  return value;
}

const counts = { created: 0, existing: 0, skipped: 0 };

function skip(message: string): void {
  counts.skipped++;
  console.warn(message);
}

async function ensure<T>(
  find: () => Promise<T | null>,
  create: () => Promise<T>,
): Promise<T> {
  const found = await find();
  if (found) {
    counts.existing++;
    return found;
  }
  counts.created++;
  return create();
}

async function main(): Promise<void> {
  const databaseUrl = requireEnv('DATABASE_URL');
  const password = requireEnv('SEED_DEMO_PASSWORD');
  if (password.trim().length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `SEED_DEMO_PASSWORD tem de ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres (DE15).`,
    );
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });

  try {
    // Contas, pelo email (único). O hash só é calculado para contas que faltam.
    // Guarda-se o estado atual: uma conta que já existia pode ter mudado de estado.
    const accounts = {} as Record<
      AccountKey,
      { id: string; name: string; status: AccountStatus }
    >;
    for (const [key, data] of Object.entries(ACCOUNTS) as [
      AccountKey,
      (typeof ACCOUNTS)[AccountKey],
    ][]) {
      const account = await ensure(
        () => prisma.account.findUnique({ where: { email: data.email } }),
        async () =>
          prisma.account.create({
            data: {
              ...data,
              // Contas pendentes ficam sem palavra-passe (DE15).
              passwordHash:
                data.status === AccountStatus.PENDING
                  ? null
                  : await bcrypt.hash(password, BCRYPT_COST),
            },
          }),
      );
      accounts[key] = account;
    }

    // Responsável e autor de comentários: membro do projeto com conta ativa,
    // no momento em que são escolhidos (PN06, PN08).
    const isActiveMember = async (
      key: AccountKey,
      projectId: string,
    ): Promise<boolean> =>
      accounts[key].status === AccountStatus.ACTIVE &&
      (await prisma.projectMember.findUnique({
        where: {
          projectId_accountId: { projectId, accountId: accounts[key].id },
        },
      })) !== null;

    // Projetos e membros.
    for (const project of Object.values(PROJECTS)) {
      await ensure(
        () => prisma.project.findUnique({ where: { id: project.id } }),
        () =>
          prisma.project.create({
            data: {
              id: project.id,
              name: project.name,
              description: project.description,
            },
          }),
      );

      for (const member of project.members) {
        const { id: accountId, name, status } = accounts[member.account];
        // Contas desativadas não são adicionadas a projetos (PN08, PN14);
        // as pendentes podem ser (DE15).
        if (status === AccountStatus.DEACTIVATED) {
          const existing = await prisma.projectMember.findUnique({
            where: {
              projectId_accountId: { projectId: project.id, accountId },
            },
          });
          if (!existing) {
            skip(
              `${name} está desativada; não é adicionada a "${project.name}".`,
            );
          } else {
            counts.existing++;
          }
          continue;
        }
        if (member.role === ProjectRole.MANAGER) {
          // No máximo um Gestor por projeto (DE06): se já houver outro, não se mexe.
          const manager = await prisma.projectMember.findFirst({
            where: { projectId: project.id, role: ProjectRole.MANAGER },
          });
          if (manager && manager.accountId !== accountId) {
            skip(`"${project.name}" já tem outro Gestor; mantém-se.`);
            continue;
          }
        }
        await ensure(
          () =>
            prisma.projectMember.findUnique({
              where: {
                projectId_accountId: { projectId: project.id, accountId },
              },
            }),
          () =>
            prisma.projectMember.create({
              data: { projectId: project.id, accountId, role: member.role },
            }),
        );
      }
    }

    // Tarefas. Se o responsável previsto já não puder ser escolhido, a tarefa
    // é criada "Sem responsável" (DE09).
    for (const task of Object.values(TASKS)) {
      const projectId = PROJECTS[task.project].id;
      await ensure(
        () => prisma.task.findUnique({ where: { id: task.id } }),
        async () => {
          let assigneeId: string | null = null;
          if (task.assignee) {
            if (await isActiveMember(task.assignee, projectId)) {
              assigneeId = accounts[task.assignee].id;
            } else {
              console.warn(
                `${accounts[task.assignee].name} não é membro ativo do projeto; ` +
                  `"${task.title}" fica sem responsável.`,
              );
            }
          }
          return prisma.task.create({
            data: {
              id: task.id,
              projectId,
              title: task.title,
              description: task.description,
              status: task.status,
              assigneeId,
            },
          });
        },
      );
    }

    // Comentários.
    for (const comment of COMMENTS) {
      const existing = await prisma.comment.findUnique({
        where: { id: comment.id },
      });
      if (
        !existing &&
        !(await isActiveMember(
          comment.author,
          PROJECTS[TASKS[comment.task].project].id,
        ))
      ) {
        skip(
          `${accounts[comment.author].name} não é membro ativo do projeto; ` +
            `o comentário ${comment.id} não é criado.`,
        );
        continue;
      }
      await ensure(
        () => prisma.comment.findUnique({ where: { id: comment.id } }),
        () =>
          prisma.comment.create({
            data: {
              id: comment.id,
              taskId: TASKS[comment.task].id,
              authorId: accounts[comment.author].id,
              body: comment.body,
            },
          }),
      );
    }

    console.log(
      `Seed concluído: ${counts.created} criados, ${counts.existing} já existiam` +
        (counts.skipped ? `, ${counts.skipped} ignorados.` : '.'),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
