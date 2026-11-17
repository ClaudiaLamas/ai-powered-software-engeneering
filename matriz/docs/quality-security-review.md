# Revisão de qualidade e segurança — Matriz

## 1. Code Review

Revisão do diff do ramo `aula04-testes` face ao `main` (`git diff main...HEAD`), centrada em bugs, validações, tratamento de erros e testes frágeis ou em falta. Não foram encontrados bugs na aplicação; os findings são de testes e da configuração E2E. CR1 veio da revisão humana; CR2–CR7 da 1.ª revisão com IA (2026-11-15); CR8–CR12 da 2.ª revisão com IA (2026-11-17), feita depois da correção do S1. As decisões (aceitar, adiar, rejeitar) são minhas; discuti os findings com um segundo assistente de IA antes de decidir.

| # | Origem | Ficheiro:linha | Finding | Severidade | Estado | Correção ou decisão |
|---|---|---|---|---|---|---|
| CR1 | Humana | `backend/src/tasks/task-rules.spec.ts:10-12` | Os testes importavam `TITLE_MIN`, `TITLE_MAX` e `DESCRIPTION_MAX` do código de produção (`task-rules.ts`): se o limite mudasse no código sem mudar o PN12, os testes acompanhavam a mudança e continuavam a passar. | Média | Corrigido (`e25da94`) | Limites definidos no próprio teste a partir do PN12 (3, 150, 2000). |
| CR2 | IA | `backend/src/tasks/task-rules.spec.ts:37`, `:57-58` | Os casos com `'a'` e `'é'` precomposto não distinguiam pontos de código de unidades UTF-16; com `text.length`, todos os testes passavam (H1 do `test-plan.md`). | Média | Corrigido | Casos com emoji fora do BMP: aceita 150, recusa 2 e 151. Com `text.length` no lugar do `charLength`, os casos de 150 e de 2 falham. |
| CR3 | IA | `frontend/playwright.config.ts:27` | O reset E2E valida o nome da base (`_test`), mas não o servidor: se o `backend/.env` apontar para um PostgreSQL partilhado ou remoto, cria e esvazia a `<nome>_e2e_test` nesse servidor. Hipótese; hoje aponta para o Docker local. | Baixa | Adiado | Hoje o `.env` aponta para o Docker local; o risco só existe com uma configuração que não usamos. Proposta para o futuro: recusar hosts que não sejam `localhost`, `127.0.0.1` ou `::1`. |
| CR4 | IA | `backend/test/tasks.e2e-spec.ts:1563`, `:1603` | T08 só verificava a resposta da API; T24 não confirmava que a edição recusada com `403` deixava o título como estava. | Baixa | Corrigido | T08 lê o título gravado na base; T24 confirma que o título continua `'Original'`. |
| CR5 | IA | `frontend/e2e/create-task.spec.ts:5` | Email, nome e UUID do projeto copiados à mão do `seed.ts`: se o seed mudar, o teste falha com um erro de seletor ou URL. (Repetido na 2.ª revisão.) | Baixa | Rejeitado | Os ids do seed (`5eed…`) são fixos de propósito: o seed é o contrato de dados do E2E. Se o seed mudar, o teste deve falhar. |
| CR6 | IA | `frontend/playwright.config.ts:48` | O comprimento mínimo de `E2E_PASSWORD` (12) só é validado pelo seed, dentro do `webServer`, depois das migrations e do reset. | Baixa | Adiado | Afeta só o momento e a clareza da mensagem de erro, não o resultado nem a segurança. |
| CR7 | IA | `frontend/playwright.config.ts:70`, `backend/nest-cli.json` | O backend E2E (`nest start`) compila para o mesmo `backend/dist` do `start:dev` (`deleteOutDir: true`); com os dois a correr, podem colidir. Hipótese; não observado. (Repetido na 2.ª revisão.) | Baixa | Adiado | Efeito hipotético e raro num projeto individual. Proposta: `outDir` próprio ou `tsx src/main.ts`. |
| CR8 | IA | `backend/vitest.config.e2e.ts:17`, `frontend/playwright.config.ts:84` | A correção do S1 impedia os testes de API e o backend do E2E de arrancar com o `.env` de exemplo: o `loadEnvFile()` carregava o `JWT_SECRET` de exemplo, que o S1 passou a recusar (os 113 testes de `tasks.e2e-spec.ts` por correr). Facto nos testes de API, confirmado a correr; no backend do E2E, por leitura do código. | Média | Aceite, corrigido | Regressão introduzida pela correção do S1. Sem a correção, quem clona o repositório não reproduz os testes (critério de conclusão). Os testes passam a gerar o seu próprio segredo aleatório. |
| CR9 | IA | `frontend/playwright.config.ts:70-74` | O reset da base E2E (migrate, TRUNCATE, seed) corre antes de a porta 3100 ser ocupada; uma 2.ª execução em paralelo esvazia a base a meio da 1.ª. Hipótese. | Baixa–Média | Adiado | Não reproduzido; execuções em paralelo improváveis num projeto individual. Proposta: verificar as portas num `globalSetup` ou usar `pg_advisory_lock`. |
| CR10 | IA | `frontend/e2e/reset-database.sql:14` | O reset só limpa o schema `public` e não avisa se não encontrar tabelas. | Baixa | Rejeitado | O projeto usa só o schema `public` (confirmado no `DATABASE_URL` do `backend/.env.example` e do `backend/.env`: `schema=public`). |
| CR11 | IA | `frontend/playwright.config.ts:31` | O `catch` do `e2eDatabaseUrl()` mostra sempre "Falta o backend/.env" e esconde a causa real de outros erros. | Baixa | Adiado | Afeta só a mensagem de diagnóstico, não o resultado. |
| CR12 | IA | `backend/test/tasks.e2e-spec.ts:1518`, `:1534`, `:1549` | (a) A contagem por pontos de código (H1) só tinha teste unitário (CR2); (b) o T04 e o T07 não verificavam o campo do erro. | Baixa | Aceite, corrigido | (a) T08 grava 150 emojis pela API e confirma o valor na base; (b) T04 e T07 verificam `errors` com o campo `title`. Custo mínimo. |

Verificações (2026-11-17): `npm run lint` (backend) sem erros nem avisos (código de saída 0). Depois das correções de CR8 e CR12: `npm test` (backend) com 121 testes a passar; `npm run test:e2e` (backend) com 253 a passar; `npm run test:e2e` (frontend) com 1 passed em duas execuções seguidas. O cenário do CR8 (`JWT_SECRET` com o valor de exemplo) foi simulado com `JWT_SECRET=muda-este-segredo` na shell, porque o `backend/.env` já tem um segredo real: a variável da shell tem prioridade sobre o `.env`. Os testes de API passaram também com o `backend/.env` tal como está.

## 2. Security Review

Revisão com IA (2026-11-16) das regras de autorização (`authorization.service.ts`, controladores de projetos, tarefas e comentários, `jwt.strategy.ts`) e de secrets. Não foram encontrados IDOR nem dados sensíveis nas respostas: os controladores usam a conta do token e chamam `requireMember`, `requireTask` ou `requireComment` antes de qualquer acesso; quem não é membro recebe `404`; nenhum DTO inclui o `passwordHash`; nenhum `.env` esteve alguma vez em commit.

| # | Ficheiro:linha | Finding | Severidade | Estado | Correção ou decisão |
|---|---|---|---|---|---|
| S1 | `backend/src/accounts/jwt-config.ts:13` | O `jwtSecret()` só recusava um segredo vazio. O `JWT_SECRET` local era o valor público do `.env.example`, e um token forjado com ele para outra conta foi aceite por `GET /me` (facto, testado localmente). Como os ids das contas aparecem nas respostas a qualquer membro, um Membro podia fazer-se passar pelo Gestor. | Alta | Corrigido; segredo local rodado (2026-11-17) | A API não arranca com o valor de exemplo nem com menos de 32 caracteres. Verificado manualmente: com o valor de exemplo, o `start:dev` termina com a mensagem esperada. O segredo local foi substituído por `openssl rand -hex 32` (o `backend/.env` está no `.gitignore`). |
| S2 | `backend/src/accounts/auth.controller.ts:18` | O login não tem limite de tentativas; a documentação é omissa. Impacto (hipótese, não medido): força bruta e consumo de CPU (bcrypt de custo 12). | Baixa | Adiado | Hipótese não medida; exige uma dependência nova (`@nestjs/throttler`), uma decisão de arquitetura fora do âmbito da ficha. |
| S3 | `backend/src/tasks/task.requests.ts:72` | `assigneeIds` não tem limite de elementos: uma consulta por elemento dentro da transação com `FOR SHARE`. Impacto (hipótese): um Gestor atrasa as escritas no projeto. | Baixa | Adiado | Hipótese não medida; só um Gestor autenticado o pode explorar. Exige uma alteração ao contrato (`maxItems` no `openapi.yaml`) e `@ArrayMaxSize` no pedido. |

Verificações: leitura do código; `git log --all`, `git ls-files` e `git grep` à procura de secrets; token forjado em `GET /me` (só leitura); `npm audit` no backend sem vulnerabilidades. Por validar: acesso à porta 3000 a partir de outra máquina (o backend escuta em todas as interfaces), efeito real de S2 e S3, XSS e CSP no frontend.

## 3. Teste manual de autorização (duas contas)

Teste com as contas do seed e o script `idor-check.sh` (fora do repositório); output em [`evidence/idor-manual.txt`](evidence/idor-manual.txt).

| Conta | Papel | Recurso testado | Pedidos | Resultado esperado | Resultado obtido |
|---|---|---|---|---|---|
| Bruno | Não é membro da "Campanha de primavera" | projeto, tarefas (listar, criar, consultar, editar, mudar o estado, eliminar) e comentários da Campanha | 9 | `404` | 9 × `404` (`PROJECT_NOT_FOUND`, `TASK_NOT_FOUND`, `COMMENT_NOT_FOUND`) |
| Ana | Não é membro da "Renovação do escritório" | tarefa (consultar, editar, eliminar) e comentários da Renovação | 5 | `404` | 5 × `404` (`TASK_NOT_FOUND`, `COMMENT_NOT_FOUND`) |
| Admin | Administrador, não é membro da Campanha | tarefa da Campanha (consultar, editar) | 2 | `404` | 2 × `404 TASK_NOT_FOUND` |
| Bruno | Membro, não Gestor, do "Portal" | tarefa do Portal (editar, eliminar) | 2 | `403` | 2 × `403 NOT_PROJECT_MANAGER` |
| Ana e Bruno | Controlo: os donos dos recursos | a tarefa da Campanha (Ana) e a da Renovação (Bruno) | 2 | `200` | 2 × `200` |

**Resultado:** 20 pedidos, 20 com o resultado esperado (nenhum `FALHA` no output). Nenhum dos 18 pedidos de contas sem acesso foi aceite. As duas tarefas que essas contas tentaram editar e eliminar (`…0203` e `…0204`) continuam a existir no controlo, com o título e o estado: "Aprovar o orçamento" (`IN_PROGRESS`) e "Pedir três orçamentos de obras" (`IN_PROGRESS`).

## 4. Análise estática

| Ferramenta | Comando | Resultado |
|---|---|---|
| oxlint (configurado no projeto) | `cd backend && npm run lint` | 0 erros, 0 avisos (código de saída 0) |
| npm audit (backend) | `cd backend && npm audit` | Sem vulnerabilidades |
| npm audit (frontend) | `cd frontend && npm audit` | 5 avisos moderados em dependências de desenvolvimento já existentes (ver pendente 2) |

Não há Semgrep nem SonarQube configurados. Nenhum aviso da análise estática foi tratado como vulnerabilidade confirmada: as vulnerabilidades confirmadas são só as reproduzidas (S1).

## 5. Correções e testes de regressão

| Finding | Correção | Teste de regressão | Resultado |
|---|---|---|---|
| S1 | `jwtSecret()` recusa o valor de exemplo do `.env.example` e segredos com menos de 32 caracteres; a API não arranca e a mensagem indica `openssl rand -hex 32`. | `backend/src/accounts/jwt-config.spec.ts`: recusa o valor de exemplo, recusa 31 caracteres, aceita `randomBytes(32)` em hexadecimal. | Os 2 testes de recusa falhavam antes da correção e passam depois. Depois da correção do CR8, `npm test` com 121 testes e `npm run test:e2e` com 253 a passar, com o valor de exemplo simulado na shell (`JWT_SECRET=muda-este-segredo`) e sem outras variáveis. |
| CR1 | Limites do título e da descrição definidos no teste a partir do PN12, em vez de importados da produção. | Mutação temporária: `TITLE_MAX = 200` e `DESCRIPTION_MAX = 3000` em `task-rules.ts`. | Com a mutação, os testes de limite falharam; revertido, passaram todos. |
| CR8 | Os testes de API e o backend do E2E geram o seu próprio `JWT_SECRET` aleatório. | As próprias suites, com o valor de exemplo simulado na shell (`JWT_SECRET=muda-este-segredo`). | Antes: os 113 testes de `tasks.e2e-spec.ts` por correr; o backend do E2E não arrancaria (por leitura do código). Depois: 253 testes de API a passar e 1 passed no E2E, em duas execuções. |
| CR12 | T08 com 150 emojis gravados na base; T04 e T07 verificam o campo `title` do erro. | Os próprios testes. | Passam (incluídos nos 253 testes de API). |

## 6. Verificações não executadas e problemas pendentes

| # | Item | Estado | Decisão |
|---|---|---|---|
| 1 | Os guardas do nome `_test` dos testes E2E de browser não foram provocados com uma base de dados com outro nome: a verificação em `frontend/playwright.config.ts`, que aborta antes do `TRUNCATE`, e a de `frontend/e2e/reset-database.sql`, que recusa com `RAISE EXCEPTION`. | Não verificado | Risco aceite: a verificação existe em dois sítios independentes. Provocá-los exigiria correr o SQL contra uma base sem `_test`, por exemplo a de desenvolvimento. |
| 2 | 5 avisos de gravidade moderada do `npm audit` no frontend (`@vue/test-utils`, `js-beautify`, `glob`, `minimatch`, `editorconfig`), em dependências de desenvolvimento que já existiam antes do Playwright. | Pendente | Fora do âmbito: não vêm do Playwright e corrigi-los muda dependências, o que pede aprovação. |
| 3 | Título em falta para um não-membro: a especificação contradiz-se. `required: [title]` faz dele um erro de formato (`400 VALIDATION_ERROR`, antes do `404`), mas o OpenAPI diz que dá `TITLE_INVALID`, um código de regra que vem depois do `404` ([test-plan.md](test-plan.md), H3). | Questão em aberto | O caso não é testado; só se testam os casos sem ambiguidade. Fica à espera da correção do contrato (`openapi.yaml`). |
| 4 | Os caracteres do título (PN12) contam-se em pontos de código: um carácter acentuado precomposto conta 1 e um emoji fora do BMP conta 1 ([test-plan.md](test-plan.md), H1). | Pressuposto, a validar com o cliente | Mantém-se a contagem em pontos de código até o cliente a validar. |
| 5 | Findings adiados do code review e do security review: CR3, CR6, CR7, CR9, CR11, S2, S3. | Adiado | Ver o motivo de cada um nas secções 1 e 2. |
| 6 | Segurança não verificada: acesso à porta 3000 a partir de outra máquina (o backend escuta em todas as interfaces), XSS e CSP no frontend. | Não verificado | Fora do âmbito desta ficha (foco na autorização sobre recursos). |

## 7. Referência

- Branch: `aula04-testes` · Commit final: `37e1c95` · PR: [#27](https://github.com/ClaudiaLamas/ai-powered-software-engeneering/pull/27)
- Testes não executados: os guardas `_test` com uma base de outro nome (pendente 1); o comportamento de S2 e S3 sob carga.
