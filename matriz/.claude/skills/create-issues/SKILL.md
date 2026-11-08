---
name: create-issues
description: Cria issues no GitHub a partir das user stories do MVP da Matriz (US01–US19), com rastreabilidade (FN, PN, DE, CL, RNF, D), critérios de aceitação, permissões, âmbito técnico por módulo, dependências e questões em aberto, tudo retirado da documentação do projeto. Usar quando o utilizador pedir para criar, gerar, preparar ou rever issues, tickets ou backlog a partir de user stories (por exemplo "cria o issue da US06", "gera issues para as US01 a US05").
---

# Criar issues a partir das user stories

Transforma uma ou mais user stories de `docs/user-stories.md` em issues do GitHub
bem definidos, prontos a implementar. **Toda a informação vem da documentação**;
a skill não acrescenta funcionalidades, regras nem decisões técnicas (ver
`AGENTS.md`).

Caminhos relativos à pasta `matriz/`. O repositório Git é a pasta-mãe.

## 1. Delimitar o pedido

1. Identifica as user stories pedidas (por ID, intervalo ou funcionalidade FN).
   Se o pedido for vago ("cria os issues"), pergunta quais antes de continuar.
2. **Só US01–US19 (MVP).** Se o pedido incluir US20–US36, não cries esses issues:
   diz que estão fora do MVP (`docs/constraints.md` §1) e continua só com as do MVP.
3. Verifica duplicados no GitHub:
   ```bash
   gh issue list --state all --search "[USxx] in:title" --limit 20
   ```
   Se já existir um issue para a story, mostra-o e pergunta se é para o atualizar,
   ignorar ou criar outro.

## 2. Recolher o contexto (para cada story)

Lê sempre o que está indicado; não escrevas o issue de memória.

| Fonte | O que retirar |
|---|---|
| `README.md` | Glossário (conta, função, Gestor, Membro, Administrador, responsável) e convenção de IDs. |
| `docs/user-stories.md` §1 | Texto da story, FN e MoSCoW. |
| `docs/user-stories.md` §2 | **Todos** os critérios de aceitação da story (Dado / Quando / Então), sem alterar o sentido. |
| `docs/user-stories.md` §3 | Casos-limite (CL) que citam a story, as suas regras ou as suas ações. |
| `docs/user-stories.md` §4 | Regras PN cuja coluna "Usado em" inclui a story, e as PN citadas nos critérios. |
| `docs/requirements.md` | FN da story (§4), DE e R citados pelas PN (§2.2, §2.3). |
| `docs/constraints.md` §2 | Linhas da tabela de permissões relativas às ações da story e as regras gerais. |
| `docs/constraints.md` §3–§4 | RNF aplicáveis (RNF02 em quase todas) e decisões técnicas D01–D08 relevantes (testes: D08). |
| `docs/constraints.md` §5 | Questões em aberto que tocam a story. |
| `docs/architecture.md` §4 | Módulo(s) responsáveis, dependências entre módulos (§4.2) e eventos internos. |
| `docs/database.md` | Entidades e atributos usados (§1, §2) e regras de integridade (§4); pressupostos (§6). |
| `openapi.yaml` | Endpoints já especificados para a story (hoje só listar e criar tarefas: US06, US08). |
| `docs/ui/dashboard-wireframe.html` | Ecrãs da story, se existirem no wireframe (ecrã inicial e vista de um projeto). |

## 3. Verificar antes de escrever

Pára e pergunta ao utilizador (não resolvas sozinho) se encontrares:

- **Questões em aberto** que afetem a implementação (por exemplo CL10 em US12,
  CL11 em US02, reabrir projeto arquivado em US10, sessão de conta desativada em
  US01/US15). Podes ainda redigir o issue, mas a questão fica na secção
  "Questões em aberto" e o issue recebe a etiqueta `question`.
- **Contradições** entre documentos (por exemplo, permissões em `constraints.md`
  diferentes das PN, ou atributos em `database.md` que não batem com `openapi.yaml`).
- **Falta de especificação** que impeça definir o "pronto" (por exemplo, endpoint
  não especificado no `openapi.yaml`). Nesse caso **não inventes caminhos nem
  formatos**: acrescenta a tarefa "Especificar o endpoint em `openapi.yaml`
  (aprovação necessária)".

## 4. Redigir o issue

Usa o modelo em [template.md](template.md). Regras:

- Português de Portugal; termos do glossário com a mesma capitalização
  (Gestor, Membro, Administrador, membro do projeto).
- Nomes de código em inglês, tal como em `database.md` e `architecture.md`
  (`tasks`, `PROJECT_MEMBER.role`, `DONE`…). Textos mostrados ao utilizador em português.
- **Título:** `[USxx] <título da secção da story em user-stories.md §2>`.
- **Critérios de aceitação:** um item de checklist por cenário, com o nome do
  cenário (Caminho normal / Erro / Caso) e o Dado / Quando / Então completo.
  Não juntes, não resumas e não acrescentes cenários. Casos-limite relevantes
  que não estejam já nos critérios entram como critérios extra, com o ID CL.
- **Cada ID citado tem de existir** nos documentos. Marca como pressuposto ou
  decisão interna o que os documentos marcam assim.
- **Âmbito técnico:** separa backend (módulo NestJS, entidades Prisma, endpoint,
  autorização no módulo `authorization`, eventos internos, registo em `audit`
  quando a ação consta de PN18) e frontend (ecrã Vue.js, mostrar/esconder ações,
  mensagens de erro). Indica só o que decorre dos documentos. Se o endpoint já
  estiver em `openapi.yaml`, lista os códigos de erro (`code`) que ele define,
  para que cada critério de erro tenha um código correspondente.
- **Critérios que pressupõem dados não especificados** (por exemplo, "não aparece
  entre as pessoas que posso escolher" exige obter os membros ativos do projeto):
  regista a falta em "Questões em aberto" e indica a story que provavelmente a cobre.
- **Fora de âmbito:** lista o que a story **não** inclui e que poderia parecer
  natural acrescentar (funcionalidades fora do MVP relacionadas, outras stories).
- **Dependências:** stories de que esta depende para ser testável (por exemplo
  US06 depende de US01, US03, US04). Se o issue de setup do projeto ainda não
  existir, indica "Configuração inicial do projeto (D01–D08)" como dependência e
  propõe ao utilizador criá-lo, com base apenas nas decisões D01–D08.
- **Definição de pronto:** testes que cobrem cada critério (Jest + Supertest no
  backend, Vitest no frontend, D08), verificação de autorização no backend
  (RNF02), mensagens em português, documentação em `docs/` atualizada se algo mudar.
- **Dados de exemplo:** só os nomes fictícios usados nos documentos (Ana, Rui,
  "Site", "Rever textos"…). Nunca credenciais, tokens ou dados pessoais reais.

**Granularidade:** por omissão, um issue por user story. Se a story tocar vários
módulos e for grande (por exemplo US02, US06), pergunta se o utilizador prefere
dividir em issues de backend e frontend ligados ao issue da story.

## 5. Rever com o utilizador (obrigatório)

Criar issues publica no repositório remoto, por isso exige aprovação (`AGENTS.md`).

1. Grava cada rascunho num ficheiro temporário (`mktemp -d`), um por story.
2. Mostra ao utilizador, por story: título, etiquetas, dependências, questões em
   aberto e o corpo completo (ou o caminho do ficheiro, se forem muitos).
3. Espera uma aprovação explícita. Aplica as correções pedidas e volta a mostrar.

## 6. Publicar

Só depois da aprovação:

1. Etiquetas a usar: `user-story`, `mvp`, uma `module:<nome>` por módulo de
   `architecture.md` §4.1 (`module:accounts`, `module:projects`, `module:tasks`,
   `module:progress`, `module:audit`, `module:authorization`), `frontend` e/ou
   `backend`, e `question` se houver questões em aberto. Verifica as que existem
   (`gh label list`); se faltarem, pede autorização antes de as criar:
   ```bash
   gh label create "user-story" --color 1d76db --description "User story do backlog"
   ```
2. Cria o issue:
   ```bash
   gh issue create --title "[US06] Criar, editar, eliminar e atribuir tarefas" \
     --body-file "$DRAFT_DIR/US06.md" --label "user-story,mvp,module:tasks,backend,frontend"
   ```
3. Depois de criar todos, substitui nas secções "Dependências" as referências
   `USxx` pelos números dos issues criados (`gh issue edit <n> --body-file ...`),
   se o utilizador o tiver aprovado.

## 7. Relatório final

Segue `AGENTS.md`: lista os issues criados (número, título, link), as etiquetas
criadas, os pressupostos que tiveste de fazer, as questões em aberto encontradas
e o que não foi criado e porquê (fora do MVP, duplicado, à espera de resposta).
