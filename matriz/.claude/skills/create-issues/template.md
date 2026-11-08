# Modelo de issue

Substitui os campos entre `<>`. Remove secções que fiquem vazias, exceto
"Questões em aberto" (escreve "Nenhuma") e "Fora de âmbito".

```markdown
## User story

> <texto exato da story, de docs/user-stories.md §1>

| FN | MoSCoW | Módulos |
|---|---|---|
| <FNxx> | Must | <`tasks`, `projects`…> |

## Rastreabilidade

- **Regras de negócio:** <PNxx — resumo de uma linha>, …
- **Decisões internas e respostas assumidas:** <DExx, Rx>
- **Casos-limite:** <CLx — resumo>
- **Requisitos não funcionais:** <RNF02 …>
- **Decisões técnicas:** <D06, D08 …>

> As regras e decisões acima são decisões internas ou pressupostos, ainda não validados pelo cliente.

## Critérios de aceitação

- [ ] **<Caminho normal: …>** — **Dado** <…>, **Quando** <…>, **Então** <…>.
- [ ] **<Erro: …>** — **Dado** <…>, **Quando** <…>, **Então** <…>.
- [ ] **<CLx: …>** — <comportamento esperado, de user-stories.md §3>.

## Permissões

| Ação | Administrador | Gestor | Membro |
|---|---|---|---|
| <ação> | <Sim/Não> | <Sim/Não> | <Sim/Não> |

Regras gerais aplicáveis: <projeto arquivado só de leitura (PN09), conta desativada…>

## Âmbito técnico

### Backend (NestJS)

- [ ] Módulo `<module>`: <operação>.
- [ ] Autorização verificada no módulo `authorization` antes da ação (RNF02).
- [ ] Entidades: <`TASK` (`title`, `assignee_id`, `status`…)>; regras de integridade: <…> (`docs/database.md` §4).
- [ ] Endpoint: <`POST /projects/{projectId}/tasks` (openapi.yaml)> | <Especificar o endpoint em `openapi.yaml` (aprovação necessária)>.
- [ ] <Evento interno / registo em `audit`, se aplicável (architecture.md §4.2, PN18)>.

### Frontend (Vue.js)

- [ ] <Ecrã / componente; referência ao wireframe, se existir>.
- [ ] Mostrar ou esconder ações conforme a função (sem substituir a verificação no backend).
- [ ] Mensagens de erro em português: <"O título é obrigatório."…>.

## Fora de âmbito

- <funcionalidade relacionada fora do MVP, com FN>
- <outra story que trata do resto, com USxx>

## Dependências

- <USxx — motivo>

## Questões em aberto

- <questão, com ID e documento> | Nenhuma

## Definição de pronto

- [ ] Todos os critérios de aceitação cobertos por testes (Vitest + Supertest no backend; Vitest no frontend — D08).
- [ ] Casos de erro e de permissão testados no backend, incluindo acesso de quem não é membro do projeto e de um Administrador que não participa nele (RNF02).
- [ ] Textos da interface em português de Portugal; nomes no código em inglês.
- [ ] Documentação em `docs/` e `openapi.yaml` atualizada, se a implementação mudar regras ou a API.
```
