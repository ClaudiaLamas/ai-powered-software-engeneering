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
| FN06 | Gestor cria, edita e elimina tarefas (título, descrição, responsáveis) |
| FN07 | Mudar o estado de uma tarefa (Por fazer, Em curso, Concluída) |
| FN08 | Ver as tarefas de um projeto agrupadas por estado |
| FN09 | Indicador de progresso por projeto (nº de tarefas por estado e % concluídas) |
| FN14 | Comentários em tarefas |
| FN27 | Administrador troca o Gestor de um projeto |
| FN28 | Registo das ações administrativas |
| FN29 | Pedir ajuda: um responsável pede ao Gestor que adicione outro membro a uma tarefa |

Proposta, em resumo: o Administrador cria as contas e os projetos e atribui a cada projeto um Gestor. O Gestor forma a equipa do projeto e cria as tarefas, cada uma com zero ou mais responsáveis. Os membros avançam as tarefas por três estados fixos e comentam-nas; um responsável pode pedir ao Gestor que adicione outro membro à tarefa. O progresso é acompanhado por projeto, com as tarefas agrupadas por estado e a percentagem de tarefas concluídas.

Prazos, pesquisa, notificações e relatórios ficam **fora do MVP** (FN10, FN11, FN15–FN26, FN30). A prioridade e o filtro das tarefas por estado e prioridade entram no MVP (FN12, FN13).

## Glossário

| Termo | Significado |
|---|---|
| Conta | Acesso identificado de uma pessoa à Matriz (nome e email único). Não tem papel próprio. Está "Pendente" até a pessoa definir a palavra-passe pelo link de ativação, depois "Ativa" e, se for desativada, "Desativada" (DE15). |
| Conta de sistema | A primeira conta de Administrador, criada pela equipa do projeto. Não pode ser desativada nem perder a permissão (DE04). |
| Administrador | **Permissão da conta**, não uma função num projeto. Permite gerir contas, permissões, projetos e Gestores. Não dá acesso ao conteúdo de projetos onde a conta não participa (DE02). |
| Função | O que uma conta é num projeto concreto: Gestor ou Membro. A mesma conta pode ser Gestor no projeto A e Membro no projeto B (DE01). |
| Gestor | Função num projeto. Cada projeto tem exatamente um. Edita e arquiva o projeto, forma a equipa, gere as tarefas e os seus responsáveis e decide os pedidos para adicionar responsáveis (DE06, DE07, DE09, DE13). |
| Membro | Função num projeto. Muda o estado das tarefas e comenta-as (DE10). |
| membro do projeto | Em minúscula: qualquer conta que participa no projeto, seja Gestor ou Membro. |
| Equipa | O conjunto dos membros de um projeto. Não é uma entidade separada (R6). |
| Responsável | Um membro do projeto encarregado de uma tarefa. Uma tarefa pode ter vários responsáveis ou nenhum (DE09, DE16). |
| Pedido de responsável | Pedido de um responsável de uma tarefa para que outro membro do projeto seja adicionado como responsável; o Gestor aceita-o ou recusa-o (DE13). |

As funções e a permissão são **decisões internas, por validar com o cliente** (DE01–DE16).

## Tecnologias

| Camada | Tecnologia | Decisão |
|---|---|---|
| Frontend | Vue.js 3 com vue-router e Vite, em TypeScript; servido em containers por nginx | D01–D03, D05 |
| Backend | NestJS 12 em TypeScript (Node.js 26), monólito modular | D02, D03, D07 |
| Dados | PostgreSQL 18 com Prisma 7 (migrations e seed); identificadores UUID | D04 |
| Autenticação | JWT (`@nestjs/jwt` e Passport), palavras-passe com bcrypt (`bcryptjs`) | D06 |
| Testes | Vitest (backend e frontend), Supertest (API), Playwright com Chromium (E2E de browser) | D08 |
| Execução e CI | Docker e Docker Compose ([`compose.yaml`](compose.yaml)); GitHub Actions ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) | D05 |

## Execução com Docker Compose

A forma mais simples de pôr a Matriz a correr: só precisa do Docker Engine com o Docker Compose v2 (testado com Docker 29.9.3 e Compose 2.40.3). Os comandos partem da pasta `matriz/`.

| Serviço | Imagem | O que faz | Porta |
|---|---|---|---|
| `postgres` | `postgres:18.6-alpine` | Base de dados; os dados ficam no volume `matriz_pgdata` | `127.0.0.1:${POSTGRES_PORT}` (5432) |
| `migrate` | `backend/Dockerfile` (fase `tools`) | Aplica as migrations (`prisma migrate deploy`) e termina; o backend só arranca depois | — |
| `backend` | `backend/Dockerfile` (fase `runtime`) | API NestJS; healthcheck em `GET /health` | só na rede interna (3000) |
| `frontend` | `frontend/Dockerfile` | nginx com a aplicação web; encaminha `/api/...` para o backend sem o prefixo `/api` | `127.0.0.1:${FRONTEND_PORT}` (8080) |

O frontend e o backend partilham a rede `web`; o backend, as migrations e o PostgreSQL partilham a rede `data`. O frontend não chega à base de dados. As imagens correm com um utilizador sem privilégios e não têm credenciais: tudo vem do `.env`.

1. Configuração (ficheiro ignorado pelo Git). Muda os valores fictícios. O `JWT_SECRET` vem vazio: gera-o com o comando abaixo (pelo menos 32 caracteres):

   ```bash
   cp .env.example .env
   openssl rand -hex 32      # valor para JWT_SECRET no .env
   ```

2. Construir as imagens e arrancar (espera que `docker compose ps` mostre `backend` e `frontend` com `healthy` e `migrate` com `Exited (0)`):

   ```bash
   docker compose up -d --build
   docker compose ps
   ```

3. Dados de demonstração, só a pedido (idempotente; usa `SEED_DEMO_PASSWORD` do `.env`):

   ```bash
   docker compose run --rm migrate npm run db:seed
   ```

4. Abrir `http://localhost:8080` (ou a porta de `FRONTEND_PORT`) e entrar com uma das [contas de demonstração](#7-contas-de-demonstração). `curl http://localhost:8080/api/health` confirma que o frontend chega ao backend e o backend à base de dados.

| Comando | Para quê |
|---|---|
| `docker compose config -q` | Valida o `compose.yaml` com o `.env` |
| `docker compose logs --tail=50 backend` | Logs de um serviço (por exemplo, a mensagem de um `JWT_SECRET` inválido) |
| `docker compose down` | Para e apaga os containers; os dados ficam no volume |
| `docker compose down -v` | Apaga também o volume, **com todos os dados** |
| `docker compose up -d postgres` | Só o PostgreSQL, para o desenvolvimento local (secção seguinte) |

Os containers usam o mesmo volume `matriz_pgdata` que o desenvolvimento local: são os mesmos dados. Se a porta 8080 estiver ocupada, muda `FRONTEND_PORT` no `.env`.

## Integração contínua

O workflow [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) (na raiz do repositório Git) corre em cada `push` e `pull_request` que mude `matriz/` ou o próprio workflow, só com permissão de leitura do código:

| Job | O que corre |
|---|---|
| `backend` | `npm ci`, `prisma generate`, `npm run lint`, `npm run build`, `npm test` e `npm run test:e2e` (PostgreSQL 18 como serviço do job) |
| `frontend` | `npm ci`, `npm run type-check`, `npm run build-only` e `npm run test:unit -- --run` (os dois primeiros são o `npm run build`, em passos separados) |
| `e2e-browser` | Testes Playwright (Chromium), com uma `E2E_PASSWORD` aleatória; guarda os traces se falharem |
| `docker` | Só depois dos três anteriores: `docker compose config -q`, `build`, `up -d`, `GET /api/health` através do nginx, seed e entrada com uma conta de demonstração; no fim, `down -v` |

Não usa segredos do repositório: a palavra-passe do PostgreSQL dos jobs é descartável e os outros valores são gerados em cada execução.

## Execução local

Passos para correr a Matriz numa máquina a partir de um clone limpo. Todos os comandos partem da pasta `matriz/` (onde está este ficheiro), salvo indicação em contrário. O que já funciona na aplicação está em [docs/implementation-plan.md](docs/implementation-plan.md): por agora, entrar e sair, o painel, os projetos (sem criação pela interface nem gestão da equipa), as tarefas, os responsáveis e os comentários.

### 1. Requisitos

| Ferramenta | Versão | Notas |
|---|---|---|
| Node.js | A de [`.nvmrc`](.nvmrc) (26.13.0), com o npm que a acompanha (11.20.0) | Instalada e escolhida com o [nvm](https://github.com/nvm-sh/nvm): `nvm install` (só da primeira vez) e `nvm use`. O nvm procura o `.nvmrc` na pasta atual e nas de cima, por isso `nvm use` funciona em `matriz/`, `backend/` e `frontend/`. Corre `nvm use` em cada terminal novo |
| Docker | Docker Engine com o Docker Compose v2 (comando `docker compose`) | Corre o PostgreSQL 18.6 (`postgres:18.6-alpine`, ver [`compose.yaml`](compose.yaml)). Testado com Docker 29.9.3 e Compose 2.40.3 |
| Git | — | Para clonar o repositório |
| `curl` e `jq` | — | Opcionais: só para os pedidos diretos à API mais abaixo |

```bash
nvm install
nvm use
node -v        # tem de mostrar v26.13.0
```

### 2. Instalação das dependências

```bash
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

`npm install` instala as versões fixadas em `backend/package-lock.json` e `frontend/package-lock.json`.

### 3. Configuração (`.env`)

Há três ficheiros `.env`, todos ignorados pelo Git. Cria cada um a partir do `.env.example` respetivo e muda os valores fictícios (em particular as palavras-passe e o `JWT_SECRET`):

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

| Ficheiro | Variável | Obrigatória | Para quê |
|---|---|---|---|
| `.env` | `POSTGRES_USER` | Sim | Utilizador do PostgreSQL criado pelo `compose.yaml` |
| | `POSTGRES_PASSWORD` | Sim | Palavra-passe desse utilizador |
| | `POSTGRES_DB` | Sim | Nome da base de dados de desenvolvimento (no exemplo, `matriz`) |
| | `POSTGRES_PORT` | Não (5432) | Porta da máquina onde o PostgreSQL fica disponível, só em `127.0.0.1` |
| | `FRONTEND_PORT`, `JWT_SECRET`, `JWT_EXPIRES_IN_SECONDS`, `SEED_DEMO_PASSWORD` | Só para a [execução com Docker Compose](#execução-com-docker-compose) | Os mesmos significados das variáveis do `backend/.env`; `FRONTEND_PORT` (8080) é a porta da aplicação. No desenvolvimento local não são usadas |
| `backend/.env` | `PORT` | Não (3000) | Porta da API |
| | `DATABASE_URL` | Sim | Ligação ao PostgreSQL, no formato `postgresql://<utilizador>:<palavra-passe>@localhost:<porta>/<base de dados>?schema=public`. Tem de usar os mesmos valores do `.env` da raiz |
| | `TEST_DATABASE_URL` | Não | Base de dados dos testes de API. Por omissão, a de `DATABASE_URL` com `_test` no fim do nome (`matriz_test`). Tem de terminar em `_test` |
| | `JWT_SECRET` | Sim | Segredo para assinar os JWT (D06). Usa um valor aleatório e longo (`openssl rand -hex 32`). A API não arranca sem ele, com o valor do `.env.example` ou com menos de 32 caracteres |
| | `JWT_EXPIRES_IN_SECONDS` | Não (3600) | Validade dos JWT, em segundos (1 hora, D06) |
| | `SEED_DEMO_PASSWORD` | Para o seed | Palavra-passe das contas de demonstração, com pelo menos 12 caracteres |
| `frontend/.env` | `VITE_API_URL` | Não (`http://localhost:3000`) | Endereço da API, para onde o Vite encaminha os pedidos `/api` em desenvolvimento. Fica visível no navegador: não ponhas segredos aqui |

O backend carrega `backend/.env` ao arrancar (e o Prisma, nas migrations e no seed). As variáveis já definidas no ambiente têm prioridade sobre as do ficheiro.

### 4. Arranque do PostgreSQL

```bash
docker compose up -d postgres
docker compose ps        # espera pelo estado "healthy" do contentor matriz-postgres
```

O PostgreSQL só aceita ligações da própria máquina (`127.0.0.1`). Os dados ficam no volume `matriz_pgdata` e mantêm-se quando o contentor para (`docker compose down`).

### 5. Esquema da base de dados (migrations)

```bash
cd backend
npx prisma generate         # gera o cliente Prisma em src/generated/ (ignorado pelo Git)
npx prisma migrate deploy   # aplica as migrations de prisma/migrations/ à base de dados de DATABASE_URL
npx prisma migrate status   # confirma: "Database schema is up to date!"
```

Volta a correr `npx prisma generate` depois de cada `git pull` que mude `prisma/schema.prisma`, e `npx prisma migrate deploy` quando houver migrations novas.

### 6. Dados de demonstração (seed)

```bash
cd backend
npm run db:seed
```

O seed ([`backend/prisma/seed.ts`](backend/prisma/seed.ts)) cria contas, três projetos, tarefas, responsáveis e comentários fictícios. Nunca corre no arranque e pode correr várias vezes: só cria o que falta e nunca altera nem apaga dados. Por isso, mudar `SEED_DEMO_PASSWORD` depois do seed não muda a palavra-passe das contas já criadas. Se `SEED_DEMO_PASSWORD` faltar ou tiver menos de 12 caracteres, o seed pára com uma mensagem.

### 7. Contas de demonstração

As contas com palavra-passe usam todas o valor de `SEED_DEMO_PASSWORD` que estava em `backend/.env` quando o seed as criou. A palavra-passe não está escrita em nenhum ficheiro do repositório. Os dados são fictícios.

| Conta | Estado | Projetos (função) |
|---|---|---|
| `admin@matriz.test` (conta de sistema, Administrador) | Ativa | nenhum: o Administrador só vê os projetos onde participa (DE02) |
| `ana.silva@matriz.test` | Ativa | Campanha de primavera (Gestor), Portal de clientes (Gestor) |
| `bruno.costa@matriz.test` | Ativa | Renovação do escritório (Gestor), Portal de clientes (Membro) |
| `carla.mendes@matriz.test` | Pendente, sem palavra-passe: não consegue entrar | Campanha de primavera (Membro) |
| `duarte.lopes@matriz.test` | Desativada: não consegue entrar | nenhum |

### 8. Arranque do backend

Num terminal:

```bash
cd backend
nvm use
npm run start:dev
```

A API fica em `http://localhost:3000` (ou na porta de `PORT`) e recarrega ao gravar. Para confirmar que arrancou e que acede à base de dados:

```bash
curl -i http://localhost:3000/health
```

Responde `200 {"status":"ok","database":"up"}` ou, sem acesso à base de dados, `503 {"status":"error","database":"down"}`. Outros comandos estão em [backend/README.md](backend/README.md).

### 9. Arranque do frontend

Noutro terminal, com o backend a correr:

```bash
cd frontend
nvm use
npm run dev
```

Abre `http://localhost:5173` (o endereço aparece no terminal) e entra com uma das contas ativas acima. Outros comandos estão em [frontend/README.md](frontend/README.md).

### 10. Testes e outras verificações

| Onde | Comando | O que faz |
|---|---|---|
| `backend/` | `npm test` | Testes unitários (Vitest) |
| `backend/` | `npm run test:e2e` | Testes de API (Vitest + Supertest). Precisam do PostgreSQL a correr |
| `backend/` | `npm run test:cov` | Testes unitários com cobertura |
| `backend/` | `npm run lint` | Lint (oxlint) de `src/` e `test/` |
| `backend/` | `npm run build` | Compila para `dist/` |
| `frontend/` | `npm run test:unit -- --run` | Testes de componentes, vistas e cliente (Vitest), uma só vez. Sem `-- --run`, fica a observar os ficheiros |
| `frontend/` | `npm run build` | Verifica os tipos (`vue-tsc`) e compila para `dist/` |
| `frontend/` | `E2E_PASSWORD=… npm run test:e2e` | Testes E2E de browser (Playwright, Chromium): entrar, abrir um projeto, criar uma tarefa e vê-la na listagem |

Os testes de API nunca usam a base de dados de desenvolvimento: usam `matriz_test` (ou `TEST_DATABASE_URL`). Antes de cada execução, `backend/test/global-setup.ts` aplica as migrations a essa base, criando-a se não existir, e esvazia todas as tabelas. Recusa qualquer nome que não termine em `_test`. O frontend não tem lint configurado.

Testes E2E de browser (`frontend/e2e/`, configuração em `frontend/playwright.config.ts`):

- Pré-requisitos:
  - o PostgreSQL a correr (`docker compose up -d postgres`);
  - o `backend/.env` criado (passo 3) e as dependências do backend instaladas (passo 2);
  - o Chromium do Playwright, uma vez: `cd frontend && npx playwright install chromium`;
  - a variável `E2E_PASSWORD`, com pelo menos 12 caracteres. É a palavra-passe das contas de demonstração na base dos testes E2E; escolhe uma só para a máquina local e não a escrevas em ficheiros do repositório.
- Comando, a partir de `frontend/`:

  ```bash
  E2E_PASSWORD='<palavra-passe local>' npm run test:e2e
  ```

- O Playwright arranca um backend (porta 3100) e um frontend (porta 5180) próprios, sem reutilizar os de desenvolvimento. Usam a base `<nome>_e2e_test` (`matriz_e2e_test`), derivada do `DATABASE_URL` do `backend/.env`. Em cada execução, aplica as migrations, esvazia todas as tabelas (`frontend/e2e/reset-database.sql`) e corre o `db:seed` com `SEED_DEMO_PASSWORD=$E2E_PASSWORD`. A configuração aborta antes de esvaziar se o nome da base não terminar em `_test`, e o SQL volta a confirmá-lo.
- Em caso de falha, o trace e a captura de ecrã ficam em `frontend/test-results/` (`npx playwright show-trace <ficheiro>.zip`).

### 11. Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| `npm warn EBADENGINE` no frontend, ou erros estranhos ao instalar, compilar ou testar | Versão errada do Node.js (por exemplo, um terminal novo sem `nvm use`) | `nvm use` e confirma `node -v` = `v26.13.0`. Se mudaste de versão depois de instalar, apaga `node_modules/` e corre `npm install` outra vez |
| `nvm: command not found` ou `N/A: version "v26.13.0" is not yet installed` | O nvm não está instalado ou não tem esta versão | Instala o nvm e corre `nvm install` na pasta `matriz/` |
| `docker compose up` falha com "Define POSTGRES_USER no .env" (ou outra variável) | Falta o `.env` da raiz | `cp .env.example .env` e preenche os valores |
| `docker compose up` falha com a porta 5432 ocupada | Outro PostgreSQL na máquina | Muda `POSTGRES_PORT` no `.env` e a porta em `DATABASE_URL` no `backend/.env` |
| Migrations ou seed falham com erro de autenticação no PostgreSQL | `DATABASE_URL` não coincide com o `.env` da raiz, ou a palavra-passe mudou depois de o volume ser criado (o PostgreSQL só usa `POSTGRES_PASSWORD` na primeira vez) | Acerta `DATABASE_URL`. Se mudaste `POSTGRES_PASSWORD`, repõe o valor antigo; apagar o volume (`docker compose down -v`) apaga todos os dados |
| Migrations, seed ou testes de API falham sem conseguir ligar à base de dados | O PostgreSQL não está a correr | `docker compose up -d postgres` e espera por `healthy` |
| A API ou o seed falham porque não encontram `src/generated/prisma` | O cliente Prisma não foi gerado (a pasta não vem no clone) | `cd backend && npx prisma generate` |
| A API não arranca: "Define a variável de ambiente JWT_SECRET" | Falta o `backend/.env` ou o `JWT_SECRET` (em containers, falta o `JWT_SECRET` no `.env` da raiz) | `cp backend/.env.example backend/.env` e define `JWT_SECRET`; em containers, define-o no `.env` da raiz (`openssl rand -hex 32`) |
| A API não arranca: "JWT_SECRET tem o valor de exemplo" ou "tem de ter pelo menos 32 caracteres" | `JWT_SECRET` ficou com o valor do `.env.example` ou é curto | Gera um segredo novo com `openssl rand -hex 32` e põe-no em `backend/.env` |
| O seed pára: "Falta a variável de ambiente SEED_DEMO_PASSWORD" ou "tem de ter pelo menos 12 caracteres" | `SEED_DEMO_PASSWORD` em falta ou curta | Define-a em `backend/.env` com pelo menos 12 caracteres |
| O login das contas de demonstração dá "O email ou a palavra-passe estão errados." | Estás a usar outra palavra-passe, não a de `SEED_DEMO_PASSWORD` quando o seed criou as contas; ou a conta é a da Carla, que está pendente | Usa a palavra-passe da altura do seed. Mudar `SEED_DEMO_PASSWORD` depois não muda as contas já criadas |
| No frontend, "Não foi possível contactar o servidor. Tente outra vez." | O backend não está a correr ou `VITE_API_URL` aponta para outro endereço (o Vite responde `502` em `/api`) | Arranca o backend e confirma `curl -i http://localhost:3000/health` e o `frontend/.env` |
| Os testes de API recusam a base de dados: 'tem de terminar em "_test"' | `TEST_DATABASE_URL` aponta para uma base sem `_test` no nome | Corrige `TEST_DATABASE_URL` ou apaga-a, para usar `matriz_test` |

### Pedidos diretos à API: ciclo do token (D06)

1. **Entrar:** `POST /auth/login` com `{ "email", "password" }`. O backend compara a palavra-passe com o hash bcrypt e devolve `{ accessToken, tokenType: "Bearer", expiresIn, account }`, sem o hash.
   - Email desconhecido, palavra-passe errada ou conta pendente: sempre `401 INVALID_CREDENTIALS`, com a mesma mensagem e o mesmo tempo de resposta, para não revelar se o email existe.
   - Conta desativada: `403 ACCOUNT_DEACTIVATED`, só quando a palavra-passe está certa (US01).
2. **Usar:** todos os pedidos, exceto `POST /auth/login` e `GET /health`, levam o cabeçalho `Authorization: Bearer <accessToken>`. Sem token, ou com um token inválido ou expirado, a resposta é `401 UNAUTHENTICATED`. Em cada pedido o backend lê a conta na base de dados: uma conta desativada recebe `401` mesmo antes de o token expirar, e a permissão de Administrador é sempre a atual.
3. **Validade:** `JWT_EXPIRES_IN_SECONDS` (por omissão 3600). Não há renovação: quando o token expira, o frontend apaga a sessão e volta ao ecrã de entrada com "A sessão expirou. Inicie sessão novamente."
4. **Sair:** `POST /auth/logout` responde `204`. O backend não revoga o token: o frontend apaga-o do `sessionStorage` e volta ao ecrã de entrada. Um token copiado antes de sair continua válido até expirar.

Exemplo com `curl` e `jq`, com `SEED_DEMO_PASSWORD` exportada na shell (não escrevas a palavra-passe no comando):

```bash
TOKEN=$(curl -s -X POST localhost:3000/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"ana.silva@matriz.test\",\"password\":\"$SEED_DEMO_PASSWORD\"}" | jq -r .accessToken)
curl -s localhost:3000/me -H "Authorization: Bearer $TOKEN"
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:3000/auth/logout -H "Authorization: Bearer $TOKEN"
```

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
| [openapi.yaml](openapi.yaml) | Contrato da API do backend para o MVP (US01–US19, US22, US23, US31). |
| [AGENTS.md](AGENTS.md) | Instruções para agentes de IA que trabalhem no repositório. |
| [CHANGELOG.md](CHANGELOG.md) | Alterações de cada versão (Semantic Versioning). |
| [docs/releases/v0.1.0-rc.1.md](docs/releases/v0.1.0-rc.1.md) | Notas da versão candidata 0.1.0-rc.1: o que inclui, limitações e como atualizar. |
| [docs/verification.md](docs/verification.md) | Verificação do MVP e da entrega com Docker e CI (secção 8). |
| [compose.yaml](compose.yaml), [`backend/Dockerfile`](backend/Dockerfile), [`frontend/Dockerfile`](frontend/Dockerfile), [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | Execução em containers e integração contínua. |

## Convenção de IDs

Os IDs são iguais em todos os ficheiros.

| Prefixo | Significado | Tipo |
|---|---|---|
| F1–F5 | Factos ditos pelo cliente | **Facto** |
| P1–P14 | Pressupostos implícitos identificados na análise inicial | Pressuposto |
| R1–R10 | Respostas assumidas às perguntas de clarificação prioritárias | Pressuposto |
| DE01–DE16 | Decisões da equipa do projeto (2026-10-29, 2026-11-04, 2026-11-08 e 2026-11-11), não validadas pelo cliente | Decisão interna |
| PN01–PN21 | Regras de negócio: concretizam decisões DE ou são pressupostos | Decisão interna ou pressuposto |
| D01–D09 | Decisões técnicas, todas tomadas, não validadas pelo cliente | Decisão interna |
| FN01–FN30 | Funcionalidades propostas | Proposta |
| US01–US19, US22, US23, US31 | User stories do MVP | Proposta |
| US20, US21, US24–US30, US32–US37 | User stories fora do MVP | Proposta |
| CL1–CL12 | Casos-limite | Proposta |
| RNF01–RNF03 | Requisitos não funcionais | Pressuposto |
