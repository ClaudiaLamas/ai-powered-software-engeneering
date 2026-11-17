# Restrições — Matriz

Este ficheiro reúne as restrições de âmbito, as permissões, os requisitos não funcionais, as decisões técnicas e as questões em aberto. O cliente não indicou nenhuma restrição; **tudo o que está aqui são pressupostos ou decisões internas (DE, D)**.

## 1. Restrições de âmbito

Decisões nossas, por validar com o cliente.

- **O MVP inclui só as funcionalidades Must: FN01–FN09, FN12–FN14 e FN27–FN29.** A lista completa está em [requirements.md](requirements.md#4-funcionalidades).
- **Ficam fora do MVP:** prazos (FN10), "as minhas tarefas" (FN11), pesquisa por texto e filtro por responsável (FN30), notificações (FN15), anexos (FN16), subtarefas e dependências (FN17), histórico de alterações das tarefas (FN18), relatórios (FN19), estados configuráveis (FN20), calendário e cronograma (FN21), pesquisa de projetos e eliminação de projetos (os projetos arquivam-se; decisão interna, 2026-11-15).
- **Excluídos nesta fase:** utilizadores externos (FN22, R4), registo de tempo (FN23), práticas ágeis como sprints e backlog (FN24), integrações e migração de dados (FN25), várias línguas (FN26).
- **As contas não têm papel próprio:** em cada projeto, uma conta é Gestor ou Membro; Administrador é uma permissão da conta, acumulável com essas funções (DE01, DE02).
- **Cada projeto tem exatamente um Gestor** (DE06).
- **Não existe uma entidade "equipa" separada:** a equipa de um projeto são os seus membros (R6).
- **Uma tarefa pertence sempre a um projeto** e tem título, descrição, zero ou mais responsáveis e estado (R6, R7, DE09, DE16).
- **Os estados são três, fixos e iguais para todos os projetos:** Por fazer, Em curso e Concluída (R8).

## 2. Permissões

Resumo das decisões DE01–DE16 e das regras PN01–PN21. **Nenhuma foi validada pelo cliente.** As colunas Gestor e Membro referem-se à função da conta *naquele* projeto. Uma conta com permissão de Administrador que também participa num projeto tem, nesse projeto, as permissões da sua função.

| Ação | Administrador | Gestor do projeto | Membro do projeto | Origem |
|---|---|---|---|---|
| Criar e desativar contas | Sim | Não | Não | US02, DE03 |
| Reenviar o convite de uma conta pendente | Sim | Não | Não | US02, DE15 |
| Dar e retirar a permissão de Administrador | Sim | Não | Não | US11, DE05 |
| Criar projetos e atribuir o Gestor | Sim | Não | Não | US03, DE06 |
| Trocar o Gestor (incluindo adicionar o novo Gestor à equipa) | Sim | Não | Não | US12, DE08 |
| Ver nome, estado, Gestor e membros de qualquer projeto (área de administração) | Sim | — | — | PN02 |
| Consultar o registo de ações administrativas | Sim | Não | Não | US14, DE12 |
| Editar e arquivar o projeto | Não | Sim | Não | US10, DE07 |
| Adicionar e remover membros | Não (exceto ao trocar o Gestor) | Sim | Não | US04, DE07, DE08 |
| Ver o projeto, as tarefas, os comentários, os pedidos de responsável pendentes de uma tarefa e o progresso | Não | Sim | Sim | R10, PN02, PN21 |
| Criar tarefas, editar título e descrição, atribuir e remover responsáveis, eliminar tarefas | Não | Sim | Não | US06, DE09, DE16 |
| Dar e mudar a prioridade de uma tarefa | Não | Sim | Não | US22, DE09, PN19 |
| Filtrar e paginar as tarefas de um projeto | Não | Sim | Sim | US23, PN20 |
| Mudar o estado de uma tarefa | Não | Sim | Sim | US07, DE10 |
| Comentar tarefas | Não | Sim | Sim | US13, DE10, DE11 |
| Editar e apagar os próprios comentários | Não | Sim | Sim | US13, PN15 |
| Pedir que outro membro seja adicionado como responsável | Não | Só se for responsável da tarefa | Só se for responsável da tarefa | US31, DE13, PN21 |
| Cancelar o próprio pedido de responsável | Não | Sim (quem o fez) | Sim (quem o fez) | US31, PN21 |
| Ver os pedidos de responsável pendentes do projeto; aceitar ou recusar pedidos | Não | Sim | Não | US31, DE13, PN21 |

**Regras que se aplicam a todas as ações:**

- Um projeto arquivado fica só de leitura para todos (PN09).
- Uma conta desativada não consegue entrar e não pode ser reativada (US01, US02, PN17).
- Uma conta pendente não consegue entrar até definir a palavra-passe pelo link de ativação. Pode ser adicionada a projetos e nomeada Gestor, mas não pode ser atribuída como responsável (US02, DE15).
- A conta de sistema não pode ser desativada nem perder a permissão de Administrador (PN16).
- Uma tarefa pode ter vários responsáveis ou nenhum, sem repetir a mesma pessoa (DE16). Cada responsável tem de ser membro do projeto com conta ativa quando é atribuído, também ao aceitar um pedido (PN06, PN21). Uma tarefa "Concluída" pode manter entre os responsáveis quem já não é membro (PN07, DE14).
- Uma conta desativada não pode ser adicionada a um projeto nem atribuída como responsável (PN08, DE14).

## 3. Requisitos não funcionais

O cliente não indicou requisitos não funcionais. Os três abaixo derivam de pressupostos já existentes e são, por isso, **pressupostos**.

| ID | Requisito | Origem | Tipo |
|---|---|---|---|
| RNF01 | A aplicação suporta até cerca de 10 equipas e 100 pessoas no arranque. | R3 | Pressuposto |
| RNF02 | Só os membros de um projeto acedem ao seu conteúdo; a permissão de Administrador não dá esse acesso; contas desativadas não entram. | R10, DE02, PN02, US01 | Decisão interna |
| RNF03 | A interface e os conteúdos são em português, numa só língua. | P14, FN26 | Pressuposto |

### Áreas sem informação

Estas áreas **não têm requisitos definidos**. Não se assumiu nada sobre elas; dependem de respostas do cliente.

| Área | Pergunta ao cliente |
|---|---|
| Disponibilidade (horário de trabalho ou contínua) | Ainda não formulada; identificada na análise inicial como informação em falta. |
| Locais e dispositivos de acesso; acesso sem internet | 27 |
| Dados pessoais e obrigações legais (por exemplo, RGPD) | 23, 26 |
| Retenção de dados e saída de colaboradores | 25 |
| Acessibilidade | 31 |
| Fusos horários | 28 |

## 4. Decisões técnicas

Todas as decisões técnicas estão tomadas. São **decisões internas, por validar**: algumas dependem de perguntas ao cliente ainda sem resposta (coluna "Depende de") e têm de ser revistas se a resposta as contrariar.

| ID | Decisão | Depende de |
|---|---|---|
| D01 | Canais de acesso. **Decidida (decisão interna, por validar, 2026-11-08):** aplicação web, acedida pelo navegador e responsiva. | Pergunta 27 |
| D02 | Linguagens de programação. **Decidida (decisão interna, por validar, 2026-11-08):** TypeScript, no backend e no frontend. | D01, D07 |
| D03 | Frameworks. **Decidida (decisão interna, por validar, 2026-11-08):** NestJS no backend e Vue.js no frontend. | D01, D02 |
| D04 | Forma de armazenamento dos dados. **Decidida (decisão interna, por validar, 2026-11-08):** base de dados relacional PostgreSQL. | RNF01, perguntas 23 e 25 |
| D05 | Alojamento. **Decidida (decisão interna, por validar, 2026-11-08):** execução local, com o PostgreSQL num container Docker (`docker-compose.yml`). O deploy fica como extensão futura. | Perguntas 23 e 26 |
| D06 | Forma de autenticação das contas (FN01). **Decidida (decisão interna, por validar, 2026-11-08):** JWT, enviado no cabeçalho `Authorization: Bearer ...`; palavras-passe guardadas como hash bcrypt, com a biblioteca `bcryptjs` (decisão interna, 2026-11-08). No NestJS: `@nestjs/jwt` e Passport. O JWT é válido durante 1 hora (configurável em `JWT_EXPIRES_IN_SECONDS`, 2026-11-09) e não é revogado: sair da aplicação apaga-o só no frontend (decisão interna, 2026-11-08). Em cada pedido autenticado, o backend lê a conta na base de dados e recusa com `401 UNAUTHENTICATED` um token de uma conta desativada, mesmo que o token ainda não tenha expirado (decisão interna, 2026-11-09). | Pergunta 29 e regras internas da empresa |
| D07 | Arquitetura da aplicação. **Decidida (decisão interna, por validar):** monólito modular; ver [architecture.md](architecture.md). | D01, RNF01 |
| D08 | Forma de verificar os critérios de aceitação (testes). **Decidida (decisão interna, por validar, 2026-11-08):** Vitest no backend e no frontend; Supertest nos testes de API do backend. O NestJS 12 já vem configurado com Vitest (alterada em 2026-11-08: antes previa Jest no backend). Testes E2E de browser com Playwright (`@playwright/test`, só Chromium) no frontend, sobre uma base de dados própria terminada em `_test` (acrescentado em 2026-11-15). | D02, D03 |
| D09 | Envio de email (link de ativação, DE15). **Decidida (decisão interna, por validar, 2026-11-08):** na execução local, um container Mailpit no `docker-compose.yml` recebe os emails e mostra-os numa página local; nenhum email sai para fora. O envio real fica com o deploy (extensão futura). | D05, DE15 |

Pontos complementares, decididos na mesma data (decisões internas, por validar):

| Ponto | Decisão |
|---|---|
| Versões | Versão LTS atual do Node.js e versões estáveis mais recentes do NestJS, do Vue.js e do PostgreSQL, confirmadas nos sites oficiais no momento da instalação. |
| ORM | Prisma, que gera as migrations e o seed de forma reproduzível. A alternativa considerada foi o TypeORM. |
| Identificadores | UUID. Não substituem a autorização: mesmo com UUID, o backend verifica sempre se a conta tem acesso ao recurso (RNF02). |

## 5. Questões em aberto

| Questão | Onde aparece |
|---|---|
| O Administrador pode nomear-se a si próprio Gestor de um projeto onde não participa? | CL10, PN14 |
| Como volta a ter acesso uma pessoa cuja conta foi desativada, se a conta não pode ser reativada e o email é único? | CL11, PN11, PN17 |
| Um projeto arquivado pode voltar a ficar ativo? (A eliminação de projetos fica fora do MVP: os projetos arquivam-se; decisão interna, 2026-11-15, requirements.md §5.) | US10, PN09 |
| Como se recupera o acesso quando a pessoa se esquece da palavra-passe? Pode usar o mesmo mecanismo de token da ativação (DE15). | D06, DE15, US01 |
| Uma conta pendente pode receber a permissão de Administrador? | US11, DE15 |
| Quais são os limites de comprimento do nome e do email de uma conta? | US02, PN11 |
| Todas as respostas R1–R10, decisões DE01–DE16 e regras PN01–PN21 têm de ser validadas com o cliente. | [requirements.md](requirements.md#22-respostas-assumidas-r1r10), [requirements.md](requirements.md#23-decisões-internas-de01de16), [user-stories.md](user-stories.md#4-regras-de-negócio-pn01pn21) |
| Perguntas ao cliente sem resposta: 2, 4, 5, 19, 23, 26, 27, 31. | [requirements.md](requirements.md#6-perguntas-ao-cliente-ainda-por-responder) |
