# Relatório de validação final — Matriz 0.1.0-rc.2

Ficha Prática 05, exercício 6 e entrega. Data: 2026-11-19. Versão: **0.1.0-rc.2** (candidata, sem tag). Base: `main` em `a5f09bb` (merge do PR #30) mais o script de reposição das palavras-passe de demonstração (ramo `entrega-rc2`).

Legenda das fontes: **IA** = executado e observado pelo agente (Claude Code); **Programadora** = feito e observado pela programadora; **Deduzido** = conclusão a partir de outros factos, sem verificação direta. O registo completo está em [verification.md §8](verification.md#8-entrega-com-docker-docker-compose-e-github-actions-ficha-05).

## 1. Requisitos da entrega

| Requisito | Onde | Estado |
|---|---|---|
| Código-fonte atualizado | `backend/`, `frontend/` | Cumprido |
| Dockerfiles e `.dockerignore` | `backend/Dockerfile`, `backend/.dockerignore`, `frontend/Dockerfile`, `frontend/.dockerignore` | Cumprido |
| Docker Compose | [`compose.yaml`](../compose.yaml) | Cumprido |
| `.env.example` sem credenciais reais | `.env.example`, `backend/.env.example`, `frontend/.env.example` (só valores de exemplo) | Cumprido (IA, §5) |
| Workflow GitHub Actions | [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) | Cumprido |
| README e documentação técnica | [README](../README.md), [architecture.md](architecture.md) (com um diagrama Mermaid), [openapi.yaml](../openapi.yaml) | Cumprido |
| Changelog e notas da versão candidata | [CHANGELOG.md](../CHANGELOG.md), [v0.1.0-rc.1](releases/v0.1.0-rc.1.md), [v0.1.0-rc.2](releases/v0.1.0-rc.2.md) | Cumprido; tags por criar |
| Evidências dos testes e verificações | [verification.md](verification.md) §3, §8 | Cumprido |

## 2. Exercício 6, tarefa a tarefa

| Tarefa | Resultado | Fonte |
|---|---|---|
| 1. Executar a aplicação pelas instruções do README | `docker compose up -d --build` com o `.env` da raiz; arranque local do backend e do frontend usado durante o desenvolvimento | IA |
| 2. Estado dos containers | `migrate` `Exited (0)`; `backend`, `frontend` e `postgres` `healthy` | IA (§8.7) |
| 3. Funcionalidades essenciais | Containers: rotas, rewrites do nginx, `401` e `400` da API; teste E2E (entrar, abrir um projeto, criar uma tarefa). Online: entrar, painel, criar uma tarefa, mudar o estado, link direto | IA (§8.7, §8.8); Programadora (§8.8) |
| 4. Pipeline CI/CD | O run do merge do PR #30 (`a5f09bb`) passou nos quatro jobs; o deploy no Render só corre depois da CI | IA (`gh run list`); deploy depois da CI: deduzido |
| 5. Logs | `docker compose logs` sem erros nem avisos | IA (§8.7) |
| 6. Credenciais nos ficheiros versionados | Nenhuma (ver §5) | IA |
| 7. Problemas e correções | Ver §4 | IA e Programadora |

## 3. Resultados dos testes e da pipeline

Verificações locais de 2026-11-19 (commit `addcab3`), todas com o código de saída 0 ([verification.md §8.7](verification.md#87-validação-final-da-versão-010-rc2-2026-11-19)):

| Conjunto | Resultado |
|---|---|
| Backend: lint (oxlint) e build | Sem erros |
| Backend: testes unitários | 122 passaram |
| Backend: testes de API (Supertest, base `matriz_test`) | 257 passaram |
| Frontend: tipos e build | Sem erros |
| Frontend: testes unitários | 191 passaram |
| Frontend: E2E de browser (Playwright) | 1 passou |
| Contraste (WCAG AA), nos temas claro e escuro | Todos os pares medidos passam (texto ≥ 4,5:1, bordas de campos ≥ 3:1) |

Pipeline no GitHub Actions: os merges dos PR #28, #29 e #30 passaram. A história da pipeline (incluindo a falha real da execução 1 e a falha controlada da execução 4) está em [verification.md §8.4](verification.md#84-pipeline-no-github-actions).

## 4. Problemas encontrados e correções

Durante a preparação da entrega (Docker, CI) estão em [verification.md §8.1–8.4](verification.md#81-imagens-e-containers) e no [plano de entrega](delivery-plan.md). Durante o deploy ([verification.md §8.8](verification.md#88-deploy-online-render-e-neon-2026-11-19)):

| Problema | Correção |
|---|---|
| Projeto Neon criado em US East 2 | Recriado em Frankfurt |
| Publish Directory do Static Site como `.dist` | Corrigido para `dist` |
| Static Site sem rewrite rules: o login dava "Não foi possível contactar o servidor" | Criadas `/api/*` → backend e `/*` → `/index.html`, por esta ordem |
| O endereço do backend tem o sufixo `-xweh` (`matriz-api.onrender.com` é outro serviço) | Rewrite com o endereço real; nota no README |
| Palavra-passe do seed perdida; o seed não altera contas existentes | Script `reset-demo-passwords.ts`, com teste e confirmação explícita |

## 5. Credenciais

Verificado pela IA no `main` (`a5f09bb`) com `git ls-tree`, `git check-ignore`, `git grep` e `git log`:

- Só estão versionados os três `.env.example`; os `.env` estão no `.gitignore` e nenhum foi adicionado em nenhum commit.
- Não há hosts do Neon, URLs de bases de dados com credenciais reais, `JWT_SECRET`, tokens nem chaves privadas. As únicas palavras-passe são de exemplo (`muda-esta-palavra-passe`) ou da base descartável da CI (`ci-only-password`, documentada no `ci.yml`).
- As palavras-passe da demonstração (local, E2E e online) nunca foram escritas em ficheiros, commits nem mensagens: foram lidas com `read -s` ou geradas na shell.

## 6. Utilização dos agentes de IA

O agente (Claude Code) foi usado para: analisar o projeto e propor alterações antes de as fazer; implementar as melhorias do frontend com testes; medir o contraste no navegador; diagnosticar o deploy (pedidos aos endereços públicos, sem acesso aos painéis do Render nem do Neon); escrever o script de reposição; correr as verificações e escrever esta documentação. A programadora aprovou cada plano, configurou o Render e o Neon, correu os comandos com credenciais e validou a aplicação online no navegador. O agente não teve acesso a palavras-passe nem às URLs das bases de dados.

## 7. Limitações por resolver

- **MVP incompleto:** faltam os incrementos 2 (contas, ativação e email), 7 (pedidos de responsável) e 8 (administração), a gestão da equipa (incremento 3) e o formulário de criação de projetos.
- **Sessão:** o token não é revogado ao sair (D06).
- **Testes E2E de browser:** um só percurso.
- **Imagem do backend:** 571 MB.
- **Plano gratuito:** o backend para sem tráfego (24 s no primeiro pedido medido); migrations e seed manuais, a partir de uma máquina de desenvolvimento.
- **Por verificar:** online, as contas Membro, pendente e desativada, os comentários, a edição e o arquivo do projeto, e a secção "Arquivados" do painel; a forma como os diagramas Mermaid aparecem no GitHub; a persistência dos containers não foi repetida na rc.2 ([verification.md §8.5](verification.md#85-por-verificar)).
- **Tags:** `v0.1.0-rc.1` e `v0.1.0-rc.2` ainda por criar.
