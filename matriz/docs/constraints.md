# Restrições — Matriz

Este ficheiro reúne as restrições de âmbito, as permissões por tipo de utilizador, os requisitos não funcionais, as decisões técnicas pendentes e as questões em aberto. O cliente não indicou nenhuma restrição; **tudo o que está aqui são pressupostos ou decisões pendentes**.

## 1. Restrições de âmbito

Decisões nossas, por validar com o cliente.

- **O MVP inclui só as funcionalidades Must: FN01–FN09.** A lista completa está em [requirements.md](requirements.md#4-funcionalidades).
- **Ficam fora do MVP:** prazos (FN10), "as minhas tarefas" (FN11), prioridades (FN12), pesquisa e filtros (FN13), comentários (FN14), notificações (FN15), anexos (FN16), subtarefas e dependências (FN17), histórico de alterações (FN18), relatórios (FN19), estados configuráveis (FN20), calendário e cronograma (FN21).
- **Excluídos nesta fase:** utilizadores externos (FN22, R4), registo de tempo (FN23), práticas ágeis como sprints e backlog (FN24), integrações e migração de dados (FN25), várias línguas (FN26).
- **Só existem três tipos de utilizador:** Administrador, Gestor de projeto e Membro (R5).
- **Não existe uma entidade "equipa" separada:** a equipa de um projeto são os seus membros (R6).
- **Uma tarefa pertence sempre a um projeto** e tem título, descrição, responsável e estado (R6, R7).
- **Os estados são três, fixos e iguais para todos os projetos:** Por fazer, Em curso e Concluída (R8).

## 2. Permissões por tipo de utilizador

Resumo das regras R10 e PN01–PN09. **Todas são pressupostos.**

| Ação | Administrador | Gestor do projeto | Membro | Origem |
|---|---|---|---|---|
| Criar e desativar contas | Sim | Não | Não | US02, PN01 |
| Criar projetos | Não | Sim | Não | PN01 |
| Editar e arquivar o projeto | Não | Sim | Não | US03, PN03 |
| Adicionar e remover membros | Não | Sim | Não | US04, PN03 |
| Ver o projeto, as tarefas e o progresso | Não | Sim | Sim | R10, PN02 |
| Criar tarefas | Não | Sim | Não | PN05 |
| Escolher ou mudar o responsável | Não | Sim | Não | PN05 |
| Editar título e descrição de uma tarefa | Não | Sim | Sim | PN05 |
| Mudar o estado de uma tarefa | Não | Sim | Sim | PN05 |
| Eliminar tarefas | Não | Sim | Não | PN05 |

**Regras que se aplicam a todas as ações:**

- Um projeto arquivado fica só de leitura para todos (PN09).
- Uma conta desativada não consegue entrar (US01, US02).
- O responsável de uma tarefa tem de ser membro do projeto (PN06).

## 3. Requisitos não funcionais

O cliente não indicou requisitos não funcionais. Os três abaixo derivam de pressupostos já existentes e são, por isso, **pressupostos**.

| ID | Requisito | Origem | Tipo |
|---|---|---|---|
| RNF01 | A aplicação suporta até cerca de 10 equipas e 100 pessoas no arranque. | R3 | Pressuposto |
| RNF02 | Só os membros de um projeto acedem ao seu conteúdo; o Administrador não acede; contas desativadas não entram. | R10, PN02, US01 | Pressuposto |
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
| O que acontece a um projeto cujo Gestor é desativado? | CL8, PN14 |
| US03, US05 e US08 ainda não têm critérios de aceitação. | [user-stories.md](user-stories.md#2-critérios-de-aceitação) |
| Todas as respostas R1–R10 e regras PN01–PN13 têm de ser validadas com o cliente. | [requirements.md](requirements.md#22-respostas-assumidas-r1r10), [user-stories.md](user-stories.md#4-pressupostos-de-regras-de-negócio-pn01pn14) |
| Perguntas ao cliente sem resposta: 2, 4, 5, 19, 23, 26, 27, 31. | [requirements.md](requirements.md#6-perguntas-ao-cliente-ainda-por-responder) |
