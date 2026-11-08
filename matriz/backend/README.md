# Matriz — backend

API da Matriz: monólito modular em NestJS e TypeScript, com PostgreSQL e Prisma
(ver [docs/architecture.md](../docs/architecture.md) e o contrato em
[openapi.yaml](../openapi.yaml)).

## Requisitos

- Node.js na versão indicada em [`.nvmrc`](../.nvmrc) (`nvm use` na raiz do repositório).
- O PostgreSQL do [`docker-compose.yml`](../docker-compose.yml) a correr.

## Preparar

```bash
cp .env.example .env    # muda os valores fictícios
npm install
```

Os valores de `DATABASE_URL` têm de coincidir com os do `.env` da raiz, que o
`docker-compose.yml` usa. O esquema da base de dados (`prisma/schema.prisma`)
entra no incremento 1 ([docs/implementation-plan.md](../docs/implementation-plan.md)).

## Comandos

| Comando | O que faz |
|---|---|
| `npm run start:dev` | Arranca a API em modo de desenvolvimento, a recarregar ao gravar |
| `npm run build` | Compila para `dist/` |
| `npm test` | Testes unitários (Vitest) |
| `npm run test:e2e` | Testes de API (Vitest + Supertest) |
| `npm run test:cov` | Testes unitários com cobertura |
| `npm run lint` | Verificação do código (oxlint) |
| `npm run format` | Formatação (Prettier) |
