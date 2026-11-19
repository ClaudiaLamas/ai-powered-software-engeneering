# Changelog

Alterações relevantes da Matriz. O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e as versões seguem o [Semantic Versioning](https://semver.org/lang/pt-BR/). Enquanto a versão for `0.y.z`, a API e o modelo de dados podem mudar.

## [Por lançar]

Nada por agora.

## [0.1.0-rc.2] — 2026-11-19 (versão candidata, por validar)

Segunda versão candidata: melhorias do frontend para a apresentação e o primeiro deploy online. Não acrescenta incrementos nem muda o contrato da API (`openapi.yaml` continua na versão `0.5.0`). Ver as [notas da versão](docs/releases/v0.1.0-rc.2.md).

### Acrescentado

- **Deploy online** (D10): frontend como Static Site do Render, backend como Web Service Docker do Render e PostgreSQL no Neon (Frankfurt). Definições e ordem das migrations no README, "Deploy"; endereços no README, "Demo online".
- **Painel inicial** (US05, US09):
  - data de hoje e resumo dos projetos ativos (projetos e tarefas por estado);
  - projetos ativos e arquivados em secções separadas;
  - cartão de projeto (`ProjectCard`) clicável, com a função em badge;
  - cartões de esqueleto enquanto carrega e uma segunda linha na lista vazia.
- **Logótipo** (`AppLogo`): um M numa grelha 5×5, no cabeçalho, no ecrã de entrada e no favicon (`favicon.svg`).
- **Script `backend/prisma/reset-demo-passwords.ts`**: muda a palavra-passe das contas de demonstração (`@matriz.test`) que já a têm, com confirmação, para quando a palavra-passe usada no seed se perdeu (o seed nunca altera contas que já existem).

### Alterado

- **Aspeto:** cores, espaçamentos, tipografia e raios como tokens próprios em `base.css` (em vez da paleta do modelo do Vue), nos temas claro e escuro; títulos com peso e uma só escala.
- **Grupos de tarefas** "Por fazer / Em curso / Concluída" com a cor do estado e tarefas em cartões; badges de estado, prioridade e projeto com fundo pela cor.
- **Barra de progresso** dividida por estado (concluída, em curso, por fazer); o valor acessível continua a ser a percentagem concluída.
- **Mensagens:** as de sucesso e as de aviso passam a distinguir-se pela cor e por um ícone que os leitores de ecrã não leem.
- `backend` e `frontend` passam à versão `0.1.0-rc.2` (`package.json` e `package-lock.json`).
- Documentação: README ("Demo online", funcionalidades, Deploy), `docs/architecture.md` §7 e D10 com a configuração real, `docs/verification.md` §8.7 e §8.8, e o [relatório de validação final](docs/validation-report.md).

### Acessibilidade

- Contraste AA medido no navegador nos dois temas: a cor de destaque do tema claro passa de 3,65:1 para 5,38:1; as bordas dos campos e dos botões passam de 1,71:1 para pelo menos 3,33:1; o texto secundário deixa de usar opacidade.
- Área de toque de 44px em botões e campos abaixo de 480px; sem transições nem animações com `prefers-reduced-motion`.

## [0.1.0-rc.1] — 2026-11-19 (versão candidata, por validar)

Primeira versão candidata do MVP **incompleto**. Ficam de fora os incrementos 2 (contas e ativação), 7 (pedidos de responsável) e 8 (área de administração), e partes dos incrementos 1, 3 e 4. Ver [docs/implementation-plan.md](docs/implementation-plan.md) e as [notas da versão](docs/releases/v0.1.0-rc.1.md).

### Acrescentado

- **Execução com Docker Compose** (`compose.yaml`): os serviços `postgres`, `migrate`, `backend` e `frontend`, em duas redes, com healthchecks e o volume `matriz_pgdata`.
- **Dockerfiles multi-stage** com `.dockerignore`:
  - backend: imagem `node:26.13.0-alpine` com o utilizador `node`, só `dist/` e as dependências de produção; uma fase `tools` para as migrations e o seed;
  - frontend: build com Node.js e serviço com nginx sem privilégios, que encaminha `/api` para o backend.
- **Integração contínua** em GitHub Actions (`.github/workflows/ci.yml`):
  - lint, build e testes unitários e de API do backend;
  - tipos, build e testes unitários do frontend;
  - testes E2E com Playwright;
  - build das imagens e teste de arranque com o Docker Compose.
- **Autenticação** (US01, US15):
  - `POST /auth/login` com JWT de 1 hora, `POST /auth/logout` e `GET /me`;
  - ecrã de entrada, sessão no `sessionStorage` e aviso de sessão expirada.
- **Autorização**: JWT obrigatório em todas as rotas exceto as públicas, e acesso às tarefas e aos comentários verificado através do projeto.
- **Projetos** (US03, US05, US10, US18):
  - criar (só pela API), listar, ver, editar e arquivar;
  - painel inicial com os projetos e as contagens de tarefas;
  - painel "Membros" só de leitura.
- **Tarefas** (US06–US08, US19, US22, US23):
  - criar, listar, ver, editar e eliminar;
  - mudar o estado e definir a prioridade;
  - filtros por estado e prioridade;
  - vários responsáveis por tarefa;
  - indicador de progresso por projeto (US09).
- **Comentários** (US13) no detalhe da tarefa (US19).
- **Erros da API** em Problem Details, com códigos estáveis.
- **Infraestrutura**:
  - `GET /health` com verificação da base de dados;
  - página "não encontrada";
  - seed de demonstração idempotente;
  - esquema Prisma e migrations.

### Alterado

- `docker-compose.yml` passa a chamar-se `compose.yaml`. No desenvolvimento local, o PostgreSQL arranca sozinho com `docker compose up -d postgres`.
- O `.env.example` da raiz tem as variáveis da execução em containers: `FRONTEND_PORT`, `JWT_SECRET` (vazio, só com a instrução para o gerar), `JWT_EXPIRES_IN_SECONDS` e `SEED_DEMO_PASSWORD`.
- Imagens base fixadas em versões exatas: `nginxinc/nginx-unprivileged:1.30.6-alpine` e `postgres:18.6-alpine`, também nos serviços dos jobs da CI. O `backend/.dockerignore` deixa de fora `test-results` e `playwright-report`.
- No job `frontend` da CI, a verificação de tipos e o build passam a ser passos separados.
- O `package.json` e o `package-lock.json` do backend (antes `0.0.1`) e do frontend (antes `0.0.0`) passam à versão `0.1.0-rc.1`. O `openapi.yaml` mantém a versão do contrato, `0.5.0`: tem numeração própria e muda quando o contrato muda.
- Documentação: o README passa a ter as funcionalidades implementadas e os pré-requisitos; diagrama da execução em containers revisto em `docs/architecture.md` §6; resultados das verificações de 2026-11-19 em `docs/verification.md` §8.6.

### Segurança

- A API recusa arrancar com o `JWT_SECRET` de exemplo ou com menos de 32 caracteres.
- As imagens Docker não têm credenciais e correm sem privilégios. O workflow da CI só tem permissão de leitura e não usa segredos do repositório.

### Corrigido

- Sem `JWT_SECRET`, a mensagem de erro da API indica onde o definir nos dois modos (`backend/.env` em desenvolvimento, `.env` da raiz com o Docker Compose) e como o gerar.
- O carácter nulo nos campos de texto passa a dar `400` em vez de `500`.
- Rotas desconhecidas, corpos demasiado grandes e erros inesperados passam a responder em Problem Details.
- Escritas concorrentes já não conseguem pôr tarefas num projeto arquivado.
- Um responsável repetido, mesmo com o identificador noutras maiúsculas ou minúsculas, passa a dar `409`.
- O frontend deixou de mostrar respostas antigas de outro projeto, tarefa ou filtro.

<!-- As tags v0.1.0-rc.1 (merge do PR #29, 8824e68) e v0.1.0-rc.2 só são criadas depois da validação final: até lá, os links abaixo não abrem. -->

[Por lançar]: https://github.com/ClaudiaLamas/ai-powered-software-engeneering/compare/v0.1.0-rc.2...HEAD
[0.1.0-rc.2]: https://github.com/ClaudiaLamas/ai-powered-software-engeneering/compare/v0.1.0-rc.1...v0.1.0-rc.2
[0.1.0-rc.1]: https://github.com/ClaudiaLamas/ai-powered-software-engeneering/releases/tag/v0.1.0-rc.1
