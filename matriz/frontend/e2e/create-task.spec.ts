import { expect, test } from '@playwright/test'

// Conta e projeto do seed (backend/prisma/seed.ts): a Ana é Gestora do
// "Portal de clientes" e pode criar tarefas (US06). Dados fictícios.
const EMAIL = 'ana.silva@matriz.test'
const PROJECT_NAME = 'Portal de clientes'
const PROJECT_ID = '5eed0000-0000-4000-8000-000000000103'

test('a Gestora entra, abre o projeto, cria uma tarefa e vê-a em "Por fazer"', async ({ page }) => {
  const password = process.env.E2E_PASSWORD
  if (!password) throw new Error('Define E2E_PASSWORD.')
  const title = `Tarefa E2E ${Date.now()}`

  // Entrar (US01)
  await page.goto('/entrar')
  await page.getByLabel('Email').fill(EMAIL)
  await page.getByLabel('Palavra-passe').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Olá, Ana Silva' })).toBeVisible()

  // Abrir o projeto a partir do ecrã inicial (US05)
  await page.getByRole('link', { name: PROJECT_NAME }).click()
  await expect(page).toHaveURL(new RegExp(`/projetos/${PROJECT_ID}$`))
  await expect(page.getByRole('heading', { level: 1, name: PROJECT_NAME })).toBeVisible()

  // Criar a tarefa (US06)
  const form = page.getByRole('region', { name: 'Nova tarefa' })
  await form.getByLabel('Título').fill(title)
  await form.getByRole('button', { name: 'Criar tarefa' }).click()
  await expect(form.getByRole('status')).toHaveText(`Tarefa "${title}" criada.`)

  // Ver a tarefa na listagem, no grupo "Por fazer" (US08)
  const todo = page.getByRole('region', { name: 'Por fazer', exact: true })
  await expect(todo.getByRole('link', { name: title })).toBeVisible()
})
