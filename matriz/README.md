# Matriz

Matriz é uma aplicação de gestão de projetos e tarefas para equipas de trabalho. Esta pasta contém a especificação funcional inicial: requisitos, âmbito do MVP, user stories e restrições.

> **Estado:** especificação inicial, **não validada pelo cliente**. Só F1–F5 são factos. Tudo o resto (P, R, PN, D) são pressupostos ou decisões pendentes, que devem ser confirmados antes do desenvolvimento.

## O que o cliente pediu

A única informação dada pelo cliente foi esta frase:

> "Precisamos de uma aplicação onde as nossas equipas possam organizar projetos, gerir tarefas e acompanhar o progresso do trabalho."

Daqui saem os factos F1–F5, descritos em [docs/requirements.md](docs/requirements.md).

## Âmbito do MVP

O MVP inclui **apenas as funcionalidades Must, FN01–FN09**:

| ID | Funcionalidade |
|---|---|
| FN01 | Acesso identificado: cada pessoa entra com a sua conta |
| FN02 | Administrador cria e desativa contas |
| FN03 | Criar, editar e arquivar projetos (nome, descrição) |
| FN04 | Adicionar e remover membros de um projeto |
| FN05 | Ver a lista dos projetos a que pertenço |
| FN06 | Criar, editar e eliminar tarefas num projeto (título, descrição, responsável) |
| FN07 | Mudar o estado de uma tarefa (Por fazer, Em curso, Concluída) |
| FN08 | Ver as tarefas de um projeto agrupadas por estado |
| FN09 | Indicador de progresso por projeto (nº de tarefas por estado e % concluídas) |

Em resumo, as pessoas da empresa entram com a sua conta e trabalham nos projetos onde são membros. Em cada projeto, o Gestor cria tarefas e atribui-lhes um responsável, e os membros editam-nas e avançam-nas por três estados fixos. O progresso é acompanhado por projeto, com as tarefas agrupadas por estado e a percentagem de tarefas concluídas.

Prazos, prioridades, comentários, notificações e relatórios ficam **fora do MVP** (FN10–FN26).

## Tipos de utilizador

| Tipo | Papel resumido |
|---|---|
| Administrador | Gere as contas; não vê o conteúdo dos projetos. |
| Gestor de projeto | Cria e gere projetos e tarefas; é também membro dos seus projetos. |
| Membro | Edita tarefas e muda o seu estado nos projetos onde participa. |

Os três tipos são **pressupostos** (R4, R5, PN01–PN05).

## Documentação

| Ficheiro | Conteúdo |
|---|---|
| [docs/requirements.md](docs/requirements.md) | Factos, pressupostos, respostas assumidas, utilizadores, funcionalidades e âmbito do MVP. |
| [docs/user-stories.md](docs/user-stories.md) | User stories do MVP, critérios de aceitação, casos-limite e pressupostos de regras (PN). |
| [docs/constraints.md](docs/constraints.md) | Restrições de âmbito, permissões, requisitos não funcionais, decisões pendentes e questões em aberto. |

## Convenção de IDs

Os IDs são iguais em todos os ficheiros.

| Prefixo | Significado | Tipo |
|---|---|---|
| F1–F5 | Factos ditos pelo cliente | **Facto** |
| P1–P14 | Pressupostos implícitos identificados na análise inicial | Pressuposto |
| R1–R10 | Respostas assumidas às perguntas de clarificação prioritárias | Pressuposto |
| PN01–PN14 | Regras de negócio assumidas ao escrever as user stories | Pressuposto |
| D01–D08 | Decisões técnicas pendentes | Decisão pendente |
| FN01–FN26 | Funcionalidades propostas | Proposta |
| US01–US09 | User stories do MVP | Proposta |
| CL1–CL8 | Casos-limite | Proposta |
| RNF01–RNF03 | Requisitos não funcionais | Pressuposto |
