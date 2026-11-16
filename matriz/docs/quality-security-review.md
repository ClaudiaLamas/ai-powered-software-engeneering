# Revisão de qualidade e segurança — Matriz

## 1. Code Review

Revisão do diff do ramo `aula04-testes` face ao `main` (`git diff main...HEAD`), centrada em bugs, validações, tratamento de erros e testes frágeis ou em falta. Não foram encontrados bugs na aplicação; os findings são de testes e da configuração E2E. CR1 veio da revisão humana; CR2–CR7, da revisão com IA (2026-11-15).

| # | Origem | Ficheiro:linha | Finding | Severidade | Estado | Correção ou decisão |
|---|---|---|---|---|---|---|
| CR1 | Humana | `backend/src/tasks/task-rules.spec.ts:10-12` | Os testes importavam `TITLE_MIN`, `TITLE_MAX` e `DESCRIPTION_MAX` do código de produção (`task-rules.ts`): se o limite mudasse no código sem mudar o PN12, os testes acompanhavam a mudança e continuavam a passar. | Média | Corrigido (`e25da94`) | Limites definidos no próprio teste a partir do PN12 (3, 150, 2000). |
| CR2 | IA | `backend/src/tasks/task-rules.spec.ts:37`, `:57-58` | Os casos com `'a'` e `'é'` precomposto não distinguiam pontos de código de unidades UTF-16; com `text.length`, todos os testes passavam (H1 do `test-plan.md`). | Média | Corrigido | Casos com emoji fora do BMP: aceita 150, recusa 2 e 151. Com `text.length` no lugar do `charLength`, os casos de 150 e de 2 falham. |
| CR3 | IA | `frontend/playwright.config.ts:26` | O reset E2E valida o nome da base (`_test`), mas não o servidor: se o `backend/.env` apontar para um PostgreSQL partilhado ou remoto, cria e esvazia a `<nome>_e2e_test` nesse servidor. Hipótese; hoje aponta para o Docker local. | Baixa | Pendente | Proposta: recusar no config qualquer host que não seja `localhost`, `127.0.0.1` ou `::1`. |
| CR4 | IA | `backend/test/tasks.e2e-spec.ts:1551`, `:1591` | T08 só verificava a resposta da API; T24 não confirmava que a edição recusada com `403` deixava o título como estava. | Baixa | Corrigido | T08 lê o título gravado na base; T24 confirma que o título continua `'Original'`. |
| CR5 | IA | `frontend/e2e/create-task.spec.ts:5` | Email, nome e UUID do projeto copiados à mão do `seed.ts`: se o seed mudar, o teste falha com um erro de seletor ou URL em vez da causa real. | Baixa | Pendente | Proposta: comentar a ligação ao `seed.ts` ou deixar de verificar o UUID na URL. |
| CR6 | IA | `frontend/playwright.config.ts:47` | O comprimento mínimo de `E2E_PASSWORD` (12) só é validado pelo seed, dentro do `webServer`, depois das migrations e do reset; o config exige a variável mesmo em comandos sem testes (hipótese). | Baixa | Pendente | Proposta: validar o comprimento no config, com mensagem clara. |
| CR7 | IA | `frontend/playwright.config.ts:69` | O backend E2E (`nest start`) compila para o mesmo `backend/dist` do `start:dev`; com os dois a correr, podem colidir. Hipótese; não observado. | Baixa | Pendente | Só se o problema aparecer: pasta de compilação própria ou nota no README. |

Verificações: `npm run lint` sem erros; `npm test` (backend) com 117 testes a passar e `npm run test:e2e` (backend) com 252, depois das correções de CR2 e CR4; `npm run test:e2e` (frontend) a passar antes da revisão.

## 2. Security Review

Revisão com IA (2026-11-16) das regras de autorização (`authorization.service.ts`, controladores de projetos, tarefas e comentários, `jwt.strategy.ts`) e de secrets. Não foram encontrados IDOR nem dados sensíveis nas respostas: os controladores usam a conta do token e chamam `requireMember`, `requireTask` ou `requireComment` antes de qualquer acesso; quem não é membro recebe `404`; nenhum DTO inclui o `passwordHash`; nenhum `.env` esteve alguma vez em commit.

| # | Ficheiro:linha | Finding | Severidade | Estado | Correção ou decisão |
|---|---|---|---|---|---|
| S1 | `backend/src/accounts/jwt-config.ts:13` | O `jwtSecret()` só recusava um segredo vazio. O `JWT_SECRET` local era o valor público do `.env.example`, e um token forjado com ele para outra conta foi aceite por `GET /me` (facto, testado localmente). Como os ids das contas aparecem nas respostas a qualquer membro, um Membro podia fazer-se passar pelo Gestor. | Alta | Corrigido no código; falta rodar o segredo local | A API não arranca com o valor de exemplo nem com menos de 32 caracteres. Rodar o `JWT_SECRET` do `backend/.env` é ação da pessoa que tem o ambiente. |
| S2 | `backend/src/accounts/auth.controller.ts:18` | O login não tem limite de tentativas; a documentação é omissa. Impacto (hipótese, não medido): força bruta e consumo de CPU (bcrypt de custo 12). | Baixa | Pendente | Decisão: limite só no `POST /auth/login` (por exemplo, `@nestjs/throttler`, que é uma dependência nova). |
| S3 | `backend/src/tasks/task.requests.ts:72` | `assigneeIds` não tem limite de elementos: uma consulta por elemento dentro da transação com `FOR SHARE`. Impacto (hipótese): um Gestor atrasa as escritas no projeto. | Baixa | Pendente | Decisão: `maxItems` no `openapi.yaml` e `@ArrayMaxSize` no pedido. |

Verificações: leitura do código; `git log --all`, `git ls-files` e `git grep` à procura de secrets; token forjado em `GET /me` (só leitura); `npm audit` no backend sem vulnerabilidades. Por validar: acesso à porta 3000 a partir de outra máquina (o backend escuta em todas as interfaces), efeito real de S2 e S3, XSS e CSP no frontend.

## 3. Teste manual de autorização (duas contas)

(por preencher)

## 4. Análise estática

(por preencher)

## 5. Correções e testes de regressão

| Finding | Correção | Teste de regressão | Resultado |
|---|---|---|---|
| S1 | `jwtSecret()` recusa o valor de exemplo do `.env.example` e segredos com menos de 32 caracteres; a API não arranca e a mensagem indica `openssl rand -hex 32`. | `backend/src/accounts/jwt-config.spec.ts`: recusa o valor de exemplo, recusa 31 caracteres, aceita `randomBytes(32)` em hexadecimal. | Os 2 testes de recusa falhavam antes da correção e passam depois; `npm test` com 121 testes e `npm run test:e2e` com 252 a passar (com um `JWT_SECRET` aleatório no ambiente). |

## 6. Verificações não executadas e problemas pendentes

| # | Item | Estado | Decisão |
|---|---|---|---|
| 1 | Os guardas do nome `_test` dos testes E2E de browser não foram provocados com uma base de dados com outro nome: a verificação em `frontend/playwright.config.ts`, que aborta antes do `TRUNCATE`, e a de `frontend/e2e/reset-database.sql`, que recusa com `RAISE EXCEPTION`. | Não verificado | Risco aceite: a verificação existe em dois sítios independentes. Provocá-los exigiria correr o SQL contra uma base sem `_test`, por exemplo a de desenvolvimento. |
| 2 | 5 avisos de gravidade moderada do `npm audit` no frontend (`@vue/test-utils`, `js-beautify`, `glob`, `minimatch`, `editorconfig`), em dependências de desenvolvimento que já existiam antes do Playwright. | Pendente | Fora do âmbito: não vêm do Playwright e corrigi-los muda dependências, o que pede aprovação. |
| 3 | Título em falta para um não-membro: a especificação contradiz-se. `required: [title]` faz dele um erro de formato (`400 VALIDATION_ERROR`, antes do `404`), mas o OpenAPI diz que dá `TITLE_INVALID`, um código de regra que vem depois do `404` ([test-plan.md](test-plan.md), H3). | Questão em aberto | O caso não é testado; só se testam os casos sem ambiguidade. Fica à espera da correção do contrato (`openapi.yaml`). |
| 4 | Os caracteres do título (PN12) contam-se em pontos de código: um carácter acentuado precomposto conta 1 e um emoji fora do BMP conta 1 ([test-plan.md](test-plan.md), H1). | Pressuposto, a validar com o cliente | Mantém-se a contagem em pontos de código até o cliente a validar. |
