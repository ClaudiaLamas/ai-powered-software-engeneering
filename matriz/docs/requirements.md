# Requisitos — Matriz

Este ficheiro reúne a análise de requisitos e a proposta de âmbito. Só F1–F5 são factos; P, R, DE e as decisões sobre funcionalidades são pressupostos ou decisões internas, ainda por validar com o cliente.

## 1. Factos confirmados

### 1.1 Declaração do cliente

> "Precisamos de uma aplicação onde as nossas equipas possam organizar projetos, gerir tarefas e acompanhar o progresso do trabalho."

| ID | Facto | Citação de suporte |
|---|---|---|
| F1 | O cliente precisa de uma aplicação. | "Precisamos de uma aplicação" |
| F2 | Os utilizadores incluem as equipas da própria empresa. | "onde as nossas equipas possam…" |
| F3 | A aplicação deve permitir organizar projetos. | "organizar projetos" |
| F4 | A aplicação deve permitir gerir tarefas. | "gerir tarefas" |
| F5 | A aplicação deve permitir acompanhar o progresso do trabalho. | "acompanhar o progresso do trabalho" |

### 1.2 Contexto do enunciado (não dito pelo cliente)

- A aplicação chama-se Matriz.
- Destina-se à gestão de projetos e tarefas de equipas de trabalho.
- Ainda não estão definidas funcionalidades, regras de negócio, requisitos técnicos nem prioridades.
- A comparação com Jira, Azure DevOps ou Trello vem do enunciado. Não sabemos se o cliente usa ou quer imitar alguma destas ferramentas.

## 2. Pressupostos

### 2.1 Pressupostos implícitos (P1–P14)

Todos **não confirmados**. Foram identificados na análise inicial como riscos de interpretação.

| ID | Pressuposto | Porque é arriscado |
|---|---|---|
| P1 | Só as equipas internas usam a aplicação; não há clientes externos, fornecedores ou parceiros. | "As nossas equipas" não exclui outros utilizadores. |
| P2 | Existem várias equipas e cada uma tem os seus projetos. | Não se sabe se as equipas partilham projetos. |
| P3 | Uma tarefa pertence sempre a um projeto. | Podem existir tarefas avulsas ou pessoais. |
| P4 | As tarefas têm responsável, prazo, prioridade e estado. | Nenhum atributo foi mencionado. |
| P5 | "Progresso" significa a percentagem de tarefas concluídas. | Pode significar horas, prazos, marcos ou outra métrica. |
| P6 | O fluxo de estados é "Por fazer → Em curso → Concluído". | O fluxo pode ser mais complexo ou variar por equipa. |
| P7 | Há perfis diferentes (por exemplo, administrador, gestor e membro) com permissões distintas. | Não foi referida qualquer hierarquia. |
| P8 | A gestão é ágil (sprints, quadros, backlog). | A referência ao Jira e ao Trello é do enunciado, não do cliente. |
| P9 | É preciso colaboração (comentários, anexos, menções, notificações). | Não foi mencionada. |
| P10 | É preciso relatórios ou painéis. | "Acompanhar" pode ser só uma consulta de estado. |
| P11 | Há registo de tempo ou de esforço. | Não foi mencionado. |
| P12 | A aplicação substitui uma ferramenta ou um processo existente. | Não se sabe como trabalham hoje. |
| P13 | O número de utilizadores e projetos é pequeno ou médio. | Não há dados de escala. |
| P14 | A interface e os conteúdos são em português. | A empresa pode operar noutras línguas. |

### 2.2 Respostas assumidas (R1–R10)

Respostas às 10 perguntas de clarificação prioritárias. Como não foi possível contactar o cliente, **todas são pressupostos**, não requisitos do cliente. O número entre parênteses é o da pergunta original (secção 6).

| ID | Pergunta | Resposta (pressuposto) | Justificação |
|---|---|---|---|
| R1 | Que problema concreto querem resolver? (1) | As equipas não sabem facilmente que trabalho existe, quem o faz e em que ponto está. | É o problema que F3, F4 e F5 resolvem em conjunto. |
| R2 | Que capacidades são indispensáveis? (3) | Criar projetos, criar e atribuir tarefas, mudar o estado das tarefas e ver o progresso de cada projeto. | É o mínimo que cumpre literalmente F3, F4 e F5. |
| R3 | Quantas equipas e pessoas? (6) | Até cerca de 10 equipas e 100 pessoas no arranque. | Valor prudente; não muda o âmbito funcional, só as expectativas de volume. |
| R4 | Há utilizadores externos? (7) | Não. No MVP só há pessoas da empresa. | O cliente fala de "as nossas equipas" (F2). |
| R5 | Que papéis existem? (8) | ~~Três papéis: Administrador, Gestor de projeto e Membro.~~ **Substituída por DE01 e DE02.** Uma pessoa pode participar em vários projetos. | É a separação mínima entre gerir contas, gerir projetos e executar tarefas. |
| R6 | O que é um "projeto"? (11) | Um conjunto de tarefas com nome, descrição, membros e estado (ativo ou arquivado), sem fases nem marcos. A equipa de um projeto são os seus membros, sem entidade "equipa" separada. | É a definição mais simples que permite organizar projetos (F3). |
| R7 | Que informação tem uma tarefa? (12) | Título, descrição, responsável e estado. Prazo e prioridade ficam para depois do MVP. | Com estes campos já se sabe o quê, quem e em que ponto (F4, F5). |
| R8 | Que estados tem uma tarefa? (15) | Três estados fixos e iguais para todos os projetos: Por fazer, Em curso e Concluída. | São o mínimo para medir progresso. |
| R9 | O que significa "acompanhar o progresso"? (18) | Ver, por projeto, quantas tarefas há em cada estado e a percentagem de tarefas concluídas. | É a interpretação mais direta de F5. |
| R10 | Quem pode ver cada projeto? (22) | Só os membros desse projeto (incluindo o Gestor). A permissão de Administrador não dá acesso ao conteúdo de projetos onde a conta não participa (ver DE02). | É mais seguro começar fechado e abrir depois. |

### 2.3 Decisões internas (DE01–DE13)

Decisões tomadas pela equipa do projeto em 2026-10-29, depois da revisão do Specification Pack. **Não foram validadas pelo cliente**: são decisões nossas, não factos, e prevalecem sobre os pressupostos R e PN que contradizem.

| ID | Decisão | Substitui |
|---|---|---|
| DE01 | Uma conta não tem papel próprio. A função (Gestor ou Membro) é atribuída por projeto: a mesma conta pode ser Gestor no projeto A e Membro no projeto B. | R5 (papéis), PN01, PN03 |
| DE02 | Administrador é uma permissão da conta, que pode acumular com funções em projetos. Não dá acesso ao conteúdo de projetos onde a conta não participa. | R10, PN02 |
| DE03 | Só o Administrador cria e desativa contas. Uma conta desativada não pode ser reativada. | PN01 |
| DE04 | A primeira conta de Administrador (conta de sistema) é criada pela equipa do projeto, fora das funcionalidades da aplicação. Não pode ser desativada nem perder a permissão de Administrador. | — |
| DE05 | O Administrador pode dar a permissão de Administrador a outra conta e retirá-la. Não é possível retirar a permissão nem desativar o último Administrador ativo. | — |
| DE06 | O Administrador cria os projetos e atribui-lhes o Gestor. Cada projeto tem exatamente um Gestor. | PN01, PN03 |
| DE07 | O Gestor edita e arquiva o projeto e adiciona e remove membros (forma a equipa do projeto). | — |
| DE08 | O Administrador pode trocar o Gestor de um projeto. O novo Gestor tem de ser já membro do projeto. Se não houver nenhum membro adequado (por exemplo, quando o Gestor está a sair), o Administrador pode adicionar um novo membro à equipa para depois o nomear Gestor. | PN14 |
| DE09 | Uma tarefa tem um só responsável. Só o Gestor cria tarefas, edita o título e a descrição, escolhe o responsável e elimina tarefas. | PN05 |
| DE10 | O Membro só pode mudar o estado das tarefas e comentá-las. | PN05 |
| DE11 | Os comentários em tarefas entram no MVP. Os comentários podem ser editados e apagados. Num projeto arquivado, os comentários ficam só de leitura. | FN14 (Could → Must) |
| DE12 | As ações administrativas ficam registadas no MVP. | — |
| DE13 | No futuro, o responsável de uma tarefa poderá pedir ajuda a outro membro da equipa, adicionando-o à tarefa. Fica fora do MVP. | — |

As regras de negócio detalhadas (PN01–PN18) estão em [user-stories.md](user-stories.md#4-regras-de-negócio-pn01pn18). O vocabulário (conta, função, permissão) está no [glossário do README](../README.md#glossário).

## 3. Funções e permissões

Todas as funções e permissões são **decisões internas ou pressupostos** (R4, DE01–DE12, PN01–PN18). As permissões detalhadas estão em [constraints.md](constraints.md#2-permissões).

| Quem | O que precisa | Origem |
|---|---|---|
| Administrador (permissão da conta) | Criar e desativar contas, dar e retirar a permissão de Administrador, criar projetos, atribuir e trocar o Gestor, consultar o registo de ações administrativas. | R4, DE02–DE06, DE08, DE12 |
| Gestor (função num projeto) | Editar e arquivar o projeto, escolher os membros, criar tarefas e atribuir responsáveis, mudar o estado, comentar e ver o progresso. | F3, F4, F5, DE07, DE09 |
| Membro (função num projeto) | Ver os projetos onde participa, mudar o estado das tarefas, comentar e ver o progresso. | F2, F4, F5, DE10, DE11 |

## 4. Funcionalidades

Origem: F = facto do cliente; P, R = pressuposto; DE = decisão interna. A prioridade MoSCoW e a inclusão no MVP são decisões nossas.

**Regra:** só as funcionalidades **Must** entram no MVP.

| ID | Funcionalidade | Justificação | Origem | MoSCoW | MVP |
|---|---|---|---|---|---|
| FN01 | Acesso identificado: cada pessoa entra com a sua conta | Sem identificar cada pessoa não é possível atribuir tarefas (FN06) nem restringir projetos aos membros. | F4, R10 | Must | Sim |
| FN02 | Administrador cria e desativa contas e dá ou retira a permissão de Administrador | Sem contas não há membros para organizar projetos ou gerir tarefas; sem gestão da permissão, a administração depende de uma só conta. | P7, R4, DE03–DE05 | Must | Sim |
| FN03 | Administrador cria projetos e atribui o Gestor; Gestor edita e arquiva o projeto (nome, descrição) | É a base de "organizar projetos". | F3, R6, DE06, DE07 | Must | Sim |
| FN04 | Gestor adiciona e remove membros de um projeto | Define quem trabalha em cada projeto e quem o pode ver. | F2, F3, R6, R10, DE07 | Must | Sim |
| FN05 | Ver a lista dos projetos a que pertenço, com o progresso de cada um (FN09). É o ecrã inicial (dashboard). | Permite encontrar e organizar o trabalho por projeto. | F3, F5 | Must | Sim |
| FN06 | Gestor cria, edita e elimina tarefas num projeto (título, descrição, responsável) | É a base de "gerir tarefas". | F4, R7, DE09 | Must | Sim |
| FN07 | Mudar o estado de uma tarefa (Por fazer, Em curso, Concluída) | Gerir uma tarefa inclui avançá-la; o estado é a base do progresso. | F4, F5, R8 | Must | Sim |
| FN08 | Ver as tarefas de um projeto agrupadas por estado | Mostra de imediato em que ponto está o trabalho. | F5, R9 | Must | Sim |
| FN09 | Indicador de progresso por projeto (nº de tarefas por estado e % concluídas) | É a forma mínima de "acompanhar o progresso". | F5, R9 | Must | Sim |
| FN10 | Prazo numa tarefa | Ajuda a perceber atrasos, mas o progresso já é medido sem ele. | F4, P4 | Should | Não |
| FN11 | Vista "as minhas tarefas" em todos os projetos | Facilita o dia a dia de quem está em vários projetos (R5). | F4, R5 | Should | Não |
| FN12 | Prioridade numa tarefa | Ajuda a ordenar o trabalho; não é necessária para organizar ou acompanhar. | F4, P4 | Should | Não |
| FN13 | Filtrar e pesquisar tarefas | Torna-se útil quando os projetos crescem (R3). | F4, R3 | Should | Não |
| FN14 | Comentários em tarefas | Reduz a comunicação fora da aplicação; é a única forma de o Membro acrescentar informação a uma tarefa (DE10). | P9, DE11 | Must | Sim |
| FN15 | Notificações | Depende de FN14 e FN10 para ter valor total. | P9 | Could | Não |
| FN16 | Anexos em tarefas | Útil para trabalho documental, mas não foi pedido. | P9 | Could | Não |
| FN17 | Subtarefas e dependências entre tarefas | Útil para trabalho complexo, mas aumenta muito o âmbito. | Pergunta 14 | Could | Não |
| FN18 | Histórico de alterações de cada tarefa | Dá rastreabilidade das tarefas, que não foi pedida. As ações administrativas já ficam registadas (FN28). | Pergunta 24 | Could | Não |
| FN19 | Relatórios e exportação | O progresso já é visível em FN09. | P10 | Could | Não |
| FN20 | Estados configuráveis por equipa ou projeto | Contraria a simplicidade de R8. | P6 | Could | Não |
| FN21 | Vistas de calendário ou cronograma | Só fazem sentido depois de existirem prazos (FN10). | P4 | Could | Não |
| FN22 | Acesso de utilizadores externos | Excluído por R4. | P1 | Won't (nesta fase) | Não |
| FN23 | Registo de tempo ou esforço | Não foi pedido e muda a natureza da aplicação. | P11 | Won't (nesta fase) | Não |
| FN24 | Sprints, backlog e outras práticas ágeis | A comparação com o Jira não é do cliente. | P8 | Won't (nesta fase) | Não |
| FN25 | Integração com outras ferramentas e migração de dados | Não sabemos que ferramentas usam hoje. | P12 | Won't (nesta fase) | Não |
| FN26 | Interface em várias línguas | Não há indicação de equipas noutras línguas. | P14 | Won't (nesta fase) | Não |
| FN27 | Administrador troca o Gestor de um projeto | Com um só Gestor por projeto, é a única forma de um projeto não ficar sem gestão quando o Gestor sai (CL8). | DE06, DE08 | Must | Sim |
| FN28 | Registo das ações administrativas | O Administrador acumula poderes sobre contas, permissões e projetos; o registo permite saber quem fez o quê e quando. | Pergunta 24, DE12 | Must | Sim |
| FN29 | Pedir ajuda: o responsável adiciona outro membro da equipa a uma tarefa | Permite colaborar numa tarefa sem mudar o responsável (que continua a ser só um). | DE13 | Should | Não |

## 5. Âmbito do MVP

**MVP = FN01–FN09, FN14, FN27 e FN28** (as 12 funcionalidades Must).

As pessoas da empresa entram com a sua conta e trabalham nos projetos onde participam (FN01, FN05). O Administrador cria as contas e os projetos, atribui o Gestor de cada projeto e pode trocá-lo; as suas ações ficam registadas (FN02, FN03, FN27, FN28). Em cada projeto, o Gestor forma a equipa e cria tarefas com título, descrição e um responsável; os membros avançam-nas por três estados fixos e comentam-nas (FN03, FN04, FN06, FN07, FN14). O progresso é acompanhado por projeto, com as tarefas agrupadas por estado e a percentagem de tarefas concluídas (FN08, FN09).

### Fora do MVP

| Grupo | Funcionalidades | Motivo |
|---|---|---|
| Primeiro incremento (Should) | FN10–FN13, FN29 | Tornam o uso diário mais eficiente, mas o MVP já cumpre F3–F5 sem elas. |
| Incrementos seguintes (Could) | FN15–FN21 | Respondem a pressupostos (P4, P6, P9, P10) ou a perguntas sem resposta (14, 24); nenhuma deriva diretamente do cliente. |
| Excluídas nesta fase (Won't) | FN22–FN26 | Dependem de respostas que não temos (perguntas 2, 7, 20, 28, 29). |

## 6. Perguntas ao cliente ainda por responder

As perguntas abaixo continuam abertas. Algumas foram cobertas provisoriamente por um pressuposto; essas respostas também têm de ser confirmadas.

| Nº | Pergunta | Estado |
|---|---|---|
| 1, 3, 6, 7, 8, 11, 12, 15, 18, 22 | Perguntas prioritárias | Respondidas por pressuposto (R1–R10) |
| 2 | Como organizam hoje projetos e tarefas? O que funciona e o que não funciona? | Sem resposta |
| 4 | Como vão saber, daqui a seis meses, se a aplicação teve sucesso? | Sem resposta |
| 5 | Existe alguma data ou acontecimento que defina quando a aplicação tem de estar disponível? | Sem resposta |
| 9 | Uma pessoa pode pertencer a mais do que uma equipa ou a projetos de várias equipas? | Coberta por pressuposto (R5) |
| 10 | Quem pode criar projetos e equipas e quem decide quem participa? | Coberta por decisão interna (DE06, DE07) |
| 13 | Uma tarefa pode existir fora de um projeto? | Coberta por pressuposto (R6) |
| 14 | Precisam de subtarefas ou dependências? | Fora do MVP (FN17) |
| 16 | Quem pode mudar uma tarefa de estado, de responsável ou de prazo? | Coberta por decisão interna (DE09, DE10) |
| 17 | As equipas precisam de comunicar dentro da aplicação? | Comentários no MVP por decisão interna (FN14, DE11); notificações e anexos fora do MVP (FN15, FN16) |
| 19 | Quem acompanha o progresso e com que frequência? | Sem resposta |
| 20 | Precisam de registar tempo ou esforço? | Fora do MVP (FN23) |
| 21 | Precisam de relatórios para partilhar ou guardar? | Fora do MVP (FN19) |
| 23 | A aplicação vai conter dados pessoais ou informação sensível? | Sem resposta |
| 24 | Precisam de saber quem alterou o quê e quando? | Em parte: ações administrativas no MVP (FN28, DE12); histórico das tarefas fora do MVP (FN18) |
| 25 | Durante quanto tempo devem ser guardados os dados? O que acontece aos dados de quem sai? | Coberta em parte por pressuposto (PN08) |
| 26 | Há regras internas ou legais que a aplicação tenha de cumprir? | Sem resposta |
| 27 | Em que situações os utilizadores vão aceder? Precisam de acesso sem internet? | Sem resposta (ver D01) |
| 28 | Em que línguas deve funcionar? Há fusos horários diferentes? | Coberta em parte: línguas por pressuposto (RNF03); fusos horários sem resposta |
| 29 | A aplicação tem de trocar informação com outras ferramentas? | Fora do MVP (FN25) |
| 30 | Existem dados atuais a transferir? | Fora do MVP (FN25) |
| 31 | Há colaboradores com necessidades de acessibilidade? | Sem resposta |
