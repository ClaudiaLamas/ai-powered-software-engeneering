# Plano de entrega — Docker, Docker Compose e GitHub Actions

Plano técnico do Exercício 1 da Ficha Prática 05, com o que foi efetivamente feito e as decisões tomadas.

- **Origem:** o plano foi apresentado numa conversa com um agente de IA (Claude Code) a 2026-11-17 e aprovado pela programadora com as opções recomendadas ("Sim, avança").
- **Implementação:** feita a 2026-11-18.
- **Registo:** este ficheiro foi escrito depois da implementação, porque o plano não tinha ficado registado em nenhum ficheiro.
- **Estado das decisões:** todas são **decisões internas, por validar**, como as restantes D01–D09 ([constraints.md](constraints.md#4-decisões-técnicas)).

## 1. Análise do projeto (antes de alterar ficheiros)

| Componente | Tecnologia | Como corria antes | Porta |
|---|---|---|---|
| Backend (API REST) | NestJS 12, TypeScript, ESM, Prisma 7 com `@prisma/adapter-pg`, JWT com Passport e `bcryptjs` | `nest start`; em produção `node dist/main` | 3000 |
| Frontend (aplicação web) | Vue 3.5, vue-router 5 (`createWebHistory`), Vite 8 | `vite`, com o proxy `/api` → backend | 5173 |
| Base de dados | PostgreSQL 18 (`postgres:18-alpine`) | `docker-compose.yml`, só com este serviço, volume `matriz_pgdata` | 5432 (só em 127.0.0.1) |

- **Versões:** Node.js 26.13.0 (`.nvmrc`), com os `package-lock.json` versionados. Docker 29.9.3 e Compose 2.40.3 na máquina de desenvolvimento.
- **Serviços externos:** só o PostgreSQL. O Mailpit (D09) está previsto, mas nenhum código envia emails, porque o incremento 2 está "Por iniciar".
- **Variáveis de ambiente:**
  - `.env` da raiz: `POSTGRES_*`;
  - `backend/.env`: `PORT`, `DATABASE_URL`, `TEST_DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN_SECONDS` e `SEED_DEMO_PASSWORD`;
  - `frontend/.env`: `VITE_API_URL`, que só o proxy do Vite usa.
  - O backend usa `process.loadEnvFile()` e, sem ficheiro, lê só as variáveis do ambiente.
- **Testes já existentes:**
  - backend: Vitest unitário, Vitest com Supertest sobre `matriz_test`, oxlint e build;
  - frontend: Vitest, `vue-tsc` com o build e Playwright E2E.

**Pontos que condicionaram o plano:**

1. O frontend chama `/api/...` com caminhos relativos. O backend não tem CORS e espera os caminhos sem o prefixo `/api`.
2. A CLI do Prisma e o `tsx` (para as migrations e o seed) são `devDependencies`.
3. O seed só corre a pedido (AGENTS.md).
4. O cliente Prisma é gerado em `src/generated/` e o `nest build` compila-o para `dist/generated/`.
5. A raiz do repositório Git é a pasta acima de `matriz/`. O workflow tem de ficar em `.github/workflows/` dessa raiz.
6. Não existia nenhum Dockerfile, `.dockerignore`, workflow nem `CHANGELOG.md`.

## 2. Decisões tomadas

As quatro questões do plano foram aprovadas com a opção recomendada:

| # | Questão | Decisão | Alternativas preteridas |
|---|---|---|---|
| Q1 | Nome do ficheiro Compose | `docker-compose.yml` passa a `compose.yaml`, o nome pedido pela ficha | Manter `docker-compose.yml` |
| Q2 | Como o frontend chega ao `/api` em containers | **nginx** no container do frontend. Serve o `dist/` e encaminha `/api/...` para `http://backend:3000/...` sem o prefixo, como o proxy do Vite. Também devolve o `index.html` nas rotas da aplicação | `vite preview` (não é próprio para produção); o backend servir os ficheiros estáticos (exigia uma dependência nova) |
| Q3 | Testes E2E de browser na CI | Sim, num job próprio (`e2e-browser`) | Só testes unitários e de API |
| Q4 | Versão candidata | `0.1.0-rc.1`, porque o MVP está incompleto (incrementos 2, 7 e 8 por iniciar) | `1.0.0` |

Decisões que decorrem do plano, sem uma questão própria:

- **Quando correm as migrations.** Num serviço próprio, `migrate`, que usa a imagem da fase `tools` do `backend/Dockerfile` e corre `prisma migrate deploy` antes da API. O backend só arranca quando o `migrate` termina sem erros (`depends_on: condition: service_completed_successfully`). A imagem da API não tem a CLI do Prisma.
- **Quando corre o seed.** Nunca no arranque. Só a pedido, com `docker compose run --rm migrate npm run db:seed`.
- **Credenciais.** Nenhuma nas imagens. O `DATABASE_URL` é montado no `compose.yaml` a partir das variáveis `POSTGRES_*` do `.env`. O `JWT_SECRET` e o `SEED_DEMO_PASSWORD` também vêm do `.env`. Os `.dockerignore` deixam os `.env` de fora.
- **Portas.** Só o frontend (`127.0.0.1:${FRONTEND_PORT}`, por omissão 8080) e o PostgreSQL (`127.0.0.1:${POSTGRES_PORT}`, para o desenvolvimento local) ficam acessíveis a partir da máquina. O backend só está na rede interna.
- **Redes.** `web` liga o frontend ao backend. `data` liga o backend, o `migrate` e o PostgreSQL. O frontend não chega à base de dados.
- **Mailpit.** Fica de fora até ao incremento 2.

### O que aconteceu ao `docker-compose.yml`

- **Nome:** passou a `compose.yaml` com `git mv` (Q1), por isso o histórico do ficheiro mantém-se.
- **Conteúdo:**
  - acrescentou os serviços `migrate`, `backend` e `frontend`, as redes `web` e `data`, e `name: matriz`;
  - o serviço `postgres` mantém a imagem, o `container_name: matriz-postgres`, a porta, o healthcheck e o volume `matriz_pgdata`. O volume continua o mesmo, por isso os dados existentes mantêm-se.
- **Consequência:** `docker compose up -d` passou a arrancar a aplicação inteira. Para ter só o PostgreSQL no desenvolvimento local, o comando é `docker compose up -d postgres`. Atualizei `README.md`, `AGENTS.md`, `implementation-plan.md` e `verification.md`.
- **`JWT_SECRET` opcional na interpolação** (`${JWT_SECRET:-}`): se o `.env` não tiver `JWT_SECRET`, o PostgreSQL arranca na mesma. Nesse caso é a API que recusa arrancar, com a sua própria mensagem.
- **Commits:** a mudança de nome ficou registada no commit `7513503` (ci) e o novo conteúdo no `7035da0` (build). Ver a secção 5.

## 3. Ficheiros criados e alterados

| Ficheiro | Ação |
|---|---|
| `backend/Dockerfile` | Criado. Multi-stage: `deps` → `build` (`prisma generate` + `nest build`) → `tools` (migrations e seed) → `runtime` (`node:26.13.0-alpine`, `npm ci --omit=dev`, só `dist/`, utilizador `node`, `HEALTHCHECK` a `/health`) |
| `backend/.dockerignore` | Criado. Exclui `.env*`, `node_modules`, `dist`, `src/generated`, os testes e o `coverage` |
| `frontend/Dockerfile` | Criado. Build com Node.js e serviço com `nginxinc/nginx-unprivileged:1.30-alpine` |
| `frontend/nginx.conf` | Criado. `/api/` → backend sem o prefixo; fallback para o `index.html`; cache dos `/assets/` |
| `frontend/.dockerignore` | Criado |
| `docker-compose.yml` → `compose.yaml` | Mudado de nome e alterado (secção 2) |
| `.env.example` (raiz) | Alterado: `FRONTEND_PORT`, `JWT_SECRET`, `JWT_EXPIRES_IN_SECONDS` e `SEED_DEMO_PASSWORD`, com valores fictícios |
| `../.github/workflows/ci.yml` | Criado (secção 4) |
| `README.md` | Secções "Tecnologias", "Execução com Docker Compose" e "Integração contínua"; variáveis novas; tabela de documentação |
| `docs/architecture.md` | §6 com um diagrama Mermaid; D05 atualizada |
| `docs/constraints.md` | D05 alargada |
| `CHANGELOG.md`, `docs/releases/v0.1.0-rc.1.md` | Criados |
| `docs/verification.md` | §8 com as evidências; passo do ambiente com `docker compose up -d postgres` |
| `AGENTS.md`, `backend/README.md`, `backend/.env.example`, `docs/implementation-plan.md`, `backend/test/health.e2e-spec.ts`, `frontend/playwright.config.ts` | Só referências: `compose.yaml` e `docker compose up -d postgres` |

## 4. Pipeline de CI

Ficheiro `.github/workflows/ci.yml`, na raiz do repositório.

- **Execução:**
  - corre em `push` e `pull_request` que mudem `matriz/**` ou o próprio workflow;
  - `permissions: contents: read`, com `concurrency` para cancelar execuções repetidas;
  - as actions estão fixadas por SHA de commit;
  - não usa segredos do repositório: a palavra-passe do PostgreSQL dos jobs é descartável e os outros valores são gerados em cada execução.

| Job | Passos | Depende de |
|---|---|---|
| `backend` | `npm ci`, `prisma generate`, `lint`, `build`, `npm test` e `test:e2e`, com o PostgreSQL 18 como serviço | — |
| `frontend` | `npm ci`, `npm run type-check`, `npm run build-only` e `test:unit -- --run`. Até 2026-11-18 era um só passo, `npm run build`; foi separado para o passo que falha dizer se foi um erro de tipos ou do Vite | — |
| `e2e-browser` | Backend e frontend com `npm ci`, `backend/.env` só com `DATABASE_URL`, `E2E_PASSWORD` aleatória e Chromium do Playwright; guarda os traces se falhar | — |
| `docker` | `.env` gerado, `compose config -q`, `build`, `up -d`, `GET /api/health` através do nginx, seed e `POST /api/auth/login`, logs e `down -v` | `backend`, `frontend` e `e2e-browser` |

## 5. Etapas e o que aconteceu em cada uma

| # | Etapa planeada | Resultado |
|---|---|---|
| 1 | Imagem do backend: `docker build` e `docker run` com `/health` | Feita. Sem base de dados, a API arranca como `node` e responde `503 database down`, como esperado |
| 2 | Imagem do frontend | Feita. `nginx -t` sem erros; o build não inclui as devtools do Vue |
| 3 | `compose.yaml` e `.env.example`: `config`, `build`, `up`, `ps`, `logs`; entrar, criar uma tarefa, recriar os containers | Feita. **Imprevisto:** a porta 8080 da máquina estava ocupada, por isso a validação usou `FRONTEND_PORT=8088`. A tarefa manteve-se depois de `down` e `up` e foi apagada no fim. Também desliguei o aviso de atualização do npm (`NPM_CONFIG_UPDATE_NOTIFIER=false`) |
| 4 | `ci.yml`, push com aprovação e verificação no GitHub | O workflow está criado. **Imprevisto (actionlint):** dois erros, o contexto `env` no `env` de um job e uma variável de ciclo sem uso; foram corrigidos. A programadora aprovou o push. **Imprevisto (GitHub):** a [primeira execução](https://github.com/ClaudiaLamas/ai-powered-software-engeneering/actions/runs/44208738418) falhou no `e2e-browser`, por um defeito do workflow (ver 5.1). A correção está no commit `60cda3b`. A [segunda execução](https://github.com/ClaudiaLamas/ai-powered-software-engeneering/actions/runs/44210281487), sobre `749c52c`, **passou nos quatro jobs**, incluindo o `docker` ([verification.md §8.4](verification.md#84-pipeline-no-github-actions)) |
| 5 | Documentação, CHANGELOG e notas da versão | Feita |
| 6 | Validação final e relatório (exercício 6) | Parcial: a validação local e a pipeline verde no GitHub estão em [verification.md §8](verification.md#8-entrega-com-docker-docker-compose-e-github-actions-ficha-05). Falta a falha controlada |

### 5.1 Primeira execução da pipeline no GitHub (falhou)

| | |
|---|---|
| Execução | [44208738418](https://github.com/ClaudiaLamas/ai-powered-software-engeneering/actions/runs/44208738418), evento `push`, commit `7035da0`, 2026-11-18 00:33 UTC |
| Jobs | `backend`: passou. `frontend`: passou. **`e2e-browser`: falhou.** `docker`: não correu (`skipped`), porque depende do `e2e-browser` |
| Passo que falhou | "Dependências e cliente Prisma do backend" (`npm ci && npx prisma generate`, em `matriz/backend`). O `npm ci` passou; falhou o `prisma generate` |
| Mensagem | `Failed to load config file ".../matriz/backend" as a TypeScript/JavaScript module. Error: PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL.` (código de saída 1) |
| Tipo de defeito | **Do workflow.** Não foi um defeito do código da aplicação nem do ambiente da CI |

**Causa.** O `prisma.config.ts` lê a ligação com `env('DATABASE_URL')`, e o Prisma recusa carregar a configuração quando a variável não existe, mesmo num comando que não liga à base de dados como o `prisma generate`. O workflow não dava essa variável a este passo:

- No job `backend`, `DATABASE_URL` está no `env` do job inteiro e o mesmo passo funcionou.
- No job `e2e-browser`, o URL só estava em `CI_DATABASE_URL`, no `env` do workflow, com outro nome. Só era escrito no `backend/.env` no passo seguinte.

**Porque não foi detetado antes:**

- **Localmente:** o `backend/.env` define `DATABASE_URL` e o `prisma.config.ts` carrega-o (`dotenv/config`).
- **No `backend/Dockerfile`:** o problema já estava previsto, com um endereço fictício só para o `prisma generate`.
- **No actionlint:** valida a sintaxe e os contextos, não as variáveis de que cada comando precisa.

**O que muda o commit `60cda3b`.** Acrescenta três linhas ao `ci.yml`, só no passo que falhou: um comentário e `env: DATABASE_URL: ${{ env.CI_DATABASE_URL }}`. Não muda nenhum outro passo, job nem ficheiro, e não toca no código da aplicação. Os passos seguintes não precisavam de correção: o `backend/.env` passa a ter o mesmo URL e o `playwright.config.ts` dá ao backend dos testes o seu próprio `DATABASE_URL` (`matriz_e2e_test`).

**Verificação da correção:**

- **Feita:** reprodução local no `backend/`, com o dotenv a apontar para um ficheiro inexistente (`DOTENV_CONFIG_PATH=/nonexistent`):
  - sem `DATABASE_URL`, o `npx prisma generate` dá a mesma mensagem e o código 1;
  - com `DATABASE_URL` definida (um valor fictício), gera o cliente;
  - o `ci.yml` corrigido passa no actionlint.
- **Verificada no GitHub:** a [execução 44210281487](https://github.com/ClaudiaLamas/ai-powered-software-engeneering/actions/runs/44210281487), sobre `749c52c`, passou nos quatro jobs. O `docker` correu pela primeira vez e passou.

**Commits** no ramo `aula05-entrega`:
- `7513503` ci;
- `ddb2015` docs;
- `7035da0` build;
- `60cda3b` fix(ci);
- `749c52c` docs (este plano e a análise da falha).

A ordem dos commits não é a planeada. O primeiro commit (build) falhou e a mudança de nome do ficheiro Compose, que já estava preparada, entrou no commit da CI. O histórico não foi reescrito.

## 6. Por decidir ou fora deste plano

Nenhuma destas questões foi decidida:

- **Falha controlada** num teste para confirmar que a pipeline falha (pedida na ficha).
- **Pull request** do `aula05-entrega` para o `main`.
- **Versão nos `package.json`** (`0.0.1` e `0.0.0`): não mudou. A versão `0.1.0-rc.1` só existe no CHANGELOG e nas notas. Não foi criada nenhuma tag nem release.
- **11 vulnerabilidades de severidade alta** reportadas pelo `npm ci` do backend na CI. Corrigi-las implica atualizar dependências, o que exige aprovação.
- **Deploy, HTTPS e publicação das imagens num registo**, como o GitHub Container Registry do Desafio C: continuam fora do âmbito (D05).
- **Mailpit:** entra com o incremento 2.

## 7. Revisão das imagens base e dos `.dockerignore` (2026-11-18)

Revisão aprovada pela programadora depois da entrega das secções anteriores. Commit `build: fixar versões das imagens base e completar .dockerignore`.

| Ficheiro | Antes | Depois |
|---|---|---|
| `frontend/Dockerfile` | `nginxinc/nginx-unprivileged:1.30-alpine` | `nginxinc/nginx-unprivileged:1.30.6-alpine` |
| `compose.yaml` (serviço `postgres`) | `postgres:18-alpine` | `postgres:18.6-alpine` |
| `../.github/workflows/ci.yml` (serviços dos jobs `backend` e `e2e-browser`) | `postgres:18-alpine` | `postgres:18.6-alpine`, num commit próprio a seguir ao do `compose.yaml` |
| `backend/.dockerignore` | — | Acrescenta `test-results` e `playwright-report`, como no do frontend |
| `backend/Dockerfile` | `node:26.13.0-alpine` | Sem alteração (já era uma versão exata) |

- **Como confirmei as etiquetas:** `1.30-alpine` corria o nginx 1.30.6 e `18-alpine` o PostgreSQL 18.6 (`nginx -v` e `postgres --version` nos containers). `docker manifest inspect` confirmou que `1.30.6-alpine` e `18.6-alpine` existem.
- **Também atualizado:** `README.md` e `architecture.md` §6, que descrevem as imagens atuais. As secções 1 e 3 deste ficheiro ficam como estão, porque registam o estado do projeto nessa altura.
- **Verificação:** `docker build` das imagens `runtime` do backend e do frontend, `docker compose config -q` sem erros. O `docker compose up` com as novas versões fica para a programadora validar.

### 7.1 Decisão: etiquetas exatas em vez de digest

**Decisão interna, por validar.** As imagens base ficam fixadas por etiqueta exata (`node:26.13.0-alpine`, `nginxinc/nginx-unprivileged:1.30.6-alpine`, `postgres:18.6-alpine`) e não por digest (`@sha256:…`).

- **Porquê:**
  - a etiqueta exata fixa a versão do Node.js, do nginx e do PostgreSQL, que é o que pode mudar o comportamento da aplicação;
  - lê-se e revê-se sem ferramentas: um digest não diz que versão é;
  - os mantenedores voltam a publicar a mesma etiqueta quando corrigem vulnerabilidades da base Alpine, e as imagens recebem essas correções no build seguinte.
- **O que se perde:**
  - o build não é idêntico bit a bit: a mesma etiqueta pode apontar para outro digest, com outros pacotes do Alpine;
  - uma etiqueta pode ser republicada de forma maliciosa, e o digest protegeria contra isso.
- **Alternativa preterida:** a etiqueta com digest (`imagem:versão@sha256:…`), que exige atualizar o digest à mão ou com uma ferramenta como o Dependabot. Faz mais sentido quando houver publicação das imagens num registo, que está fora do âmbito (D05).
- **Mudar de versão:** sempre à mão, no Dockerfile ou no `compose.yaml`. A versão do Node.js tem de continuar igual à do `.nvmrc`.

### 7.2 O `DATABASE_URL` fictício no build do backend não é uma credencial

A fase `build` do `backend/Dockerfile` corre:

```
RUN DATABASE_URL="postgresql://build@localhost:5432/build" npx prisma generate && npm run build
```

O `prisma.config.ts` recusa carregar sem `DATABASE_URL`, mesmo no `prisma generate`, que não liga à base de dados (é a mesma causa da falha da CI na secção 5.1). O valor existe só para satisfazer essa leitura:

- **Não dá acesso a nada:** não tem palavra-passe, o utilizador e a base de dados (`build`) não existem, e aponta para `localhost` dentro do container de build, onde não há nenhum PostgreSQL.
- **Não fica no ambiente das imagens:** é uma variável só desse `RUN`, não um `ARG` nem um `ENV`. O `docker inspect` das imagens não a mostra.
- **Não chega à imagem da API:** a fase `runtime` parte de uma imagem `node` nova e só copia o `dist/`. O `docker history` de `matriz-backend:local` não tem a linha. Aparece no da imagem `tools` (serviço `migrate`), que parte da fase `build`, mas é o mesmo valor fictício.
- **O `DATABASE_URL` real** e o `JWT_SECRET` chegam só em runtime, pelo `compose.yaml` e pelo `.env`, que os `.dockerignore` deixam fora das imagens.

### 7.3 Limitação aceite: tamanho da imagem do backend

**Aceite pela programadora em 2026-11-18.** Não foi otimizada nesta entrega.

Medido com `docker images` e `du -sh` dentro do container, sobre as imagens construídas a 2026-11-18:

| Imagem | Tamanho |
|---|---|
| `matriz-backend:local` (fase `runtime`) | **571 MB** |
| `matriz-backend-tools:local` (fase `tools`, serviço `migrate`) | 896 MB |
| `matriz-frontend:local` | 60,3 MB |

Na imagem `runtime` do backend, `node_modules` ocupa **405,5 MB**. As maiores pastas:

| Pasta | Tamanho |
|---|---|
| `@prisma` | 166,7 MB |
| `prisma` | 40,2 MB |
| `effect` | 33,8 MB |
| `@electric-sql` | 25,4 MB |
| `typescript` | 23,6 MB |
| `libphonenumber-js` | 12,3 MB |
| `rxjs` | 11,4 MB |

- **Causa principal:** o `@prisma/client` (dependência de produção) declara o `prisma` (CLI) e o `typescript` como dependências opcionais. O `npm ci --omit=dev` não as exclui, e é o que mostra `npm ls typescript --omit=dev`. Não verifiquei de onde vêm o `effect` e o `@electric-sql`.
- **Porque fica assim:** reduzir o tamanho implica mudar dependências ou apagar pacotes de `node_modules` à mão na imagem final, e ambas as coisas exigem aprovação. A imagem funciona, corre sem root e não tem o código-fonte nem as `devDependencies` do `package.json`.
- **Como se pode reduzir mais tarde:** retirar da fase `runtime` os pacotes que só o build usa, ou rever as dependências do Prisma. Qualquer das duas precisa de aprovação e de voltar a correr os testes de API e o job `docker` da CI.

## 8. `JWT_SECRET` no `compose.yaml`: `:-` em vez de `:?` (2026-11-18)

**Decisão da programadora:** o serviço `backend` mantém `JWT_SECRET: ${JWT_SECRET:-}`.

**Alternativa avaliada e rejeitada:** `${JWT_SECRET:?Define JWT_SECRET no .env (openssl rand -hex 32)}`, que faria o Compose recusar qualquer comando sem o segredo.

- **Porque foi rejeitada:** o Compose interpola o ficheiro inteiro antes de qualquer comando, mesmo quando só se pede um serviço. Obrigaria a definir o `JWT_SECRET` no `.env` da raiz até para `docker compose up -d postgres`, o arranque só da base de dados para o desenvolvimento local. Isso contradiz o `README.md` (linha 169), onde o `JWT_SECRET` do `.env` da raiz só é preciso para a execução com Docker Compose.
- **Como foi avaliada:** numa cópia do `compose.yaml` fora do repositório, só com `docker compose config` e `ps`, sem arrancar containers.

| Caso | Resultado | Como se sabe |
|---|---|---|
| `.env` gerado como no job `docker` da CI, `config -q` | Passa (código 0) | Corrido |
| `.env.example` (`JWT_SECRET=` vazio) ou sem a linha, `config -q` | Falha (código 1): `required variable JWT_SECRET is missing a value` | Corrido |
| `.env.example`, `config -q postgres` e `ps` | Falham com a mesma mensagem | Corrido |
| `docker compose up -d postgres`, `logs`, `run` e `down` sem `JWT_SECRET` | Falhariam da mesma forma | Deduzido: a interpolação acontece antes de qualquer comando |
| Jobs `backend` e `e2e-browser` da CI | Não são afetados | Lido no `ci.yml`: usam o PostgreSQL como serviço do GitHub Actions, sem Compose |

**Onde fica a proteção:** na API (S1, [quality-security-review.md](quality-security-review.md)).

- Sem segredo, com o valor de exemplo ou com menos de 32 caracteres, `jwtSecret()` lança um erro e o backend não arranca.
- Por isso o healthcheck do backend (`GET /health`) falha e o frontend, que depende de `service_healthy`, não arranca.
- A mensagem aparece em `docker compose logs backend`. Passou a indicar os dois sítios onde se define a variável: o `backend/.env` em desenvolvimento e o `.env` da raiz com Docker Compose.
