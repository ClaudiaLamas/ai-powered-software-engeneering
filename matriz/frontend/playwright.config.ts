import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseEnv } from 'node:util'
import { defineConfig, devices } from '@playwright/test'

/**
 * Testes E2E de browser (Playwright, só Chromium). Arranca um backend e um
 * frontend próprios, em portas que não são as de desenvolvimento, ligados a
 * uma base de dados isolada (`<nome>_e2e_test`) que é esvaziada e semeada com
 * `db:seed` em cada execução. Nunca reutiliza servidores que já estejam a correr.
 *
 * Pré-requisitos: PostgreSQL do compose.yaml, backend/.env e a variável
 * E2E_PASSWORD (palavra-passe das contas de demonstração, 12 caracteres ou mais).
 */
const BACKEND_PORT = 3100
const FRONTEND_PORT = 5180

const backendDir = fileURLToPath(new URL('../backend', import.meta.url))
const resetSql = fileURLToPath(new URL('./e2e/reset-database.sql', import.meta.url))

function fail(message: string): never {
  throw new Error(`[e2e] ${message}`)
}

/** DATABASE_URL do backend/.env, com o nome da base trocado por `<nome>_e2e_test`. */
function e2eDatabaseUrl(): string {
  let env: Record<string, string | undefined>
  try {
    env = parseEnv(readFileSync(`${backendDir}/.env`, 'utf8'))
  } catch {
    fail('Falta o backend/.env (copia backend/.env.example).')
  }
  if (!env.DATABASE_URL) fail('Falta DATABASE_URL no backend/.env.')
  const url = new URL(env.DATABASE_URL)
  url.pathname = `${url.pathname.replace(/\/$/, '')}_e2e_test`
  return url.toString()
}

/** Recusa qualquer base cujo nome não termine em `_test` (antes de qualquer TRUNCATE). */
function assertTestDatabase(databaseUrl: string): void {
  const name = new URL(databaseUrl).pathname.replace(/^\//, '')
  if (!name.endsWith('_test')) {
    fail(`A base de dados dos testes E2E tem de terminar em "_test" (recebido: "${name}").`)
  }
}

const password = process.env.E2E_PASSWORD
if (!password) fail('Define E2E_PASSWORD (palavra-passe das contas de demonstração).')

const databaseUrl = e2eDatabaseUrl()
// Corre ao carregar o config, antes de o webServer arrancar e esvaziar a base.
assertTestDatabase(databaseUrl)

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // Migrations, base vazia, seed e API. O SQL volta a confirmar o nome da base.
      command:
        'npx prisma migrate deploy' +
        ` && npx prisma db execute --file "${resetSql}"` +
        ' && npm run db:seed' +
        ' && npm run start',
      cwd: backendDir,
      url: `http://localhost:${BACKEND_PORT}/health`,
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        PORT: String(BACKEND_PORT),
        DATABASE_URL: databaseUrl,
        SEED_DEMO_PASSWORD: password,
        // Segredo próprio e aleatório: nunca o JWT_SECRET do backend/.env.
        JWT_SECRET: randomBytes(32).toString('hex'),
      },
    },
    {
      command: `npm run dev -- --port ${FRONTEND_PORT} --strictPort`,
      url: `http://localhost:${FRONTEND_PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: { VITE_API_URL: `http://localhost:${BACKEND_PORT}` },
    },
  ],
})
