# Matriz

Matriz é uma aplicação de gestão de projetos e tarefas para equipas de trabalho. Esta pasta contém a especificação (requisitos, âmbito do MVP, user stories, restrições, arquitetura, modelo de dados, contrato da API e um wireframe do dashboard) e o código em implementação: `backend/` (NestJS) e `frontend/` (Vue). O estado de cada incremento está em [docs/implementation-plan.md](docs/implementation-plan.md).

> **Estado:** especificação inicial, **não validada pelo cliente**. Só F1–F5 são factos. Tudo o resto (P, R, DE, PN, D) são pressupostos ou decisões internas, que devem ser confirmados antes do desenvolvimento.

## O que o cliente pediu

A única informação dada pelo cliente foi esta frase:

> "Precisamos de uma aplicação onde as nossas equipas possam organizar projetos, gerir tarefas e acompanhar o progresso do trabalho."

Daqui saem os factos F1–F5, descritos em [docs/requirements.md](docs/requirements.md).

## Âmbito do MVP

O MVP inclui **apenas as funcionalidades Must** (proposta, por validar):

| ID | Funcionalidade |
|---|---|
| FN01 | Acesso identificado: cada pessoa entra com a sua conta |
| FN02 | Administrador cria e desativa contas e dá ou retira a permissão de Administrador |
| FN03 | Administrador cria projetos e atribui o Gestor; Gestor edita e arquiva o projeto |
| FN04 | Gestor adiciona e remove membros de um projeto |
| FN05 | Ver a lista dos projetos a que pertenço |
| FN06 | Gestor cria, edita e elimina tarefas (título, descrição, responsável) |
| FN07 | Mudar o estado de uma tarefa (Por fazer, Em curso, Concluída) |
| FN08 | Ver as tarefas de um projeto agrupadas por estado |
| FN09 | Indicador de progresso por projeto (nº de tarefas por estado e % concluídas) |
| FN14 | Comentários em tarefas |
| FN27 | Administrador troca o Gestor de um projeto |
| FN28 | Registo das ações administrativas |

Proposta, em resumo: o Administrador cria as contas e os projetos e atribui a cada projeto um Gestor. O Gestor forma a equipa do projeto e cria as tarefas, cada uma com um só responsável. Os membros avançam as tarefas por três estados fixos e comentam-nas. O progresso é acompanhado por projeto, com as tarefas agrupadas por estado e a percentagem de tarefas concluídas.

Prazos, prioridades, notificações, relatórios e pedidos de ajuda numa tarefa ficam **fora do MVP** (FN10–FN13, FN15–FN26, FN29).

## Glossário

| Termo | Significado |
|---|---|
| Conta | Acesso identificado de uma pessoa à Matriz (nome e email único). Não tem papel próprio. Está "Pendente" até a pessoa definir a palavra-passe pelo link de ativação, depois "Ativa" e, se for desativada, "Desativada" (DE15). |
| Conta de sistema | A primeira conta de Administrador, criada pela equipa do projeto. Não pode ser desativada nem perder a permissão (DE04). |
| Administrador | **Permissão da conta**, não uma função num projeto. Permite gerir contas, permissões, projetos e Gestores. Não dá acesso ao conteúdo de projetos onde a conta não participa (DE02). |
| Função | O que uma conta é num projeto concreto: Gestor ou Membro. A mesma conta pode ser Gestor no projeto A e Membro no projeto B (DE01). |
| Gestor | Função num projeto. Cada projeto tem exatamente um. Edita e arquiva o projeto, forma a equipa e gere as tarefas (DE06, DE07, DE09). |
| Membro | Função num projeto. Muda o estado das tarefas e comenta-as (DE10). |
| membro do projeto | Em minúscula: qualquer conta que participa no projeto, seja Gestor ou Membro. |
| Equipa | O conjunto dos membros de um projeto. Não é uma entidade separada (R6). |
| Responsável | O único membro do projeto encarregado de uma tarefa (DE09). |

As funções e a permissão são **decisões internas, por validar com o cliente** (DE01–DE15).

## Execução local

Ainda não é possível entrar na aplicação: o login (US01) faz parte do incremento 1, que está em curso. Por agora, arrancam o PostgreSQL, o backend (com `GET /health`) e o frontend gerado pelo `create-vue`.

### 1. Requisitos

- Node.js na versão de [`.nvmrc`](.nvmrc) (26.13.0 LTS): `nvm install` e depois `nvm use` nesta pasta.
- Docker com Docker Compose, para o PostgreSQL.

### 2. Instalação

```bash
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### 3. Configuração do `.env`

Há três ficheiros `.env`, todos ignorados pelo Git. Cria cada um a partir do `.env.example` respetivo e muda os valores fictícios:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

| Ficheiro | Variáveis | Para quê |
|---|---|---|
| `.env` | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT` | Utilizador, palavra-passe, base de dados e porta do PostgreSQL do `docker-compose.yml` |
| `backend/.env` | `PORT` | Porta da API (por omissão, 3000) |
| | `DATABASE_URL` | Ligação ao PostgreSQL. Tem de usar os mesmos valores do `.env` da raiz |
| | `JWT_SECRET` | Segredo para assinar os JWT (D06). Usa um valor aleatório e longo |
| | `SEED_DEMO_PASSWORD` | Palavra-passe das contas de demonstração do seed, com pelo menos 12 caracteres |
| `frontend/.env` | `VITE_API_URL` | Endereço da API. Fica visível no navegador: não ponhas segredos aqui |

O backend carrega `backend/.env` ao arrancar. As variáveis já definidas no ambiente têm prioridade sobre as do ficheiro.

### 4. Arranque do PostgreSQL

```bash
docker compose up -d
docker compose ps        # espera pelo estado "healthy"
```

O PostgreSQL só aceita ligações da própria máquina (`127.0.0.1`). Os dados ficam no volume `matriz_pgdata`.

### 5. Migrations

```bash
cd backend
npx prisma generate         # gera o cliente Prisma em src/generated/ (ignorado pelo Git)
npx prisma migrate deploy   # aplica as migrations de prisma/migrations/
```

Volta a correr `npx prisma generate` sempre que `prisma/schema.prisma` mudar.

### 6. Seed

```bash
cd backend
npm run db:seed
```

O seed cria os dados de demonstração. Nunca corre no arranque e pode correr várias vezes: só cria o que falta e nunca altera nem apaga dados. Por isso, mudar `SEED_DEMO_PASSWORD` depois do seed não muda a palavra-passe das contas já criadas. Se `SEED_DEMO_PASSWORD` faltar ou tiver menos de 12 caracteres, o seed pára com uma mensagem.

### 7. Contas de demonstração

Todas as contas com palavra-passe usam o valor de `SEED_DEMO_PASSWORD`. Os dados são fictícios.

| Conta | Estado | Projetos (função) |
|---|---|---|
| `admin@matriz.test` (conta de sistema, Administrador) | Ativa | nenhum: o Administrador só vê os projetos onde participa (DE02) |
| `ana.silva@matriz.test` | Ativa | Campanha de primavera (Gestor), Portal de clientes (Gestor) |
| `bruno.costa@matriz.test` | Ativa | Renovação do escritório (Gestor), Portal de clientes (Membro) |
| `carla.mendes@matriz.test` | Pendente, sem palavra-passe | Campanha de primavera (Membro) |
| `duarte.lopes@matriz.test` | Desativada | nenhum |

### 8. Arranque do backend

```bash
cd backend
npm run start:dev
```

A API fica em `http://localhost:3000`. Para confirmar que arrancou e que acede à base de dados:

```bash
curl -i http://localhost:3000/health
```

Responde `200 {"status":"ok","database":"up"}` ou, sem acesso à base de dados, `503 {"status":"error","database":"down"}`. Outros comandos (testes, lint, build) estão em [backend/README.md](backend/README.md).

### 9. Arranque do frontend

```bash
cd frontend
npm run dev
```

Abre `http://localhost:5173`. Outros comandos estão em [frontend/README.md](frontend/README.md).

## Documentação

| Ficheiro | Conteúdo |
|---|---|
| [docs/requirements.md](docs/requirements.md) | Factos, pressupostos, respostas assumidas, decisões internas, funções, funcionalidades e âmbito do MVP. |
| [docs/user-stories.md](docs/user-stories.md) | User stories do MVP, critérios de aceitação, casos-limite e pressupostos de regras (PN). |
| [docs/constraints.md](docs/constraints.md) | Restrições de âmbito, permissões, requisitos não funcionais, decisões técnicas e questões em aberto. |
| [docs/architecture.md](docs/architecture.md) | Decisão de arquitetura (D07: monólito modular), componentes, responsabilidades e dependências entre módulos. |
| [docs/database.md](docs/database.md) | Modelo de dados lógico do MVP, regras de integridade e diagrama ER. |
| [docs/implementation-plan.md](docs/implementation-plan.md) | Sequência de incrementos para implementar o MVP, com critérios e verificação. |
| [docs/ui/dashboard-wireframe.html](docs/ui/dashboard-wireframe.html) | Wireframe de baixa fidelidade do ecrã inicial e da vista de um projeto. |
| [openapi.yaml](openapi.yaml) | Contrato da API do backend para o MVP (US01–US19). |
| [AGENTS.md](AGENTS.md) | Instruções para agentes de IA que trabalhem no repositório. |

## Convenção de IDs

Os IDs são iguais em todos os ficheiros.

| Prefixo | Significado | Tipo |
|---|---|---|
| F1–F5 | Factos ditos pelo cliente | **Facto** |
| P1–P14 | Pressupostos implícitos identificados na análise inicial | Pressuposto |
| R1–R10 | Respostas assumidas às perguntas de clarificação prioritárias | Pressuposto |
| DE01–DE15 | Decisões da equipa do projeto (2026-10-29, 2026-11-04 e 2026-11-08), não validadas pelo cliente | Decisão interna |
| PN01–PN18 | Regras de negócio: concretizam decisões DE ou são pressupostos | Decisão interna ou pressuposto |
| D01–D09 | Decisões técnicas, todas tomadas, não validadas pelo cliente | Decisão interna |
| FN01–FN29 | Funcionalidades propostas | Proposta |
| US01–US19 | User stories do MVP | Proposta |
| US20–US36 | User stories fora do MVP | Proposta |
| CL1–CL12 | Casos-limite | Proposta |
| RNF01–RNF03 | Requisitos não funcionais | Pressuposto |
