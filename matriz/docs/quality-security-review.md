# Revisão de qualidade e segurança — Matriz

## 1. Code Review

(por preencher)

## 2. Security Review

(por preencher)

## 3. Teste manual de autorização (duas contas)

(por preencher)

## 4. Análise estática

(por preencher)

## 5. Correções e testes de regressão

(por preencher)

## 6. Verificações não executadas e problemas pendentes

| # | Item | Estado | Decisão |
|---|---|---|---|
| 1 | Os guardas do nome `_test` dos testes E2E de browser não foram provocados com uma base de dados com outro nome: a verificação em `frontend/playwright.config.ts`, que aborta antes do `TRUNCATE`, e a de `frontend/e2e/reset-database.sql`, que recusa com `RAISE EXCEPTION`. | Não verificado | Risco aceite: a verificação existe em dois sítios independentes. Provocá-los exigiria correr o SQL contra uma base sem `_test`, por exemplo a de desenvolvimento. |
| 2 | 5 avisos de gravidade moderada do `npm audit` no frontend (`@vue/test-utils`, `js-beautify`, `glob`, `minimatch`, `editorconfig`), em dependências de desenvolvimento que já existiam antes do Playwright. | Pendente | Fora do âmbito: não vêm do Playwright e corrigi-los muda dependências, o que pede aprovação. |
| 3 | Título em falta para um não-membro: a especificação contradiz-se. `required: [title]` faz dele um erro de formato (`400 VALIDATION_ERROR`, antes do `404`), mas o OpenAPI diz que dá `TITLE_INVALID`, um código de regra que vem depois do `404` ([test-plan.md](test-plan.md), H3). | Questão em aberto | O caso não é testado; só se testam os casos sem ambiguidade. Fica à espera da correção do contrato (`openapi.yaml`). |
| 4 | Os caracteres do título (PN12) contam-se em pontos de código: um carácter acentuado precomposto conta 1 e um emoji fora do BMP conta 1 ([test-plan.md](test-plan.md), H1). | Pressuposto, a validar com o cliente | Mantém-se a contagem em pontos de código até o cliente a validar. |
