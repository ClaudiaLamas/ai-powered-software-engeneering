# Matriz

Matriz é uma aplicação de gestão de projetos e tarefas para equipas de trabalho. Esta pasta contém a especificação inicial: requisitos, âmbito do MVP, user stories, restrições, arquitetura, modelo de dados, uma especificação parcial da API e um wireframe do dashboard.

> **Estado:** especificação inicial, **não validada pelo cliente**. Só F1–F5 são factos. Tudo o resto (P, R, DE, PN, D) são pressupostos ou decisões internas, que devem ser confirmados antes do desenvolvimento.

## O que o cliente pediu

A única informação dada pelo cliente foi esta frase:

> "Precisamos de uma aplicação onde as nossas equipas possam organizar projetos, gerir tarefas e acompanhar o progresso do trabalho."

Daqui saem os factos F1–F5, descritos em [docs/requirements.md](docs/requirements.md).

## Âmbito do MVP

O MVP inclui **apenas as funcionalidades Must** (proposta, por validar):

| ID | Funcionalidade |
|---|---|
| FN01 | Acesso identificado: cada pessoa entra com a sua conta |
| FN02 | Administrador cria e desativa contas e dá ou retira a permissão de Administrador |
| FN03 | Administrador cria projetos e atribui o Gestor; Gestor edita e arquiva o projeto |
| FN04 | Gestor adiciona e remove membros de um projeto |
| FN05 | Ver a lista dos projetos a que pertenço |
| FN06 | Gestor cria, edita e elimina tarefas (título, descrição, responsável) |
| FN07 | Mudar o estado de uma tarefa (Por fazer, Em curso, Concluída) |
| FN08 | Ver as tarefas de um projeto agrupadas por estado |
| FN09 | Indicador de progresso por projeto (nº de tarefas por estado e % concluídas) |
| FN14 | Comentários em tarefas |
| FN27 | Administrador troca o Gestor de um projeto |
| FN28 | Registo das ações administrativas |

Proposta, em resumo: o Administrador cria as contas e os projetos e atribui a cada projeto um Gestor. O Gestor forma a equipa do projeto e cria as tarefas, cada uma com um só responsável. Os membros avançam as tarefas por três estados fixos e comentam-nas. O progresso é acompanhado por projeto, com as tarefas agrupadas por estado e a percentagem de tarefas concluídas.

Prazos, prioridades, notificações, relatórios e pedidos de ajuda numa tarefa ficam **fora do MVP** (FN10–FN13, FN15–FN26, FN29).

## Glossário

| Termo | Significado |
|---|---|
| Conta | Acesso identificado de uma pessoa à Matriz (nome e email único). Não tem papel próprio. Está "Pendente" até a pessoa definir a palavra-passe pelo link de ativação, depois "Ativa" e, se for desativada, "Desativada" (DE15). |
| Conta de sistema | A primeira conta de Administrador, criada pela equipa do projeto. Não pode ser desativada nem perder a permissão (DE04). |
| Administrador | **Permissão da conta**, não uma função num projeto. Permite gerir contas, permissões, projetos e Gestores. Não dá acesso ao conteúdo de projetos onde a conta não participa (DE02). |
| Função | O que uma conta é num projeto concreto: Gestor ou Membro. A mesma conta pode ser Gestor no projeto A e Membro no projeto B (DE01). |
| Gestor | Função num projeto. Cada projeto tem exatamente um. Edita e arquiva o projeto, forma a equipa e gere as tarefas (DE06, DE07, DE09). |
| Membro | Função num projeto. Muda o estado das tarefas e comenta-as (DE10). |
| membro do projeto | Em minúscula: qualquer conta que participa no projeto, seja Gestor ou Membro. |
| Equipa | O conjunto dos membros de um projeto. Não é uma entidade separada (R6). |
| Responsável | O único membro do projeto encarregado de uma tarefa (DE09). |

As funções e a permissão são **decisões internas, por validar com o cliente** (DE01–DE15).

## Documentação

| Ficheiro | Conteúdo |
|---|---|
| [docs/requirements.md](docs/requirements.md) | Factos, pressupostos, respostas assumidas, decisões internas, funções, funcionalidades e âmbito do MVP. |
| [docs/user-stories.md](docs/user-stories.md) | User stories do MVP, critérios de aceitação, casos-limite e pressupostos de regras (PN). |
| [docs/constraints.md](docs/constraints.md) | Restrições de âmbito, permissões, requisitos não funcionais, decisões técnicas e questões em aberto. |
| [docs/architecture.md](docs/architecture.md) | Decisão de arquitetura (D07: monólito modular), componentes, responsabilidades e dependências entre módulos. |
| [docs/database.md](docs/database.md) | Modelo de dados lógico do MVP, regras de integridade e diagrama ER. |
| [docs/ui/dashboard-wireframe.html](docs/ui/dashboard-wireframe.html) | Wireframe de baixa fidelidade do ecrã inicial e da vista de um projeto. |
| [openapi.yaml](openapi.yaml) | Especificação parcial da API do backend: listar e criar tarefas de um projeto (FN06, FN08). |
| [AGENTS.md](AGENTS.md) | Instruções para agentes de IA que trabalhem no repositório. |

## Convenção de IDs

Os IDs são iguais em todos os ficheiros.

| Prefixo | Significado | Tipo |
|---|---|---|
| F1–F5 | Factos ditos pelo cliente | **Facto** |
| P1–P14 | Pressupostos implícitos identificados na análise inicial | Pressuposto |
| R1–R10 | Respostas assumidas às perguntas de clarificação prioritárias | Pressuposto |
| DE01–DE15 | Decisões da equipa do projeto (2026-10-29, 2026-11-04 e 2026-11-08), não validadas pelo cliente | Decisão interna |
| PN01–PN18 | Regras de negócio: concretizam decisões DE ou são pressupostos | Decisão interna ou pressuposto |
| D01–D09 | Decisões técnicas, todas tomadas, não validadas pelo cliente | Decisão interna |
| FN01–FN29 | Funcionalidades propostas | Proposta |
| US01–US19 | User stories do MVP | Proposta |
| US20–US36 | User stories fora do MVP | Proposta |
| CL1–CL12 | Casos-limite | Proposta |
| RNF01–RNF03 | Requisitos não funcionais | Pressuposto |
