# Plano de implementação — Matriz

Este ficheiro define a sequência de incrementos para implementar o MVP (US01–US19, US22, US23, US31) com o contrato de [openapi.yaml](../openapi.yaml). Deriva de [requirements.md](requirements.md), [user-stories.md](user-stories.md), [constraints.md](constraints.md), [architecture.md](architecture.md) e [database.md](database.md).

Estado a 2026-11-15: os incrementos 1, 3, 4, 5, 6 e 9 estão "Em curso" e os 2, 7 e 8 estão "Por iniciar"; nenhum está "Concluído" (ver a secção 2 e o estado de cada um abaixo). A ordem dos incrementos e tudo o que está marcado como **proposta** são sugestões deste plano, por aprovar; o que está marcado como **confirmado** vem dos documentos.

## 1. Decisões confirmadas e propostas

### 1.1 Confirmadas

Registadas nos documentos (decisões internas, por validar com o cliente).

| Tema | Decisão | Origem |
|---|---|---|
| Arquitetura | Monólito modular, com os módulos `accounts`, `authorization`, `projects`, `tasks`, `progress` e `audit`; uma só base de dados | D07, architecture.md §3–§4 |
| Canal | Aplicação web, acedida pelo navegador e responsiva | D01 |
| Linguagem e frameworks | TypeScript; NestJS no backend; Vue.js no frontend | D02, D03 |
| Dados | PostgreSQL, com Prisma (migrations e seed); identificadores UUID | D04, constraints.md §4 |
| Execução | Local, com o PostgreSQL num container Docker (`compose.yaml`); deploy fora do âmbito | D05 |
| Autenticação | JWT no cabeçalho `Authorization: Bearer ...`, válido 1 hora, sem revogação; o token de uma conta desativada é recusado com `401` em cada pedido, mesmo antes de expirar (2026-11-09); palavras-passe com hash bcrypt (`bcryptjs`); `@nestjs/jwt` e Passport | D06 |
| Testes | Vitest no backend e no frontend; Supertest nos testes de API | D08 |
| Email | Mailpit no `compose.yaml` para os emails de ativação | D09, DE15 |
| Versões | LTS atual do Node.js e versões estáveis mais recentes das restantes, confirmadas nos sites oficiais na instalação | constraints.md §4 |
| Estrutura de pastas | `backend/` (NestJS) e `frontend/` (Vue) dentro de `matriz/`, com o `compose.yaml` na raiz de `matriz/` | Feito em 2026-11-08 |
| Criação dos projetos | Backend gerado com o Nest CLI; frontend gerado com `create-vue` (Vite, TypeScript, Vue Router, Vitest) | Feito em 2026-11-08 |
| Variáveis de ambiente do backend | `main.ts` carrega `backend/.env` com `process.loadEnvFile()` (nativo do Node.js, sem dependência); as variáveis já definidas no ambiente têm prioridade | Decidido em 2026-11-08 |
| Percurso do incremento 1 | Duas contas: o Administrador cria o projeto e o Gestor vê-o na listagem e consulta-o (DE02) | Decidido em 2026-11-08 |
| Dependências do seed e da autenticação | `bcryptjs`, `@prisma/adapter-pg` e `pg` (o Prisma 7 liga-se ao PostgreSQL por um driver adapter); `tsx` (desenvolvimento, para correr o seed) | Instaladas em 2026-11-08 |
| Dependências da autenticação e da validação | `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt` (e `@types/passport-jwt`), `class-validator`, `class-transformer`. `@nestjs/config` não é usado: `main.ts` já carrega o `.env`. Vue Router e `@vue/test-utils` já vinham com o `create-vue` | Instaladas em 2026-11-09 |
| Base de dados de testes | `matriz_test` (o nome de `DATABASE_URL` com `_test`, ou `TEST_DATABASE_URL`). Antes dos testes de API: `prisma migrate deploy` e esvaziar todas as tabelas; recusa nomes que não terminem em `_test`. Não usa `prisma migrate reset`, que o Prisma bloqueia quando é chamado por um agente de IA | Feito em 2026-11-09 |
| Token no frontend | Guardado em `sessionStorage`; vai no cabeçalho `Authorization: Bearer`. Um `401` num pedido com sessão apaga-a e volta ao ecrã de entrada com "A sessão expirou. Inicie sessão novamente." Sem refresh token | Decidido em 2026-11-09 |
| Ligação do frontend à API | Em desenvolvimento (e no `npm run preview`, que usa o mesmo `proxy`), o Vite encaminha `/api` para o backend (`VITE_API_URL` em `frontend/.env`, por omissão `http://localhost:3000`); o backend não tem CORS | Decidido em 2026-11-09 |
| Autorização no backend | Guard JWT global (todas as rotas exigem sessão, exceto `@Public()`); a conta é lida na base de dados em cada pedido; `AdminGuard` e `AuthorizationService` (`requireMember`, `requireManager`, `requireWritable`). Ordem das verificações em architecture.md §4.2 | Decidido em 2026-11-09 |
| Seed | `backend/prisma/seed.ts`, corrido só a pedido (`npm run db:seed`), nunca no arranque. Idempotente: identificadores fixos (contas pelo email); só cria o que falta e nunca altera nem apaga dados. Cria a conta de sistema, a Ana e o Bruno (ativos), uma conta pendente (sem palavra-passe nem token) e uma desativada; três projetos com acessos distintos (a conta de sistema não é membro de nenhum, DE02), tarefas, responsáveis e comentários. Dados fictícios; a palavra-passe comum vem de `SEED_DEMO_PASSWORD` (`.env`, ignorado pelo Git), guardada como hash bcrypt; sem entradas no registo administrativo | Decidido em 2026-11-08 |
| Contrato da API | 40 operações das user stories em [openapi.yaml](../openapi.yaml), mais `GET /health` (infraestrutura, sem autenticação) | openapi.yaml 0.5.0 (vários responsáveis e pedidos de responsável em 2026-11-11; prioridade, filtros e paginação das tarefas em 2026-11-10); `GET /health` decidido em 2026-11-08 |
| Âmbito | Só as funcionalidades Must (FN01–FN09, FN12–FN14, FN27–FN29); pesquisa por texto, filtro por responsável (FN30) e prazos ficam fora | requirements.md §5; FN12 e FN13 entraram em 2026-11-10; FN29 em 2026-11-11 |
| Pesquisa e eliminação de projetos | Fora do MVP: não há pesquisa de projetos nem operação para eliminar um projeto; os projetos retiram-se de uso arquivando-os (`archiveProject`). `test/projects.e2e-spec.ts` confirma que não há operação para eliminar (requirements.md §5, constraints.md §5) | Eliminação não implementada desde 2026-11-09; fora do MVP, com a pesquisa, desde 2026-11-15 |
| Formulário "Nova tarefa" | No `ProjectView`, o formulário de criação está sempre visível ao Gestor, acima dos grupos por estado, em vez do botão "+ Nova tarefa" do ecrã 2 do wireframe (diferença 3 da verificação J10). Mantém-se | Decidido em 2026-11-15 |
| Cartão da tarefa | No `ProjectView`, cada cartão mostra a prioridade (FN12) e não o número de comentários do ecrã 2 do wireframe (diferença 4 da verificação J10). Mantém-se; a lista de tarefas (`listProjectTasks`) não devolve o número de comentários | Decidido em 2026-11-15 |
| Ecrã inicial | O `DashboardView` acrescenta ao ecrã 1 do wireframe: a data de hoje; um resumo dos projetos ativos (número de projetos e somas de `todo`, `inProgress` e `done` do progresso de cada um, sem os arquivados); os projetos arquivados numa secção "Arquivados", depois dos ativos (cada secção pela ordem da API); a barra de progresso dividida por estado (o valor acessível continua a ser `percentDone`); o cartão inteiro clicável; uma segunda linha na lista vazia; e cartões de esqueleto enquanto carrega. Só usa os dados de `getMe` e `listMyProjects`, sem operações novas | Decidido em 2026-11-19 |
| Nome e descrição do projeto | O nome conta e fica guardado sem os espaços das pontas; uma descrição vazia ou só com espaços fica `null` (PN12) | Decidido em 2026-11-09 |
| Título e descrição da tarefa | Mesma regra que no projeto: o título conta e fica guardado sem os espaços das pontas; uma descrição vazia ou só com espaços fica `null` (PN12) | Decidido em 2026-11-10 |
| Lista de tarefas | Filtros `status` e `priority`; paginação `page` e `pageSize` (20 por omissão, máximo 100); resposta com `total` e `countsByStatus`; o frontend faz um pedido por coluna da vista por estado (PN20, openapi.yaml 0.4.0) | Decidido em 2026-11-10 |
| Vários responsáveis | Uma tarefa tem zero ou mais responsáveis, sem limite, mostrados por ordem do nome (DE16). Tabela `task_assignee`; a migration copia `task.assignee_id` e remove a coluna. `Task.assignees` na API; `assigneeIds` ao criar; `addTaskAssignee` (`409 ASSIGNEE_ALREADY_ASSIGNED` se repetido) e `removeTaskAssignee` (`404 ASSIGNEE_NOT_FOUND`); `assigneeId` sai de `updateTask`. Substitui a decisão "responsável igual ao atual" de 2026-11-10, que deixa de se aplicar | Decidido em 2026-11-11; openapi.yaml 0.5.0 |
| Comentários | O texto conta e fica guardado sem os espaços das pontas (1–2000 caracteres, PN15); em falta dá `BODY_INVALID`. A lista vai do mais antigo para o mais recente e desempata pelo `id`. O `201` de `createTaskComment` não leva `Location` (não há `GET /comments/{commentId}`) | Decidido em 2026-11-11 (questão 7) |
| Pedidos de responsável | Um responsável pede, o Gestor aceita ou recusa, quem pediu cancela (DE13, PN21). Tabela `assignee_request`, com índice único parcial para um pedido pendente por tarefa e pessoa; sem cancelamento automático, condições verificadas outra vez ao aceitar (CL13) | Decidido em 2026-11-11 |

### 1.2 Propostas deste plano

Nada disto está decidido. Cada linha precisa de aprovação antes do incremento onde é usada.

| Proposta | Detalhe | Usada em |
|---|---|---|
| Dependências adicionais | Um cliente SMTP (por exemplo, `nodemailer`) para o Mailpit. As restantes foram instaladas no incremento 1 (secção 1.1) | 2 |
| Migrations por incremento | O esquema cresce com os incrementos: cada um acrescenta só as tabelas de que precisa. **Não seguido no incremento 1:** a migration inicial já cria todas as tabelas de `database.md` | 1–6 |
| Eventos internos | "Membro removido" e "conta desativada" (architecture.md §4.2) implementados como chamadas pela interface do módulo `tasks`, na mesma transação; mecanismo concreto a definir no incremento 4 | 4 |
| Rota de ativação | `/ativar?token=...` no frontend, como no exemplo do fluxo de ativação | 2 |

## 2. Visão geral

| N.º | Incremento | User stories | Depende de | Estado |
|---|---|---|---|---|
| 1 | Base, autenticação e primeiro percurso de projetos | US01, US03, US15; US05, US16 e US18 em parte | — | Em curso |
| 2 | Contas e ativação | US02, US11, US16 | 1 | Por iniciar |
| 3 | Projeto e equipa | US04, US10, US18 | 1 | Em curso |
| 4 | Tarefas, responsáveis, prioridade e filtros | US06, US07, US08, US19 (sem comentários), US22, US23 | 2, 3 (ver a nota do incremento) | Em curso |
| 5 | Progresso e painel inicial | US05, US09 | 4 | Em curso |
| 6 | Comentários | US13, US19 | 4 | Em curso |
| 7 | Pedidos de responsável | US31, US19 (pedidos pendentes) | 4 | Por iniciar |
| 8 | Área de administração | US12, US14, US17 | 2, 3 | Por iniciar |
| 9 | Verificação final do MVP | Todas (US01–US19, US22, US23, US31) | 1–8 | Em curso |

O que falta para cada incremento "Em curso" passar a "Concluído" (2026-11-15):

| N.º | Falta |
|---|---|
| 1 | `listAccounts` no backend e o formulário de criação de projeto no frontend; critério 6 com o Administrador a criar o projeto pela interface |
| 3 | Equipa: `listMemberCandidates`, `addProjectMember`, `removeProjectMember`, no backend e no frontend |
| 4 | Reação a "membro removido" e a "conta desativada" (PN07, PN08, critério 2), que espera pelos incrementos 2 e 3 |
| 5 | Teste de API do CL7 (o projeto volta a "Sem tarefas" depois de eliminar todas as tarefas) |
| 6 | CL12 com as operações reais de remover membro e desativar conta (incrementos 2 e 3) |
| 9 | Os incrementos 1–8 completos; repetir a verificação sobre o MVP inteiro |

Os incrementos 2 e 3 podem ser feitos em qualquer ordem, tal como 5, 6 e 7 depois do 4 (o 7 depois de terminada a parte dos vários responsáveis do 4) e o 8 depois do 2 e do 3.

**Comandos dos testes** (D08; também no `AGENTS.md`):

Comandos (Node.js do `.nvmrc`, com `nvm use`):

| Onde | Comando | O que corre |
|---|---|---|
| `backend/` | `npm test` | Testes unitários (Vitest) |
| `backend/` | `npm run test:e2e` | Testes de API (Vitest + Supertest), incluindo a autenticação (`test/auth.e2e-spec.ts`, `test/session.e2e-spec.ts`) |
| `frontend/` | `npm run test:unit -- --run` | Testes de componentes e do cliente (Vitest) |

Os testes de API usam uma base de dados própria, nunca a de desenvolvimento:
a de `DATABASE_URL` com o nome terminado em `_test` (`matriz_test`), ou
`TEST_DATABASE_URL`. Antes de cada execução, `test/global-setup.ts` aplica as
migrations e esvazia todas as tabelas dessa base, e recusa qualquer nome que
não termine em `_test`. Cada teste cria os seus próprios dados fictícios
(`test/fixtures.ts`). Precisa do PostgreSQL do `compose.yaml` a correr
(`docker compose up -d postgres`). Não uses `prisma migrate reset`: o Prisma bloqueia-o
quando é chamado por um agente de IA.

**Formas de verificação usadas abaixo:**

- **[API]** teste automático Vitest + Supertest contra a API e a base de dados de testes;
- **[Unidade]** teste automático Vitest de uma regra isolada;
- **[UI]** teste automático Vitest de um componente ou vista Vue;
- **[Manual]** verificação no navegador (e, no incremento 2, no Mailpit).

## 3. Incrementos

### Incremento 1 — Base, autenticação e primeiro percurso de projetos

**Estado:** Em curso (atualizado em 2026-11-15)

| Parte | Estado |
|---|---|
| Infraestrutura: `compose.yaml` com o PostgreSQL, `.env.example`, `.gitignore` | Feito |
| Backend (Nest CLI) e frontend (`create-vue`) gerados; `.nvmrc` | Feito |
| Base de dados: `schema.prisma` com todas as tabelas de `database.md` e a migration inicial | Feito (o esquema ficou completo, em vez de crescer por incremento) |
| Seed: `backend/prisma/seed.ts` | Feito |
| `PrismaService` partilhado e `GET /health` com teste unitário e teste de API | Feito |
| `accounts`: login, logout e `GET /me`; `authorization`: guard JWT global, `AdminGuard`, `AuthorizationService` (projetos, tarefas, comentários, autoria), `@IdParam()`; erros Problem Details | Feito (2026-11-09); matriz de autorização testada com rotas de exemplo (`test/authorization-example.module.ts`) |
| `projects` (`createProject`, `listMyProjects`, `getProject`), `progress` (contagens e PN13), `audit` (escrita de `CREATE_PROJECT` e `ASSIGN_MANAGER`) | Feito (2026-11-10), com testes de API (`test/projects.e2e-spec.ts`) e unitários |
| `accounts` (`listAccounts`) | Por fazer |
| Frontend: cliente HTTP, sessão, guarda de rotas, `LoginView`, botão "Sair" | Feito (2026-11-09) |
| Frontend: validação do formulário de entrada, componentes e estilos partilhados (`FormField`, `AppHeader`, `main.css`), ecrã inicial provisório com a conta (`GET /me`) | Feito (2026-11-09). Alargado em 2026-11-12: `AppButton`, `ErrorMessage`, `EmptyState`, `LoadingIndicator`, `ConfirmDialog`, `ProgressIndicator`, `ProjectStatusBadge` e `AppBreadcrumbs`, usados em todos os ecrãs; "Matriz" no cabeçalho liga ao painel e o projeto e a tarefa mostram o caminho Painel › Projeto › Tarefa; layout revisto para telemóvel (≈375px), tablet e desktop |
| Frontend: `DashboardView`, `ProjectView`, formulário de criação de projeto | `DashboardView` feito (2026-11-12): substitui o ecrã inicial provisório (`HomeView`); conta (`GET /me`), projetos (`GET /projects`) com ligação para o detalhe, função, barra, percentagem e contagens por estado de `progress` (total no servidor), "Sem tarefas", "Arquivado (só de leitura)", estados de carregamento, erro (com "Tentar outra vez") e lista vazia ("Ainda não participa em nenhum projeto.", registo formal desde 2026-11-12; sem ligação para criar até existir o formulário). `ProjectView` feito no incremento 4. Formulário de criação de projeto por fazer: precisa de escolher o Gestor entre as contas (`listAccounts`), que o backend ainda não tem (incremento 2) |
| Base de dados de testes separada | Feito (`matriz_test`, 2026-11-09) |
| Critérios de aceitação 1–6 | 1 e 2 verificados (testes e navegador, 2026-11-09; outra vez a 2026-11-15, C01 e S1–S5 de verification.md); 3–5 verificados na API (2026-11-10; C02 a 2026-11-15); 6 verificado em parte (2026-11-15, C03 e S4): recarregar a página e reiniciar o backend mantêm a sessão e os dados; falta o Administrador criar o projeto pela interface (precisa de `listAccounts` e do formulário) |

**Objetivo:** pôr a funcionar o primeiro percurso completo entre interface, API e base de dados. Termina quando é possível **iniciar sessão, criar um projeto, vê-lo na listagem e consultá-lo depois de recarregar a página e reiniciar o backend**.

**User stories:** US01 (entrar), US15 (sair), US03 (criar projeto e atribuir o Gestor), US05 em parte (listagem, ainda sem tarefas), US18 em parte (consultar o projeto, só com o Gestor como membro), US16 em parte (lista de contas, para escolher o Gestor).

**Operações da API:** `login`, `logout`, `getMe`, `listAccounts`, `createProject`, `listMyProjects`, `getProject`.

**Ficheiros e componentes previstos (proposta):**

| Camada | Ficheiros ou componentes |
|---|---|
| Infraestrutura | `compose.yaml` com o PostgreSQL; `.env.example` sem valores reais; `.gitignore` com `.env` |
| Base de dados | `backend/prisma/schema.prisma` com ACCOUNT, PROJECT, PROJECT_MEMBER, TASK e ADMIN_AUDIT_LOG (database.md); primeira migration; `backend/prisma/seed.ts`. A migration `init` (2026-11-08) criou também as tabelas `account_activation_token` e `comment`, que só são usadas nos incrementos 2 e 6 |
| `accounts` | Controlador de autenticação (`/auth/login`, `/auth/logout`, `/me`), estratégia JWT, serviço de palavras-passe (hash), listagem de contas |
| `authorization` | Guards: conta autenticada, permissão de Administrador, membro do projeto (com `404` para quem não é membro) |
| `projects` | Criar projeto com o Gestor na mesma transação; listar os projetos da conta; consultar um projeto |
| `progress` | Contagem das tarefas por estado e percentagem (PN13); no fim deste incremento os projetos ainda não têm tarefas |
| `audit` | Escrita das entradas `CREATE_PROJECT` e `ASSIGN_MANAGER` (a consulta fica para o incremento 8) |
| Frontend | Cliente HTTP com o cabeçalho `Authorization`; guarda de rotas que manda para o ecrã de entrada; vistas `LoginView`, `DashboardView` (ecrã 1 do wireframe), `ProjectView` (cabeçalho do ecrã 2) e formulário de criação de projeto para o Administrador |

**Dependências:** nenhuma.

**Critérios de aceitação:**

1. Os critérios da US01: entrada com credenciais certas; `401` com credenciais erradas e com conta pendente; `403` com conta desativada e palavra-passe certa.
2. A US15: depois de sair, abrir o endereço de um projeto leva ao ecrã de entrada.
3. Os critérios da US03: o projeto fica "Ativo", com o Gestor como único membro e as duas entradas no registo; erros de nome (3–100 caracteres), Gestor em falta, Gestor desativado e conta sem permissão de Administrador.
4. Em `GET /projects` aparecem só os projetos onde a conta participa; a permissão de Administrador não acrescenta nenhum (PN02).
5. `GET /projects/{id}` responde `404` a quem não é membro, como a um projeto que não existe.
6. **Percurso final:** com a conta de sistema, o Administrador entra e cria o projeto "Site" com a Ana como Gestor. A Ana entra, vê "Site" na listagem com a função Gestor e "Sem tarefas" e abre-o. Depois de recarregar a página e de reiniciar o backend, a Ana continua com a sessão aberta e vê o mesmo projeto com os mesmos dados.

O percurso usa duas contas porque o Administrador só vê os projetos onde participa (DE02): o Administrador cria o projeto e o Gestor consulta-o (decidido em 2026-11-08).

**Verificação:**

- [API] login (sucesso, `401`, conta pendente, `403`); `GET /me` sem token dá `401`; `POST /projects` (`201`, `400` em cada validação, `403`, `404` do Gestor); `GET /projects` e `GET /projects/{id}` com dois utilizadores diferentes; entradas no registo.
- [Unidade] percentagem de conclusão (PN13), incluindo `null` sem tarefas.
- [UI] mensagem de erro do formulário de entrada; guarda de rotas sem token; cartão do projeto com "Sem tarefas".
- [Manual] o percurso final do critério 6, incluindo recarregar a página e reiniciar o backend.

### Incremento 2 — Contas e ativação

**Estado:** Por iniciar

**Objetivo:** o Administrador gere as contas e as pessoas ativam a sua conta pelo link enviado por email.

**User stories:** US02, US11, US16 (completa); US01 (conta pendente criada pelo fluxo real).

**Operações da API:** `createAccount`, `activateAccount`, `resendInvite`, `deactivateAccount`, `grantAdmin`, `revokeAdmin`.

**Ficheiros e componentes previstos (proposta):**

| Camada | Ficheiros ou componentes |
|---|---|
| Infraestrutura | Serviço Mailpit no `compose.yaml` (D09) |
| Base de dados | Nenhuma migration: a tabela `account_activation_token` (ACCOUNT_ACTIVATION_TOKEN, database.md) já foi criada pela migration `init` (2026-11-08) |
| `accounts` | Criar conta `PENDING`; gerar o token, guardar só o hash e enviar o email; ativar e invalidar o token; reenviar o convite; desativar (incluindo contas pendentes); dar e retirar a permissão de Administrador, com a proteção da conta de sistema e do último Administrador ativo |
| `audit` | Entradas `CREATE_ACCOUNT`, `RESEND_INVITE`, `DEACTIVATE_ACCOUNT`, `GRANT_ADMIN` e `REVOKE_ADMIN` |
| Frontend | `AccountsView` (lista de contas com o estado; criar, desativar, reenviar o convite, dar e retirar a permissão); `ActivateView` (definir a palavra-passe a partir do link) |

**Dependências:** incremento 1 (contas, autenticação e guards).

**Nota:** a parte da desativação que deixa as tarefas sem responsável (PN08) fica para o incremento 4, quando houver tarefas.

**Critérios de aceitação:**

1. Todos os critérios da US02: criar (estado "Pendente", email enviado), ativar, palavra-passe curta, link expirado, link usado ou substituído, reenviar, reenviar a uma conta que não está pendente, desativar (ativa e pendente), email repetido, conta de sistema, sem permissão.
2. Todos os critérios da US11 e da US16.
3. Cada ação fica no registo administrativo.

**Verificação:**

- [API] cada critério da US02, US11 e US16, incluindo o token expirado (com a hora controlada no teste) e a invalidação ao reenviar.
- [Unidade] validade do token (24 horas) e regra do último Administrador ativo (DE05).
- [UI] formulário de ativação: erro de comprimento mínimo e mensagem de link expirado.
- [Manual] criar uma conta, abrir o email no Mailpit, seguir o link, definir a palavra-passe e entrar.

### Incremento 3 — Projeto e equipa

**Estado:** Em curso (atualizado em 2026-11-15). Feito (2026-11-10): `updateProject` e `archiveProject` no backend, com testes de API (US10). Feito (2026-11-12) no frontend: "Editar projeto" e "Arquivar projeto" só para o Gestor num projeto ativo (arquivar pede confirmação), estado do projeto e painel "Membros" só de leitura, com a função e "conta desativada" (US10, US18). Verificado no navegador a 2026-11-15 (C02, J1–J3 e J5 de verification.md). Falta a equipa (`listMemberCandidates`, `addProjectMember`, `removeProjectMember`), no backend e no frontend.

**Objetivo:** o Gestor edita e arquiva o projeto e forma a equipa.

**User stories:** US04, US10, US18 (completa).

**Operações da API:** `updateProject`, `archiveProject`, `listMemberCandidates`, `addProjectMember`, `removeProjectMember`.

**Ficheiros e componentes previstos (proposta):**

| Camada | Ficheiros ou componentes |
|---|---|
| `authorization` | Guard de Gestor do projeto; regra geral de projeto arquivado só de leitura (PN09, `409 PROJECT_ARCHIVED`) |
| `projects` | Editar e arquivar; candidatos a membro (contas ativas ou pendentes); adicionar e remover membros; o Gestor não pode ser removido (PN04) |
| Frontend | Botões "Editar" e "Arquivar" só para o Gestor (wireframe, ecrã 2); painel "Membros" com a função e a indicação "conta desativada" (US18) |

**Dependências:** incremento 1.

**Nota:** a remoção de um membro que deixa as suas tarefas sem responsável (PN07) fica para o incremento 4.

**Critérios de aceitação:**

1. Todos os critérios da US04 (exceto CL1, que depende de tarefas), da US10 e da US18.
2. Num projeto arquivado, qualquer alteração aos membros ou ao projeto é recusada com `409`.

**Verificação:**

- [API] cada critério, com um Gestor, um Membro e uma conta sem acesso; projeto arquivado.
- [UI] botões do Gestor escondidos para o Membro.
- [Manual] adicionar e remover um membro e confirmar que o projeto aparece e desaparece da listagem dessa pessoa.

### Incremento 4 — Tarefas, responsáveis, prioridade e filtros

**Estado:** Em curso (atualizado em 2026-11-15)

| Parte | Estado |
|---|---|
| Migration `add_task_priority` (enum `task_priority`, coluna `priority` com `MEDIUM` por omissão, índice `(project_id, priority)`) | Feito (2026-11-10) |
| Backend `tasks`: `createProjectTask`, `listProjectTasks` (filtros, paginação, `total`, `countsByStatus`), `getTask`, `updateTask`, `deleteTask`; testes `src/tasks/task-rules.spec.ts` e `test/tasks.e2e-spec.ts` | Feito (2026-11-10) |
| Backend: `changeTaskStatus` (com a reabertura, PN10), com testes unitários e de API | Feito (2026-11-11) |
| Testes de API das tarefas completados: outra conta (Gestor de outro projeto, sem ser membro) recebe 404 ao criar, consultar, editar e eliminar, sem alterar dados; persistência (criar pela API, consultar, listar e voltar a consultar numa nova instância da aplicação) | Feito (2026-11-11); 158 testes de API a passar |
| Backend: `listAssignableAccounts` (membros com conta ativa, por ordem do nome; só o Gestor) | Feito (2026-11-11) |
| Migration `task_assignees`: tabela `task_assignee`, cópia de `task.assignee_id` e remoção da coluna (DE16). Alteração à estrutura de dados aprovada em 2026-11-11 | Feito (2026-11-11); cópia dos dados verificada numa base de dados temporária; esquema igual às migrations (`prisma migrate diff` vazio) |
| Backend: vários responsáveis (openapi.yaml 0.5.0): `Task.assignees`, `assigneeIds` em `createProjectTask`, `assigneeId` fora de `updateTask`, `addTaskAssignee`, `removeTaskAssignee`, reabertura por pessoa (PN10); adaptar o código e os testes já feitos com um só responsável, o seed e as fixtures | Feito (2026-11-11); `test/tasks.e2e-spec.ts` com atribuir, remover, repetido (também em simultâneo), conta fora do projeto ou não ativa, reabertura por pessoa e projeto arquivado a meio do pedido; acrescentados (2026-11-11) a persistência do responsável atribuído (GET, lista, base de dados e depois de reiniciar) e remover um de três responsáveis; 186 testes de API e 95 unitários a passar nessa altura (230 e 106 em 2026-11-11, com os comentários) |
| Reação a "membro removido" e a "conta desativada" (PN07, PN08) | À espera dos incrementos 2 e 3 |
| Frontend: `ProjectView` (`/projetos/:projectId`) com os três grupos por estado, um pedido cada, os totais de `countsByStatus`, "Ver mais", filtros de estado e prioridade e o formulário de criação para o Gestor; `TaskDetailView` (`/tarefas/:taskId`) com edição (título, descrição, prioridade), mudança de estado e eliminação com confirmação; etiquetas num só sítio (`src/tasks/task-labels.ts`); testes de componentes e vistas | Feito (2026-11-11); verificado no navegador a 2026-11-15 (C03–C06, C09, J4, J6–J10, T1–T5, T9 de verification.md) |
| Frontend: tipos e vistas com `assignees` (lista por ordem do nome, cada um com a sua indicação); atribuir e remover responsáveis no `TaskDetailView` e escolher responsáveis ao criar | Feito (2026-11-11); 111 testes de componentes e vistas a passar; verificado no navegador (criar com dois responsáveis, remover, atribuir, largura de telemóvel) |
| Frontend: seletor de estado nos cartões do wireframe, ligação a partir do ecrã inicial | Feito (2026-11-12): ligação a partir do `DashboardView`; seletor de estado em cada cartão para qualquer membro num projeto ativo, que volta a pedir os grupos e o progresso |

**Objetivo:** gerir as tarefas de cada projeto, os seus responsáveis e a prioridade, e filtrar e paginar a lista.

**User stories:** US06, US07, US08, US19 (sem comentários), US22, US23; CL1, CL2, CL4.

**Operações da API:** `listProjectTasks`, `createProjectTask`, `listAssignableAccounts`, `getTask`, `updateTask`, `deleteTask`, `changeTaskStatus`, `addTaskAssignee`, `removeTaskAssignee`.

**Nota (decisão interna, 2026-11-11):** a tarefa passa a ter vários responsáveis (DE16, openapi.yaml 0.5.0). As partes marcadas "Feito" foram feitas com um só responsável (`assigneeId`) e têm de ser adaptadas.

**Ficheiros e componentes previstos (proposta):**

| Camada | Ficheiros ou componentes |
|---|---|
| Base de dados | Migration com o enum `TaskPriority` e a coluna `task.priority` (`NOT NULL`, por omissão `MEDIUM`, database.md); índice para o filtro por prioridade. Migration `task_assignees` (database.md, TASK_ASSIGNEE). São alterações à estrutura de dados: pedem confirmação antes de serem criadas (AGENTS.md) |
| `tasks` | Criar, editar, eliminar; prioridade (PN19); lista filtrada e paginada com `total` e `countsByStatus` (PN20); atribuir e remover responsáveis (membro com conta ativa, sem repetidos, PN06, DE16); mudar o estado e reabrir, tirando só os responsáveis desativados ou que já não são membros (PN10); reação a "membro removido" (PN07) e a "conta desativada" (PN08), por pessoa e na mesma transação (architecture.md §4.2) |
| `projects`, `accounts` | Emitir os eventos "membro removido" e "conta desativada" |
| Frontend | Colunas por estado no `ProjectView` (wireframe, ecrã 2), cada uma com o seu pedido, o total real e "ver mais"; filtro por prioridade (e por estado); prioridade no cartão e no detalhe; formulário de tarefa para o Gestor, com a prioridade; seletor de estado; `TaskDetailView` com título, descrição, responsável e estado; indicações "Sem responsável", "conta desativada" e "já não é membro" |

**Dependências:** incremento 2 (desativação de contas) e incremento 3 (membros do projeto).

**Nota (decisão interna, 2026-11-10):** os incrementos 2 e 3 ainda não estão feitos. O CRUD de tarefas, a prioridade, os filtros e a regra de reabertura (PN10) podem avançar já, testados com dados criados nas fixtures. A reação a "membro removido" e a "conta desativada" (PN07, PN08; critério 2) fica para quando existirem as operações desses incrementos.

**Critérios de aceitação:**

1. Todos os critérios da US06, US07, US08, US22, US23 e da US19 sem comentários.
2. CL1 (US04) e CL4 (US02): a pessoa sai dos responsáveis das tarefas que não estão "Concluída" e os outros mantêm-se; nas "Concluída" continua, com a indicação correta.
5. Vários responsáveis (DE16): atribuir, remover, responsável repetido (`409`), conta fora do projeto ou não ativa (`400`), remover quem não é responsável (`404`).
3. Título com 3–150 caracteres sem contar os espaços das pontas e descrição até 2000 (PN12).
4. Lista de tarefas com filtros e paginação, `total` e `countsByStatus` como no contrato (PN20).

**Verificação:**

- [API] cada critério, incluindo remover um membro e desativar uma conta com tarefas nos dois estados (quando existirem os incrementos 2 e 3); filtros, paginação, `total` e `countsByStatus`, incluindo uma página para além da última e parâmetros inválidos.
- [Unidade] regra de reabertura por pessoa (PN10) e escolha da indicação ao lado do nome (DE14).
- [API] migration: as tarefas com `assignee_id` ficam com esse responsável em `task_assignee`.
- [UI] agrupamento por estado e grupo vazio; indicações ao lado do responsável.
- [Manual] criar, editar, mudar o estado e eliminar uma tarefa sem recarregar a página.

### Incremento 5 — Progresso e painel inicial

**Estado:** Em curso (atualizado em 2026-11-15)

| Parte | Estado |
|---|---|
| Backend: contagens por estado de todas as tarefas de cada projeto em `listMyProjects` e `getProject` (`ProgressService`, `groupBy` na base de dados) | Feito no incremento 1; sem alterações ao contrato |
| Frontend: progresso nos cartões do `DashboardView`, "Sem tarefas", "Arquivado (só de leitura)", lista vazia | Feito (2026-11-12); `DashboardView.spec.ts` e `project-labels.spec.ts`; 159 testes do frontend a passar |
| Frontend: progresso no `ProjectView`; contagens atualizadas sem recarregar (critério 2) | Feito (2026-11-12): o `ProjectView` mostra `progress` de `getProject` (todas as tarefas, sem filtros) com o componente `ProgressIndicator`, partilhado com o `DashboardView`, e volta a pedir o projeto depois de criar uma tarefa ou de mudar um estado num cartão. Eliminar ou mudar o estado no `TaskDetailView` volta ao projeto, que é pedido de novo |
| Verificação manual: comparar o painel com o ecrã 1 do wireframe, também a ≈375px | Feito (2026-11-15, P1–P7 de verification.md); as diferenças 1 (sem "Administração", incremento 8) e 2 (saudação e email no topo) ficam registadas em verification.md |
| [API] contagens depois de eliminar todas as tarefas (CL7) | Por fazer: o CL7 só está testado no frontend (`project-labels.spec.ts`) |

**Objetivo:** mostrar o progresso real de cada projeto no ecrã inicial e na vista do projeto.

**User stories:** US05 (completa), US09; CL3, CL7.

**Operações da API:** `listMyProjects` e `getProject` (campo `progress`), já existentes desde o incremento 1.

**Ficheiros e componentes previstos (proposta):**

| Camada | Ficheiros ou componentes |
|---|---|
| `progress` | Contagens por estado a partir de TASK, já com tarefas reais |
| Frontend | Barra e texto de progresso nos cartões do `DashboardView` e no `ProjectView`; indicação "Arquivado"; lista vazia com mensagem (wireframe, ecrã 1) |

**Dependências:** incremento 4.

**Critérios de aceitação:**

1. Todos os critérios da US05 e da US09.
2. As contagens mudam depois de criar, eliminar ou mudar o estado de uma tarefa, sem recarregar a página.

**Verificação:**

- [API] contagens e percentagem com tarefas nos três estados, sem tarefas e depois de eliminar todas (CL7).
- [UI] cartão com 75%, cartão "Sem tarefas" e cartão "Arquivado".
- [Manual] comparar o ecrã inicial com o wireframe, também com largura de telemóvel (D01).

### Incremento 6 — Comentários

**Estado:** Em curso (atualizado em 2026-11-15)

| Parte | Estado |
|---|---|
| Backend: `listTaskComments`, `createTaskComment`, `updateComment`, `deleteComment` (`CommentsController` e `CommentsService` no módulo `tasks`) | Feito (2026-11-11); `test/comments.e2e-spec.ts` (42 testes, com outro utilizador sem ser membro a listar, comentar, editar e apagar: `404`) e `comment-rules.spec.ts`; 230 testes de API e 106 unitários a passar |
| CL12 com as operações reais de remover membro e desativar conta | Verificado só com dados alterados na base (os incrementos 2 e 3 ainda não existem) |
| Frontend: lista e formulário de comentários no `TaskDetailView` | Feito (2026-11-11): listar, comentar, editar e apagar (botões só nos comentários próprios, componente `CommentForm`), com autor, data e hora em pt-PT e contador de caracteres; 151 testes do frontend a passar; verificado à mão no browser e outra vez a 2026-11-15 (C07, T6–T8 de verification.md) |

**Objetivo:** os membros comentam as tarefas.

**User stories:** US13, US19 (completa); CL12.

**Operações da API:** `listTaskComments`, `createTaskComment`, `updateComment`, `deleteComment`.

**Ficheiros e componentes previstos (proposta):**

| Camada | Ficheiros ou componentes |
|---|---|
| Base de dados | Nenhuma migration: a tabela `comment` (com a eliminação em cascata e o índice `(task_id, created_at)`) já foi criada pela migration `init` (2026-11-08) |
| `tasks` | Criar, listar, editar e apagar os próprios comentários (PN15) |
| Frontend | Lista e formulário de comentários no `TaskDetailView`, com autor, data e hora |

**Dependências:** incremento 4.

**Critérios de aceitação:**

1. Todos os critérios da US13 e da US19.
2. Comentário com 1–2000 caracteres e não só espaços (PN15).
3. CL12: os comentários mantêm-se quando o autor sai do projeto ou a conta é desativada.

**Verificação:**

- [API] cada critério, incluindo outra pessoa (mesmo o Gestor) a tentar editar e o projeto arquivado.
- [UI] botões de editar e apagar só nos comentários próprios.
- [Manual] comentar, editar e apagar numa tarefa.

### Incremento 7 — Pedidos de responsável

**Estado:** Por iniciar

**Objetivo:** um responsável pede que outro membro seja adicionado como responsável, e o Gestor aceita ou recusa.

**User stories:** US31, US19 (pedidos pendentes no detalhe da tarefa); CL3, CL13.

**Operações da API:** `listTaskAssigneeRequests`, `createAssigneeRequest`, `listProjectAssigneeRequests`, `acceptAssigneeRequest`, `rejectAssigneeRequest`, `cancelAssigneeRequest`.

**Ficheiros e componentes previstos (proposta):**

| Camada | Ficheiros ou componentes |
|---|---|
| Base de dados | Migration `assignee_requests`: enum `assignee_request_status`, tabela `assignee_request`, eliminada em cascata com a tarefa, e índice único parcial em `(task_id, account_id)` para `PENDING` (database.md). Alteração à estrutura de dados aprovada em 2026-11-11 |
| `authorization` | `requireAssigneeRequest` (404 pelo projeto da tarefa), "é responsável da tarefa" (`NOT_TASK_ASSIGNEE`), "fez o pedido" (`NOT_REQUEST_AUTHOR`) |
| `tasks` | Criar, listar (por tarefa e por projeto), aceitar (com nova verificação e a atribuição na mesma transação), recusar e cancelar (PN21) |
| Frontend | No `TaskDetailView`: pedidos pendentes; "Pedir responsável" para quem é responsável, com os membros ativos que ainda não são responsáveis; aceitar e recusar para o Gestor; cancelar para quem pediu. Lista de pedidos pendentes do projeto para o Gestor no `ProjectView` |

**Dependências:** incremento 4 (vários responsáveis).

**Critérios de aceitação:**

1. Todos os critérios da US31 e o caso "pedidos pendentes" da US19.
2. CL13: os pedidos não são cancelados automaticamente; ao aceitar, as condições sobre a pessoa pedida voltam a ser verificadas e, se falharem, o pedido continua pendente.
3. CL3: num projeto arquivado, criar, aceitar, recusar e cancelar dão `409 PROJECT_ARCHIVED`; as listas continuam legíveis.

**Verificação:**

- [API] cada critério, incluindo pedido repetido, pessoa já responsável, pedido já decidido, Membro a aceitar, outra pessoa a cancelar, conta que não é membro (`404`) e a eliminação dos pedidos com a tarefa.
- [Unidade] transições de estado do pedido (só a partir de `PENDING`).
- [UI] botões só para quem pode usar cada ação.
- [Manual] pedir, aceitar, recusar e cancelar numa tarefa.

### Incremento 8 — Área de administração

**Estado:** Por iniciar

**Objetivo:** o Administrador vê todos os projetos, troca o Gestor e consulta o registo.

**User stories:** US12, US14, US17; CL6, CL8.

**Operações da API:** `listAllProjects`, `changeProjectManager`, `listAuditLog`.

**Ficheiros e componentes previstos (proposta):**

| Camada | Ficheiros ou componentes |
|---|---|
| `projects` | Lista de todos os projetos sem conteúdo (PN02); trocar o Gestor, adicionando-o à equipa se for preciso, na mesma transação |
| `audit` | Entradas `CHANGE_MANAGER` e `ADD_MEMBER`; consulta do registo |
| Frontend | `AdminProjectsView` (wireframe: botão "Administração"); diálogo para trocar o Gestor; `AuditLogView` |

**Dependências:** incremento 2 (contas) e incremento 3 (membros).

**Critérios de aceitação:**

1. Todos os critérios da US12, US14 e US17.
2. CL6: o Administrador que não participa num projeto não vê tarefas, comentários nem progresso desse projeto.
3. Num projeto arquivado, trocar o Gestor é recusado com `409` (PN14).

**Verificação:**

- [API] cada critério, incluindo um Administrador que não é membro do projeto.
- [UI] lista de projetos sem progresso.
- [Manual] trocar o Gestor de um projeto e confirmar as entradas no registo.

### Incremento 9 — Verificação final do MVP

**Estado:** Em curso (atualizado em 2026-11-15). Feita a verificação do que já existe (incrementos 1, 3, 4, 5 e 6): a do frontend a 2026-11-12 e os cenários manuais a 2026-11-15, registados em [verification.md](verification.md). Na verificação de 2026-11-12, a única alteração ao código foi a rota para endereços desconhecidos; na de 2026-11-15, as correções `45bef4e` (carácter nulo) e `095a411` (erros em Problem Details):

| Verificação | Resultado (2026-11-12) |
|---|---|
| Mocks, dados fixos e URLs da API fora da configuração | Nenhum. Pesquisa em `frontend/src` (sem `__tests__`) por `mock`, `fixture`, `fake`, `stub`, `dummy`, `lorem`, `sample`, UUIDs, emails, `setTimeout` e arrays de objetos: só o exemplo `nome@empresa.pt` numa mensagem de validação e as opções "Todos"/"Todas" dos filtros. O único `fetch` está em `src/api/http.ts` (`/api` + caminho do contrato); o endereço do backend só existe em `VITE_API_URL` (`frontend/.env`, `.env.example`) e no valor por omissão de `vite.config.ts`. Nenhum ficheiro de produção importa `src/__tests__/api-fixtures.ts`. O bundle (`dist/assets`) não tem `localhost` nem fixtures |
| `npm run build` (Node.js 26.13.0 do `.nvmrc`) | Sem erros nem avisos: `vue-tsc --build` limpo e `vite build` em 82 módulos |
| `npm run test:unit -- --run` | 18 ficheiros, 180 testes a passar |
| Endereços desconhecidos | Rota `not-found` (`/:pathMatch(.*)*`) com o `NotFoundView`: "Página não encontrada" e "Ir para o painel". Não é pública: sem sessão, a guarda manda para a entrada com `redirect`. `src/router/__tests__/not-found.spec.ts` (3 testes); 19 ficheiros e 183 testes do frontend a passar; build sem avisos; sem sessão verificado no navegador |
| Verificação manual por ecrã | Executada a 2026-11-15: os cenários abaixo e os nove casos do Exercício 8 da ficha, com os resultados em [verification.md](verification.md). Todos passaram, exceto o C02, que passou em parte (sem pesquisa nem eliminação de projetos, fora do MVP, e sem criação de projetos pela interface, incremento 1). Testes nessa data: 106 unitários e 230 de API no backend e 183 no frontend, todos a passar |

**Cenários de verificação manual do frontend** (backend e PostgreSQL a correr, dados de `npm run db:seed` ou criados pela API; repetir os marcados com 📱 a ≈375px):

- **Entrada (`/entrar`):** (E1) entrar sem preencher: erro em cada campo; (E2) email inválido: "Indique um email válido…"; (E3) palavra-passe errada: "O email ou a palavra-passe estão errados."; (E4) conta desativada com a palavra-passe certa: "Esta conta foi desativada."; (E5) backend parado: "Não foi possível contactar o servidor…"; (E6) credenciais certas: painel, e com `?redirect=/projetos/<id>` volta a esse projeto; (E7) com sessão, abrir `/entrar`: painel; (E8) estragar o token em `sessionStorage` e navegar: volta à entrada com "A sessão expirou. Inicie sessão novamente."; (E9) durante o pedido o botão mostra "A entrar…" e não envia duas vezes.
- **Cabeçalho e sair (US15):** (S1) "Matriz" leva ao painel; (S2) "Sair" leva à entrada; (S3) depois de sair, "voltar atrás" e abrir o endereço de um projeto levam à entrada; (S4) recarregar a página mantém a sessão (critério 6 do incremento 1, sem a parte do Administrador, que precisa do formulário de criação de projeto); (S5) com sessão, `/qualquer-coisa` mostra "Página não encontrada" e "Ir para o painel" leva ao painel; sem sessão, vai para a entrada e, depois de entrar, volta a "Página não encontrada".
- **Painel (`/`) 📱:** (P1) "Olá, nome", email e, para o Administrador, "Permissão de Administrador"; (P2) um cartão por projeto com ligação, função (Gestor/Membro), barra, percentagem e contagens por estado; (P3) projeto sem tarefas: "Sem tarefas"; (P4) projeto arquivado: "Arquivado (só de leitura)"; (P5) conta sem projetos: "Ainda não participa em nenhum projeto."; (P6) backend parado: erro com "Tentar outra vez", que volta a carregar; (P7) comparar com o ecrã 1 do wireframe.
- **Projeto (`/projetos/:id`) 📱:** (J1) caminho Painel › Projeto, nome, descrição, estado, Gestor, membros com a função e "conta desativada", progresso; (J2) como Gestor, "Editar projeto": nome vazio, com menos de 3 ou com mais de 100 caracteres e descrição com mais de 1000 dão erro; guardar mostra "Alterações ao projeto guardadas."; "Cancelar" não guarda; (J3) "Arquivar projeto": cancelar não arquiva; confirmar mostra o aviso e deixa tudo só de leitura (sem botões de edição, sem "Nova tarefa", seletores de estado desativados); (J4) "Nova tarefa": título vazio ou com mais de 150 caracteres dá erro; criar com prioridade e dois responsáveis mostra a mensagem, a tarefa aparece no grupo "Por fazer" e o total, as contagens e o progresso mudam sem recarregar; (J5) como Membro: sem "Editar projeto", "Arquivar projeto" nem "Nova tarefa", mas com o seletor de estado; (J6) três grupos com o total real, grupo vazio com "Sem tarefas neste estado"; com mais de 20 tarefas num estado, "Ver mais" junta as seguintes; (J7) filtros de estado e de prioridade, sozinhos e juntos; (J8) mudar o estado num cartão: a tarefa muda de grupo e o progresso atualiza; com o backend parado, o erro aparece e o seletor volta ao estado real; (J9) endereço com um UUID que não existe ou de um projeto onde a conta não participa: "O projeto não existe ou não tem acesso a ele."; (J10) comparar com o ecrã 2 do wireframe.
- **Tarefa (`/tarefas/:id`) 📱:** (T1) caminho Painel › Projeto › Tarefa, título, descrição, prioridade, estado e responsáveis por ordem do nome, com "Sem responsável", "conta desativada" e "já não é membro"; (T2) como Gestor, "Editar": as mesmas regras do título, "Cancelar" não guarda; (T3) atribuir um responsável (a lista só mostra quem ainda não é) e remover outro; (T4) "Eliminar": cancelar não elimina; confirmar volta ao projeto com o aviso e as contagens já sem a tarefa; (T5) qualquer membro muda o estado e reabre uma tarefa "Concluída"; (T6) comentar: vazio dá "O comentário não pode estar vazio.", o contador mostra "n/2000 caracteres" e mais de 2000 dá erro sem publicar; o comentário aparece com o autor e a data e hora em pt-PT; (T7) "Editar" e "Apagar" só nos comentários próprios; apagar pede confirmação; (T8) num projeto arquivado: sem edição, sem seletor de estado e sem formulário de comentário; (T9) UUID que não existe: "A tarefa não existe ou não tem acesso a ela."

**Objetivo:** confirmar que o MVP cumpre todos os critérios de aceitação e as regras gerais, sem funcionalidades novas.

**User stories:** todas (US01–US19, US22, US23, US31).

**Ficheiros e componentes previstos (proposta):** testes de API transversais; instruções para correr a aplicação localmente (no `README.md` de `matriz/`).

**Dependências:** incrementos 1 a 8.

**Critérios de aceitação:**

1. Todos os critérios de aceitação das US01–US19, US22, US23 e US31 têm um teste automático ou uma verificação manual registada.
2. RNF02: para cada operação de um projeto, uma conta que não é membro (incluindo um Administrador) recebe `404`.
3. Projeto arquivado: todas as escritas são recusadas com `409` (CL3).
4. A interface funciona em largura de telemóvel (D01).

**Verificação:**

- [API] matriz de autorização: cada operação × Gestor, Membro, Administrador não membro, conta sem sessão.
- [Manual] percorrer as US no navegador, em largura de computador e de telemóvel.

## 4. Questões em aberto que afetam o plano

| N.º | Questão | Incremento |
|---|---|---|
| 1 | Os limites de comprimento do nome e do email de uma conta não estão definidos (constraints.md §5). | 1, 2 |
| 2 | A sugestão de segurança para o link de ativação (retirar o token do endereço visível e não carregar recursos externos na página) não está decidida. | 2 |
| 3 | Uma conta pendente pode receber a permissão de Administrador? (constraints.md §5) | 2 |
| 4 | O Administrador pode nomear-se a si próprio Gestor (CL10)? | 8 |
| 5 | As propostas da secção 1.2 precisam de aprovação, em particular o cliente SMTP (AGENTS.md). | 2 |
| 6 | O email no login é comparado tal como foi escrito (só sem espaços nas pontas). Não está decidido se deve ignorar maiúsculas. | 1, 2 |

## 5. Como manter este plano

- Ao começar um incremento, o estado passa a "Em curso"; ao cumprir todos os critérios e verificações, passa a "Concluído".
- Uma proposta aprovada passa da secção 1.2 para a 1.1 e é registada no documento de `docs/` a que diz respeito.
- Se uma decisão nova mudar o âmbito de um incremento, atualiza-se este plano na mesma alteração.
