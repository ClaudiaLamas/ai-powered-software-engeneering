# Plano de testes — Tarefas e permissões

Este ficheiro define os cenários de teste das tarefas e das permissões do MVP, o estado de cobertura nos testes existentes e os testes novos a implementar. A matriz deriva só da especificação; o código só foi consultado para verificar a cobertura.

## 1. Âmbito e fontes

**Âmbito:** criar, consultar, editar e eliminar tarefas; mudar o estado; atribuir e remover responsáveis; regras do título; acesso de Gestor, Membro, não-membro e Administrador que não é membro; projeto arquivado. Ficam de fora os comentários (US13), os pedidos de responsável (US31) e a gestão de contas e de membros, exceto quando servem de pré-condição.

**Fontes:**

| Fonte | O que foi usado |
|---|---|
| [user-stories.md](user-stories.md) | US06 (criar, editar, eliminar e atribuir), US07 (mudar o estado), US08 (ver as tarefas por estado), US19 (detalhe da tarefa); casos-limite CL2, CL3 e CL6 |
| [user-stories.md §4](user-stories.md#4-regras-de-negócio-pn01pn21) | PN02 (Administrador sem acesso ao conteúdo), PN05 (só o Gestor gere tarefas), PN09 (projeto arquivado só de leitura), PN10 (tarefa nova em "Por fazer"), PN12 (título com 3–150 caracteres, não só espaços), PN19 (prioridade "Média" por omissão) |
| [constraints.md](constraints.md) | RNF02 (só membros acedem ao conteúdo); D08 (Vitest e Supertest) |
| [architecture.md](architecture.md) | §4.1 (o frontend esconde ações, mas a garantia é o backend); §4.2 (ordem das verificações) |
| [openapi.yaml](../openapi.yaml) | `createProjectTask`, `getTask`, `updateTask`, `deleteTask`, `changeTaskStatus`, `addTaskAssignee`, `removeTaskAssignee`, `listProjectTasks`; esquemas `TaskTitle`, `CreateTaskRequest`, `UpdateTaskRequest`; resposta `TaskValidationError`; ordem das verificações (`401` → `403 NOT_ADMIN` → `400 VALIDATION_ERROR` → `404` → `403` → `409` → `400` das regras) |

## 2. Nomenclatura

- Os ficheiros `backend/test/*.e2e-spec.ts` são **testes de integração da API** (Vitest + Supertest, contra a base de dados `matriz_test`). Apesar do nome, não abrem o navegador. Neste plano têm o nível **Integração**.
- **E2E** neste plano significa um teste de browser com **Playwright**, sobre o frontend e o backend a correr (ver a decisão H4 na secção 5).
- **Unit** são os testes Vitest de uma regra ou de um serviço isolado (`backend/src/**/*.spec.ts`). Os testes Vitest de componentes e vistas do frontend (`frontend/src/**/__tests__/*.spec.ts`) são indicados como **Componente**.
- `authorization.e2e-spec.ts` usa rotas de exemplo (`/exemplo/...`, de `test/authorization-example.module.ts`): prova o `AuthorizationService`, mas não os endpoints reais das tarefas.

## 3. Matriz de cenários

Estado: ✅ coberto; 🟡 coberto em parte; ❌ não coberto. Os nomes dos testes vêm de `backend/test/tasks.e2e-spec.ts` (`tasks.e2e`), `backend/test/authorization.e2e-spec.ts` (`authorization.e2e`), `backend/src/tasks/task-rules.spec.ts` (`task-rules.spec`) e dos testes de componentes do frontend. A coluna "Resultado da execução" preenche-se depois de correr os testes (secção 6).

| ID | Cenário | Pré-condições | Entrada | Resultado esperado | Nível | Origem | Cobertura | Teste associado | Resultado da execução |
|---|---|---|---|---|---|---|---|---|---|
| T01 | Gestor cria tarefa válida | Gestor, projeto ativo | `POST /projects/{id}/tasks` `{title:"  Publicar página  "}` | `201` com `Location`; título sem os espaços das pontas, `TODO`, `MEDIUM`, `assignees: []` | Integração | US06, PN10, PN12, PN19 | ✅ | `tasks.e2e` › "cria a tarefa em "Por fazer", "Média" e "Sem responsável", com o título aparado" | |
| T02 | Gestor consulta a tarefa que criou | T01 | `GET /tasks/{id}` com o token do Gestor | `200`, corpo igual ao do `201` | Integração | US19, US06 | ✅ | `tasks.e2e` › lacunas › "T02: o Gestor cria a tarefa e consulta-a com o seu token; a base de dados tem os mesmos valores" | |
| T03 | Título em falta | Gestor, projeto ativo | `{}` | `400 TITLE_INVALID` | Unit + Integração | PN12, OpenAPI | ✅ | `tasks.e2e` › "recusa um título em falta com 400 TITLE_INVALID"; `task-rules.spec` › "recusa um título em falta com TITLE_INVALID" | |
| T04 | Título vazio | idem | `{title:""}` | `400 TITLE_INVALID` | Unit + Integração | US06 (erro), PN12 | ✅ | `task-rules.spec` › "recusa um título vazio com TITLE_INVALID"; `tasks.e2e` › lacunas › "T04: recusa um título vazio com 400 TITLE_INVALID e não cria nada" | |
| T05 | Título só com espaços (criar e editar) | idem; tarefa existe para editar | `{title:"     "}` | `400 TITLE_INVALID` | Unit + Integração | PN12 | ✅ | `tasks.e2e` › "recusa um título só com espaços com 400 TITLE_INVALID" (criar); updateTask › "recusa um título só com espaços com TITLE_INVALID"; `task-rules.spec` › "recusa um título só com espaços com TITLE_INVALID" | |
| T06 | Título curto depois de tirar os espaços | idem | `{title:"  ab  "}` | `400 TITLE_INVALID` | Unit + Integração | PN12 | ✅ | `tasks.e2e` › "recusa um título curto demais depois de aparado com 400 TITLE_INVALID"; `task-rules.spec` › "recusa um título curto demais depois de aparado com TITLE_INVALID" | |
| T07 | Título acima do limite (criar e editar) | idem | 151 caracteres | `400 TITLE_INVALID` | Unit + Integração | PN12 | ✅ | Criar: `tasks.e2e` › "recusa um título longo demais com 400 TITLE_INVALID"; `task-rules.spec` › "recusa um título longo demais com TITLE_INVALID". Editar: `tasks.e2e` › lacunas › "T07: ao editar, recusa um título com 151 caracteres e mantém o título guardado" | |
| T08 | Títulos nos limites são aceites | idem | 3 caracteres; 150; 150 com espaços nas pontas | `201` | Unit + Integração | PN12 | ✅ | `task-rules.spec` › "aceita um título com o comprimento no mínimo / no máximo / no máximo, com espaços nas pontas / no máximo, com acentos"; `tasks.e2e` › lacunas › "T08: aceita um título com 3 caracteres / 150 caracteres / 150 caracteres com espaços nas pontas" | |
| T09 | Título com tipo errado | idem | `{title:123}`; `PATCH {title:null}` | `400 VALIDATION_ERROR` | Integração | OpenAPI (tipo errado) | ✅ | `tasks.e2e` › "recusa um título que não é texto com 400 VALIDATION_ERROR"; updateTask › "recusa um título null com 400 VALIDATION_ERROR" | |
| T10 | Título vazio na interface | Gestor no ecrã do projeto | submeter sem título | mensagem de título obrigatório; nenhum pedido enviado | E2E | US06 (erro) | 🟡 | Só Componente: `TaskForm.spec` › "com o título vazio, mostra o erro e não envia (US06)"; `ProjectView.spec` › "com o título vazio, não chama a API" | |
| T11 | Membro cria tarefa | Membro (não Gestor), projeto ativo | `POST …/tasks` | `403 NOT_PROJECT_MANAGER`; nada criado | Integração | US06, PN05 | ✅ | `tasks.e2e` › "recusa o Membro com 403 NOT_PROJECT_MANAGER, mesmo com dados inválidos pelas regras" | |
| T12 | Membro edita tarefa | idem | `PATCH /tasks/{id}` | `403 NOT_PROJECT_MANAGER`; tarefa inalterada | Integração | US06, PN05 | ✅ | `tasks.e2e` › updateTask › "recusa o Membro com 403 e não muda a tarefa" | |
| T13 | Membro elimina tarefa | idem | `DELETE /tasks/{id}` | `403 NOT_PROJECT_MANAGER`; a tarefa continua a existir | Integração | US06, CL2 | ✅ | `tasks.e2e` › deleteTask › "recusa o Membro (CL2), responde 404 a quem não é membro e 409 num projeto arquivado" | |
| T14 | Membro atribui ou remove responsáveis | idem | `POST`/`DELETE /tasks/{id}/assignees…` | `403 NOT_PROJECT_MANAGER` | Integração | US06, PN05 | ✅ | `tasks.e2e` › "recusa o Membro com 403 NOT_PROJECT_MANAGER, mesmo a atribuir-se a si próprio"; "recusa o Membro com 403 e não remove ninguém" | |
| T15 | Membro muda o estado (permitido) | idem | `PUT /tasks/{id}/status` | `200` | Integração | US07, PN05 | ✅ | `tasks.e2e` › "o Membro muda o estado e a tarefa mantém o resto; as contagens mudam" | |
| T16 | Não-membro consulta tarefa de outro projeto | Gestor do projeto B, sem ser membro de A | `GET /tasks/{idA}` | `404 TASK_NOT_FOUND` | Integração | US19, RNF02 | ✅ | `tasks.e2e` › outro utilizador › "não consulta, não edita, não elimina nem muda os responsáveis da tarefa pelo ID: 404 TASK_NOT_FOUND" | |
| T17 | Não-membro edita, elimina ou atribui | idem | `PATCH`/`DELETE`/`assignees` | `404 TASK_NOT_FOUND`; nada muda | Integração | RNF02, PN02 | ✅ | O mesmo teste de T16 (verifica também a base de dados) | |
| T18 | Não-membro cria tarefa no projeto | idem | `POST /projects/{A}/tasks` | `404 PROJECT_NOT_FOUND`; nada criado | Integração | RNF02 | ✅ | `tasks.e2e` › outro utilizador › "não cria uma tarefa no projeto: 404 PROJECT_NOT_FOUND e nada é criado" | |
| T19 | Não-membro muda o estado | idem | `PUT /tasks/{idA}/status` | `404 TASK_NOT_FOUND` | Integração | US07, RNF02 | ✅ | `tasks.e2e` › changeTaskStatus › "responde 404 a quem não é membro, 409 num projeto arquivado e 401 sem sessão" | |
| T20 | Não-membro lista as tarefas | não-membro sem permissão de Administrador | `GET /projects/{A}/tasks` | `404 PROJECT_NOT_FOUND` | Integração | US08 (erro), RNF02 | ✅ | `tasks.e2e` › listProjectTasks › "responde 404 a um Administrador que não é membro (PN02, CL6)"; `tasks.e2e` › lacunas › "T20: um não-membro sem a permissão de Administrador não lista as tarefas: 404 PROJECT_NOT_FOUND" | |
| T21 | Administrador que não é membro | conta Administrador, não membro | `GET`/`PATCH` de uma tarefa | `404` (não `403`) | Integração | PN02, CL6 | ✅ | `tasks.e2e` › getTask › "qualquer membro vê a tarefa; quem não é membro recebe 404"; updateTask › "responde 404 a quem não é membro e 409 num projeto arquivado" | |
| T22 | Tarefa de outro projeto e tarefa inexistente são indistinguíveis | — | `GET` de um id de outro projeto e de um UUID aleatório | ambos `404 TASK_NOT_FOUND` | Integração | OpenAPI (DE02) | ✅ | `tasks.e2e` › getTask › "qualquer membro vê a tarefa; quem não é membro recebe 404" (repete com `task.id` e `randomUUID()`) | |
| T23 | Ordem: `400` de formato antes do `404`; `404` antes do `400` das regras | não-membro | campo desconhecido → `400 VALIDATION_ERROR`; título só com espaços → `404` | ver entrada | Integração | OpenAPI (ordem) | ✅ | `tasks.e2e` › lacunas › "T23: para um não-membro, o 400 de formato vem antes do 404 e o 404 antes do 400 das regras"; rota de exemplo: `authorization.e2e` › "corpo mal formado de quem não é membro: 400 antes de 404 (ordem do contrato)" | |
| T24 | Membro em projeto arquivado | Membro, projeto arquivado | `POST …/tasks` | `403 NOT_PROJECT_MANAGER` (antes do `409`) | Integração | OpenAPI (ordem), PN09 | ✅ | `tasks.e2e` › lacunas › "T24: o Membro num projeto arquivado recebe 403 antes de 409, ao criar e ao editar"; rota de exemplo: `authorization.e2e` › "Membro num projeto arquivado: 403 antes de 409" | |
| T25 | Gestor em projeto arquivado | Gestor, projeto arquivado | criar, editar, eliminar | `409 PROJECT_ARCHIVED` | Integração | PN09, CL3 | ✅ | `tasks.e2e` › createProjectTask › "responde 409 PROJECT_ARCHIVED num projeto arquivado (PN09)"; os testes de editar e eliminar; bloco "projeto arquivado a meio do pedido (PN09)" | |
| T26 | Sem sessão | — | qualquer operação de tarefas | `401 UNAUTHENTICATED` | Integração | FN01 | ✅ | `tasks.e2e` › "responde 401 sem sessão e 400 a um projectId inválido", entre outros | |
| T27 | `taskId` que não é UUID | membro | `GET /tasks/nao-e-uuid` | `400 VALIDATION_ERROR` | Integração | OpenAPI | ✅ | `tasks.e2e` › getTask › "qualquer membro vê a tarefa; quem não é membro recebe 404" | |
| T28 | A interface esconde as ações a um Membro | Membro no projeto e no detalhe da tarefa | abrir os ecrãs | sem formulário de criar, sem editar nem eliminar a tarefa | E2E | architecture.md §4.1 | ❌ | Componente, em parte: `ProjectView.spec` › "o Membro não vê o formulário de criação"; `TaskDetailView.spec` › "o Membro vê os responsáveis, mas não os pode mudar nem pede a lista de quem pode ser". Nenhum verifica a falta de "Editar" e "Eliminar" da tarefa | |

Resumo: 26 ✅, 1 🟡 (T10), 1 ❌ (T28). T02, T04, T07, T08, T20, T23 e T24 ficaram cobertos com N06–N09 e N13 (2026-11-15).

## 4. Testes novos a implementar

### 4.1 Unit (`backend/src/tasks/task-rules.spec.ts`)

| ID | Teste | Resultado esperado | Cenário | Resultado da execução |
|---|---|---|---|---|
| N01 | Título só com tab (`"\t\t\t"`) | `TITLE_INVALID` | T05, H2 | |
| N02 | Título só com quebras de linha (`"\n\n\n"`) | `TITLE_INVALID` | T05, H2 | |
| N03 | Título só com NBSP (`"   "`) | `TITLE_INVALID` | T05, H2 | |
| N04 | 150 caracteres com acentos aceite | sem erro | T08, H1 | |
| N05 | 151 caracteres com acentos recusado | `TITLE_INVALID` | T07, H1 | |

N04 já existe ("aceita um título com o comprimento no máximo, com acentos", com `'é'.repeat(150)`): basta confirmá-lo e acrescentar N05.

### 4.2 Integração (`backend/test/tasks.e2e-spec.ts`)

Implementados a 2026-11-15, no bloco "lacunas de docs/test-plan.md (T02, T04, T07, T08, T20, T23, T24)", com os testes de T08 (limites aceites na API).

| ID | Teste | Resultado esperado | Cenário | Resultado da execução |
|---|---|---|---|---|
| N06 | O Gestor cria uma tarefa e consulta-a com o seu token | `201`, depois `GET` `200` com o mesmo corpo (título, descrição, estado, prioridade, responsáveis); a linha na base de dados tem os mesmos valores | T02 | |
| N07 | Criar com `{title:""}` | `400 TITLE_INVALID`; nada criado | T04 | |
| N08 | Editar com um título de 151 caracteres | `400 TITLE_INVALID`; título guardado inalterado | T07 | |
| N09 | Não-membro sem permissão de Administrador lista as tarefas | `404 PROJECT_NOT_FOUND` | T20 | |

### 4.3 E2E (Playwright)

Depende da decisão H4 (secção 5) e da instalação do Playwright, que precisa de aprovação.

| ID | Teste | Resultado esperado | Cenário | Resultado da execução |
|---|---|---|---|---|
| N10 | Gestor entra → abre o projeto → cria uma tarefa → vê-a na listagem | a tarefa aparece no grupo "Por fazer" com o título escrito | T01, T02 | |
| N11 (opcional) | Gestor submete o formulário sem título | mensagem de título obrigatório; nenhum `POST` enviado | T10 | |

### 4.4 Segurança (Ex. 5)

| ID | Verificação | Como | Cenário | Resultado da execução |
|---|---|---|---|---|
| N12 | Não-membro consulta, altera e cria tarefas de outro projeto | Manual, com duas contas: um Gestor do projeto A e uma conta que não é membro de A, ambas ativas. Pedidos diretos à API com o token de cada uma; respostas `404` e nada muda | T16–T18 | |
| N13 | Ordem das verificações nos endpoints reais (implementado a 2026-11-15) | Integração: T23 e T24 em `POST /projects/{id}/tasks` e `PATCH /tasks/{id}`, em vez das rotas de exemplo | T23, T24 | |

## 5. Decisões humanas e correções às sugestões da IA

| ID | Decisão | Tipo |
|---|---|---|
| H1 | Os caracteres do título (PN12) contam-se em **pontos de código**. Um carácter acentuado precomposto conta 1; um emoji fora do BMP conta 1. | Pressuposto, a validar com o cliente |
| H2 | "Só espaços" significa **qualquer espaço em branco Unicode** (espaço, tab, quebra de linha, NBSP e afins), alinhado com o `pattern: '\S'` de `TaskTitle` no OpenAPI. | Decisão interna |
| H3 | **Título em falta para um não-membro:** a especificação contradiz-se. `required: [title]` faz dele um erro de formato (`400 VALIDATION_ERROR`, antes do `404`), mas o OpenAPI diz que dá `TITLE_INVALID`, um código de regra que vem depois do `404`. Este caso não é testado; só se testam os casos sem ambiguidade. | Questão em aberto |
| H4 | **Adoção do Playwright** como ferramenta de testes E2E de browser. É uma nova decisão técnica que complementa a D08 (Vitest e Supertest). | Decisão técnica nova |
| H5 | Verifiquei manualmente que os testes citados existem: [preencho eu] | Verificação humana |

## 6. Resultado da execução

Preencher depois de correr os testes. Os comandos estão no [AGENTS.md](../AGENTS.md#testes).

| Data | Comando | Resultado (passaram / falharam / ignorados) | Notas |
|---|---|---|---|
| | `cd backend && npm test` | | |
| | `cd backend && npm run test:e2e` | | |
| | `cd frontend && npm run test:unit -- --run` | | |
| | E2E (Playwright) | | |
| | Verificação manual N12 | | |
