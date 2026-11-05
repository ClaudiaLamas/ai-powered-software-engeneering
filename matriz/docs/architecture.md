# Arquitetura — Matriz

Este ficheiro regista a decisão de arquitetura do MVP (decisão pendente D07 em [constraints.md](constraints.md#4-decisões-técnicas-pendentes)). É uma **decisão interna, por validar**, tomada com base nos documentos de especificação: [requirements.md](requirements.md), [user-stories.md](user-stories.md), [constraints.md](constraints.md) e [AGENTS.md](../AGENTS.md).

Não se escolhem aqui linguagens, frameworks, base de dados concreta nem alojamento (D02–D06 continuam pendentes).

## 1. Contexto relevante para a decisão

| Fator | O que sabemos | Origem |
|---|---|---|
| Âmbito | 12 funcionalidades Must (FN01–FN09, FN14, FN27, FN28), num único domínio: contas, projetos, tarefas e comentários. | requirements.md §5 |
| Escala | Até cerca de 10 equipas e 100 pessoas no arranque. | RNF01, R3 |
| Regras de negócio | Muitas regras que atravessam entidades: o responsável tem de ser membro do projeto (PN06), projeto arquivado só de leitura (PN09), um só Gestor por projeto (DE06), o último Administrador não pode ser removido (DE05). | constraints.md §2 |
| Segurança | Só os membros veem o conteúdo de um projeto; a permissão de Administrador não dá esse acesso. | RNF02, DE02 |
| Incerteza | Quase tudo são pressupostos e decisões internas por validar; o modelo pode mudar depois de falar com o cliente. | requirements.md §2 |
| Equipa e estado | A especificação está concluída; ainda não há código. | AGENTS.md |

## 2. Comparação das opções

| Critério | Monólito | Monólito modular | Microservices |
|---|---|---|---|
| Descrição | Uma aplicação e uma base de dados, sem fronteiras internas definidas. | Uma aplicação e uma base de dados, organizada em módulos com responsabilidades e interfaces claras. | Vários serviços independentes, cada um com os seus dados, a comunicar pela rede. |
| Adequação à escala (RNF01) | Mais do que suficiente. | Mais do que suficiente. | Excessiva: resolve problemas de escala que o MVP não tem. |
| Regras entre entidades (PN06, PN09, DE05, DE06) | Fáceis: tudo na mesma transação. | Fáceis: tudo na mesma transação, com cada regra no módulo dono. | Difíceis: exigem coordenação entre serviços e consistência eventual. |
| Custo de desenvolvimento e operação | Baixo. | Baixo; algum esforço inicial para definir os módulos. | Alto: vários deploys, comunicação em rede, observabilidade, gestão de falhas. |
| Facilidade de mudar o modelo (muitos pressupostos) | Boa no início; tende a degradar-se à medida que o código cresce sem fronteiras. | Boa: as mudanças ficam contidas num módulo. | Fraca: mudar fronteiras entre serviços é caro. |
| Evolução depois do MVP (FN10–FN29) | Arrisca acoplamento elevado. | Novas funcionalidades entram como novos módulos ou dentro dos existentes; um módulo pode ser extraído para serviço se um dia for necessário. | Boa em teoria, mas o custo é pago desde o primeiro dia. |
| Testes dos critérios de aceitação | Simples. | Simples, e é possível testar cada módulo isoladamente. | Mais complexos (testes entre serviços). |

## 3. Decisão

**Monólito modular**: uma única aplicação de backend, com uma única base de dados, organizada em módulos por área de negócio, e um frontend que a usa através de uma API.

### Justificação

1. **A escala não justifica distribuição.** Com cerca de 100 pessoas (RNF01), uma única aplicação chega com folga.
2. **As regras de negócio cruzam entidades.** Validar que o responsável é membro (PN06), que o projeto não está arquivado (PN09) ou que há sempre um Administrador ativo (DE05) é simples numa única base de dados e numa única transação; com microservices exigiria coordenação entre serviços.
3. **O modelo ainda vai mudar.** Quase tudo está por validar com o cliente. Os módulos mantêm cada mudança contida, sem o custo de reorganizar serviços.
4. **Prepara a evolução sem a pagar já.** As fronteiras entre módulos facilitam acrescentar as funcionalidades fora do MVP e, se algum dia for preciso, extrair um módulo para serviço.
5. **Custo mais baixo.** Um só deploy e uma só base de dados reduzem o esforço de desenvolvimento, testes e operação.

O monólito simples foi preterido porque, sem fronteiras explícitas, as regras de permissões (que são o núcleo do MVP) tendem a espalhar-se pelo código. Os microservices foram preteridos pelo custo e pela dificuldade de manter as regras entre entidades.

## 4. Componentes

```
┌──────────────────────────────┐
│ Frontend (interface web)     │
└──────────────┬───────────────┘
               │ API (pedidos autenticados)
┌──────────────▼───────────────────────────────────────────┐
│ Backend — monólito modular                               │
│                                                          │
│  ┌─────────────────────┐   ┌──────────────────────────┐  │
│  │ Autenticação e      │   │ Autorização              │  │
│  │ contas (accounts)   │   │ (authorization)          │  │
│  └─────────────────────┘   └──────────────────────────┘  │
│  ┌─────────────────────┐   ┌──────────────────────────┐  │
│  │ Projetos e membros  │◄──┤ Tarefas e comentários    │  │
│  │ (projects)          │   │ (tasks)                  │  │
│  └─────────────────────┘   └──────────────────────────┘  │
│  ┌─────────────────────┐   ┌──────────────────────────┐  │
│  │ Progresso           │   │ Registo administrativo   │  │
│  │ (progress)          │   │ (audit)                  │  │
│  └─────────────────────┘   └──────────────────────────┘  │
└──────────────┬───────────────────────────────────────────┘
               │
┌──────────────▼───────────────┐
│ Base de dados (única)        │
└──────────────────────────────┘
```

### 4.1 Responsabilidades

O nome entre parênteses é o nome do módulo no código, em inglês. As entidades de cada módulo estão em [database.md](database.md).

| Componente | Responsabilidade | Funcionalidades e regras |
|---|---|---|
| **Frontend** | Interface em português (RNF03) para entrar na aplicação, ver os projetos, gerir tarefas e comentários, ver o progresso e, para quem tem permissão de Administrador, a área de administração. Mostra ou esconde ações conforme as permissões, mas **não** é a garantia de segurança: todas as regras são verificadas no backend. | FN01–FN09, FN14, FN27, FN28 |
| **API** | Ponto de entrada único do backend. Recebe os pedidos do frontend, identifica a conta, encaminha para o módulo certo e devolve respostas e mensagens de erro (por exemplo, "o título é obrigatório"). | Todas |
| **Módulo Autenticação e contas** (`accounts`) | Entrada na aplicação com a conta de cada pessoa; recusa contas desativadas. Criar e desativar contas; dar e retirar a permissão de Administrador; proteger a conta de sistema e o último Administrador ativo. | FN01, FN02; DE03–DE05, PN16, PN17; US01, US02, US11 |
| **Módulo Autorização** (`authorization`) | Componente transversal que responde a "esta conta pode fazer esta ação neste projeto?". Usa a permissão de Administrador e a função (Gestor ou Membro) da conta no projeto, e aplica as regras gerais: só membros acedem ao conteúdo (RNF02), projeto arquivado só de leitura (PN09). A API consulta-o antes de encaminhar cada pedido (§4.2). | RNF02; DE01, DE02, PN02, PN09; tabela de permissões em constraints.md §2 |
| **Módulo Projetos e membros** (`projects`) | Criar projetos e atribuir o Gestor (Administrador); editar e arquivar (Gestor); adicionar e remover membros (Gestor); trocar o Gestor (Administrador); listar os projetos de cada conta; área de administração com a lista de todos os projetos. Garante exatamente um Gestor por projeto. | FN03, FN04, FN05, FN27; DE06–DE08; US03, US04, US05, US10, US12 |
| **Módulo Tarefas e comentários** (`tasks`) | Criar, editar e eliminar tarefas e escolher o responsável (Gestor); mudar o estado entre os três estados fixos (Gestor e Membro); listar tarefas agrupadas por estado; criar, editar e apagar os próprios comentários. Valida que o responsável é membro do projeto, consultando o módulo Projetos e membros. | FN06, FN07, FN08, FN14; R7, R8, DE09–DE11, PN06; US06, US07, US08, US13 |
| **Módulo Progresso** (`progress`) | Calcula, por projeto, o número de tarefas em cada estado e a percentagem de tarefas concluídas; trata o caso "Sem tarefas". Só lê dados; não altera nada. | FN09; R9; US09 |
| **Módulo Registo administrativo** (`audit`) | Guarda quem fez cada ação administrativa, qual e quando (contas, permissão de Administrador, criação de projetos, troca de Gestor). Os módulos Autenticação e contas e Projetos e membros registam aqui as suas ações. Permite ao Administrador consultar o registo. | FN28; DE12; US14 |
| **Base de dados** | Guarda contas, projetos, funções das contas em cada projeto, tarefas, comentários e o registo administrativo. É única e partilhada pelos módulos, mas cada módulo só escreve nos seus próprios dados. O tipo e o produto concretos ficam por decidir (D04). | Todas |

### 4.2 Regras entre módulos

- Cada módulo expõe uma interface própria; os outros módulos não acedem diretamente aos seus dados.
- Todas as ações passam pelo módulo `authorization` antes de serem executadas: a API consulta-o antes de encaminhar cada pedido para o módulo responsável.
- Um módulo só pode chamar os módulos indicados na tabela abaixo. As dependências não formam ciclos.

| Módulo | Depende de | Para quê |
|---|---|---|
| `accounts` | `audit` | Registar criar e desativar contas e dar e retirar a permissão de Administrador. |
| `projects` | `accounts` | Validar que a conta a adicionar ou a nomear Gestor existe e está ativa (`PROJECT_MEMBER.account_id`). |
| `projects` | `audit` | Registar criar projetos, atribuir e trocar o Gestor e adicionar membros pelo Administrador. |
| `tasks` | `projects` | Validar que o responsável é membro do projeto e que o projeto não está arquivado; saber se o responsável de uma tarefa ainda é membro, para mostrar "já não é membro" (PN07). |
| `tasks` | `accounts` | Obter o nome e o estado do responsável e do autor dos comentários (`TASK.assignee_id`, `COMMENT.author_id`). |
| `progress` | `tasks` | Contar as tarefas de cada projeto por estado. |
| `authorization` | `accounts`, `projects` | Ler a permissão de Administrador (`ACCOUNT.is_admin`), a função da conta no projeto (`PROJECT_MEMBER.role`) e o estado do projeto. |

Regras para manter as dependências sem ciclos:

- **Referências de dados não são dependências de código.** `ADMIN_AUDIT_LOG` tem chaves estrangeiras para `ACCOUNT` e `PROJECT` (integridade dos dados), mas o módulo `audit` não chama `accounts` nem `projects`. Para mostrar o registo com nomes, a API junta a resposta de `audit` com a de `accounts` e `projects`.
- **Efeitos em sentido inverso usam eventos internos.** Quando uma ação de um módulo tem de alterar dados de um módulo que depende dele, o primeiro emite um evento interno e o segundo reage, na mesma transação. Casos do MVP:
  - `projects` emite "membro removido" e `tasks` deixa sem responsável as tarefas dessa pessoa nesse projeto que não estão "Concluída" (PN07).
  - `accounts` emite "conta desativada" e `tasks` deixa sem responsável as tarefas dessa pessoa, em todos os projetos, que não estão "Concluída" (PN08).

## 5. Pressupostos e pontos em aberto

| Ponto | Situação |
|---|---|
| Canal de acesso (D01) | Assume-se uma **interface web** acedida pelo navegador, por ser o canal mais simples para equipas internas. Se o cliente pedir aplicação móvel ou acesso sem internet (pergunta 27), o backend e a API mantêm-se; muda o frontend. |
| Base de dados (D04) | Os dados são fortemente relacionados (contas, projetos, funções, tarefas) e têm regras de integridade (um Gestor por projeto, responsável membro do projeto), o que aponta para uma base de dados relacional. A escolha final fica pendente. |
| Autenticação (D06) | O módulo Autenticação e contas isola a forma de autenticar; se a empresa usar um sistema de identidade próprio, a mudança fica contida nesse módulo. |
| Linguagens, frameworks e alojamento (D02, D03, D05) | Continuam pendentes. A decisão de arquitetura não depende deles. |
| Validação | Esta decisão tem de ser revista se o cliente indicar uma escala muito maior do que RNF01 ou integrações com outras ferramentas (FN25). |
