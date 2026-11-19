<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ApiError } from '@/api/http'
import type { Account, ProjectSummary } from '@/api/types'
import { loadMe } from '@/auth/auth-api'
import { listMyProjects } from '@/projects/projects-api'
import EmptyState from '@/components/EmptyState.vue'
import ErrorMessage from '@/components/ErrorMessage.vue'
import LoadingIndicator from '@/components/LoadingIndicator.vue'
import ProgressIndicator from '@/components/ProgressIndicator.vue'
import { ARCHIVED_LABEL, PROJECT_ROLE_LABELS } from '@/projects/project-labels'

/**
 * Ecrã inicial (wireframe, ecrã 1; FN05, US05): a conta autenticada
 * (`GET /me`) e os projetos onde é Gestor ou Membro (`GET /projects`), cada um
 * com o progresso calculado no servidor sobre todas as tarefas (FN09, PN13).
 */
const account = ref<Account | null>(null)
const projects = ref<ProjectSummary[] | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    const [me, items] = await Promise.all([loadMe(), listMyProjects()])
    account.value = me
    projects.value = items
  } catch (e) {
    // Um 401 já terminou a sessão e voltou ao ecrã de entrada (cliente HTTP).
    if (e instanceof ApiError && e.status === 401) return
    error.value = 'Não foi possível carregar os seus projetos. Tente outra vez.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <main class="page stack">
    <LoadingIndicator v-if="loading" />
    <ErrorMessage v-else-if="error" :message="error" retryable @retry="load" />
    <template v-else-if="account && projects">
      <header>
        <h1>Olá, {{ account.name }}</h1>
        <p class="muted account">
          {{ account.email }}<template v-if="account.isAdmin"> · Permissão de Administrador</template>
        </p>
      </header>

      <section class="stack" aria-labelledby="projects-title">
        <h2 id="projects-title">Os meus projetos</h2>
        <EmptyState
          v-if="projects.length === 0"
          class="card"
          message="Ainda não participa em nenhum projeto."
        />
        <ul v-else class="projects">
          <li v-for="p in projects" :key="p.id" class="card project" data-test="project-card">
            <div class="project-head">
              <RouterLink :to="{ name: 'project', params: { projectId: p.id } }" class="project-name">
                {{ p.name }}
              </RouterLink>
              <span class="muted">{{ PROJECT_ROLE_LABELS[p.myRole] }}</span>
            </div>
            <ProgressIndicator :progress="p.progress" :project-name="p.name" />
            <p v-if="p.status === 'ARCHIVED'" class="muted" data-test="archived">{{ ARCHIVED_LABEL }}</p>
          </li>
        </ul>
      </section>
    </template>
  </main>
</template>

<style scoped>
h1 {
  margin-bottom: 0.25rem;
}
.account {
  overflow-wrap: anywhere;
}
.projects {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 14rem), 1fr));
  gap: 1rem;
}
.project-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
}
.project-name {
  color: var(--color-heading);
  font-weight: 600;
  min-width: 0;
  overflow-wrap: anywhere;
}
</style>
