# Matriz — backend

API da Matriz: monólito modular em NestJS e TypeScript, com PostgreSQL e Prisma
(ver [docs/architecture.md](../docs/architecture.md) e o contrato em
[openapi.yaml](../openapi.yaml)).

## Requisitos

- Node.js na versão indicada em [`.nvmrc`](../.nvmrc) (`nvm use` na raiz do repositório).
- O PostgreSQL do [`docker-compose.yml`](../docker-compose.yml) a correr.

## Preparar

```bash
cp .env.example .env        # muda os valores fictícios
npm install
npx prisma generate         # gera o cliente Prisma em src/generated/ (ignorado pelo Git)
npx prisma migrate deploy   # aplica as migrations à base de dados de DATABASE_URL
```

Os valores de `DATABASE_URL` têm de coincidir com os do `.env` da raiz, que o
`docker-compose.yml` usa. Volta a correr `npx prisma generate` sempre que
`prisma/schema.prisma` mudar.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run start:dev` | Arranca a API em modo de desenvolvimento, a recarregar ao gravar |
| `npm run build` | Compila para `dist/` |
| `npm test` | Testes unitários (Vitest) |
| `npm run test:e2e` | Testes de API (Vitest + Supertest), contra uma base de dados própria: a de `DATABASE_URL` com o nome terminado em `_test` (`matriz_test`), ou `TEST_DATABASE_URL`. Antes de cada execução aplica as migrations e esvazia todas as tabelas dessa base; recusa qualquer nome que não termine em `_test`. Precisa do PostgreSQL do `docker-compose.yml` a correr |
| `npm run test:cov` | Testes unitários com cobertura |
| `npm run lint` | Verificação do código (oxlint) |
| `npm run format` | Formatação (Prettier) |
| `curl -i localhost:3000/health` | Confirma que a API está a correr e acede à base de dados (`200` ou `503`) |
| `npm run db:seed` | Cria os dados de demonstração (só o que falta; ver abaixo) |

## Dados de demonstração

`npm run db:seed` corre [`prisma/seed.ts`](prisma/seed.ts) contra a base de dados
de `DATABASE_URL`. Nunca corre no arranque da API. Pode correr várias vezes: só cria
o que falta e nunca altera nem apaga dados existentes — por isso, mudar
`SEED_DEMO_PASSWORD` depois não muda a palavra-passe das contas já criadas.

Precisa de `SEED_DEMO_PASSWORD` no `.env` (pelo menos 12 caracteres): é a
palavra-passe de todas as contas de demonstração com palavra-passe.

| Conta | Estado | Projetos (função) |
|---|---|---|
| `admin@matriz.test` (conta de sistema, Administrador) | Ativa | nenhum (DE02) |
| `ana.silva@matriz.test` | Ativa | Campanha de primavera (Gestor), Portal de clientes (Gestor) |
| `bruno.costa@matriz.test` | Ativa | Renovação do escritório (Gestor), Portal de clientes (Membro) |
| `carla.mendes@matriz.test` | Pendente, sem palavra-passe | Campanha de primavera (Membro) |
| `duarte.lopes@matriz.test` | Desativada | nenhum |
