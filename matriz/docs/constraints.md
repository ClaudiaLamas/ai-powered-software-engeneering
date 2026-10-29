# Restrições — Matriz

Este ficheiro reúne as restrições de âmbito, as permissões, os requisitos não funcionais, as decisões técnicas pendentes e as questões em aberto. O cliente não indicou nenhuma restrição; **tudo o que está aqui são pressupostos, decisões internas (DE) ou decisões pendentes**.

## 1. Restrições de âmbito

Decisões nossas, por validar com o cliente.

- **O MVP inclui só as funcionalidades Must: FN01–FN09, FN14, FN27 e FN28.** A lista completa está em [requirements.md](requirements.md#4-funcionalidades).
- **Ficam fora do MVP:** prazos (FN10), "as minhas tarefas" (FN11), prioridades (FN12), pesquisa e filtros (FN13), notificações (FN15), anexos (FN16), subtarefas e dependências (FN17), histórico de alterações das tarefas (FN18), relatórios (FN19), estados configuráveis (FN20), calendário e cronograma (FN21), pedir ajuda numa tarefa (FN29).
- **Excluídos nesta fase:** utilizadores externos (FN22, R4), registo de tempo (FN23), práticas ágeis como sprints e backlog (FN24), integrações e migração de dados (FN25), várias línguas (FN26).
- **As contas não têm papel próprio:** em cada projeto, uma conta é Gestor ou Membro; Administrador é uma permissão da conta, acumulável com essas funções (DE01, DE02).
- **Cada projeto tem exatamente um Gestor** (DE06).
- **Não existe uma entidade "equipa" separada:** a equipa de um projeto são os seus membros (R6).
- **Uma tarefa pertence sempre a um projeto** e tem título, descrição, um só responsável e estado (R6, R7, DE09).
- **Os estados são três, fixos e iguais para todos os projetos:** Por fazer, Em curso e Concluída (R8).

## 2. Permissões

Resumo das decisões DE01–DE12 e das regras PN01–PN18. **Nenhuma foi validada pelo cliente.** As colunas Gestor e Membro referem-se à função da conta *naquele* projeto. Uma conta com permissão de Administrador que também participa num projeto tem, nesse projeto, as permissões da sua função.

| Ação | Administrador | Gestor do projeto | Membro do projeto | Origem |
|---|---|---|---|---|
| Criar e desativar contas | Sim | Não | Não | US02, DE03 |
| Dar e retirar a permissão de Administrador | Sim | Não | Não | US11, DE05 |
| Criar projetos e atribuir o Gestor | Sim | Não | Não | US03, DE06 |
| Trocar o Gestor (incluindo adicionar o novo Gestor à equipa) | Sim | Não | Não | US12, DE08 |
| Ver nome, estado, Gestor e membros de qualquer projeto (área de administração) | Sim | — | — | PN02 |
| Consultar o registo de ações administrativas | Sim | Não | Não | US14, DE12 |
| Editar e arquivar o projeto | Não | Sim | Não | US10, DE07 |
| Adicionar e remover membros | Não (exceto ao trocar o Gestor) | Sim | Não | US04, DE07, DE08 |
| Ver o projeto, as tarefas, os comentários e o progresso | Não | Sim | Sim | R10, PN02 |
| Criar tarefas, editar título e descrição, escolher o responsável, eliminar tarefas | Não | Sim | Não | US06, DE09 |
| Mudar o estado de uma tarefa | Não | Sim | Sim | US07, DE10 |
| Comentar tarefas | Não | Sim | Sim | US13, DE10, DE11 |
| Editar e apagar os próprios comentários | Não | Sim | Sim | US13, PN15 |

**Regras que se aplicam a todas as ações:**

- Um projeto arquivado fica só de leitura para todos (PN09).
- Uma conta desativada não consegue entrar e não pode ser reativada (US01, US02, PN17).
- A conta de sistema não pode ser desativada nem perder a permissão de Administrador (PN16).
- O responsável de uma tarefa tem de ser membro do projeto (PN06).

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

## 4. Decisões técnicas pendentes

Nenhuma tecnologia foi escolhida. As decisões abaixo ficam **pendentes** até haver respostas do cliente e uma fase de arquitetura.

| ID | Decisão pendente | Depende de |
|---|---|---|
| D01 | Canais de acesso (navegador, aplicação móvel, outro) | Pergunta 27 |
| D02 | Linguagens de programação | D01, D07 |
| D03 | Frameworks | D01, D02 |
| D04 | Forma de armazenamento dos dados | RNF01, perguntas 23 e 25 |
| D05 | Alojamento (infraestrutura própria ou externa) | Perguntas 23 e 26 |
| D06 | Forma de autenticação das contas (FN01) | Pergunta 29 e regras internas da empresa |
| D07 | Arquitetura da aplicação | D01, RNF01 |
| D08 | Forma de verificar os critérios de aceitação (testes) | D02, D03 |

## 5. Questões em aberto

| Questão | Onde aparece |
|---|---|
| O Administrador pode nomear-se a si próprio Gestor de um projeto onde não participa? | CL10, PN14 |
| Como volta a ter acesso uma pessoa cuja conta foi desativada, se a conta não pode ser reativada e o email é único? | CL11, PN11, PN17 |
| Um projeto arquivado pode voltar a ficar ativo? Um projeto pode ser eliminado? | US10, PN09 |
| US05 e US08 ainda não têm critérios de aceitação. | [user-stories.md](user-stories.md#2-critérios-de-aceitação) |
| Todas as respostas R1–R10, decisões DE01–DE13 e regras PN01–PN18 têm de ser validadas com o cliente. | [requirements.md](requirements.md#22-respostas-assumidas-r1r10), [requirements.md](requirements.md#23-decisões-internas-de01de13), [user-stories.md](user-stories.md#4-regras-de-negócio-pn01pn18) |
| Perguntas ao cliente sem resposta: 2, 4, 5, 19, 23, 26, 27, 31. | [requirements.md](requirements.md#6-perguntas-ao-cliente-ainda-por-responder) |
