<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ApiError } from '@/api/http'
import type { Account, ProjectSummary } from '@/api/types'
import { loadMe } from '@/auth/auth-api'
import { listMyProjects } from '@/projects/projects-api'
import {
  ARCHIVED_LABEL,
  PROJECT_ROLE_LABELS,
  progressCountsLabel,
  progressPercentLabel,
} from '@/projects/project-labels'

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
    <p v-if="loading" class="muted" role="status">A carregar…</p>
    <div v-else-if="error" class="stack">
      <p role="alert" class="alert">{{ error }}</p>
      <p><button type="button" class="btn" @click="load">Tentar outra vez</button></p>
    </div>
    <template v-else-if="account && projects">
      <header>
        <h1>Olá, {{ account.name }}</h1>
        <p class="muted account">
          {{ account.email }}<template v-if="account.isAdmin"> · Permissão de Administrador</template>
        </p>
      </header>

      <section class="stack" aria-labelledby="projects-title">
        <h2 id="projects-title">Os meus projetos</h2>
        <p v-if="projects.length === 0" class="card muted empty">Ainda não tens projetos.</p>
        <ul v-else class="projects">
          <li v-for="p in projects" :key="p.id" class="card project" data-test="project-card">
            <div class="project-head">
              <RouterLink :to="{ name: 'project', params: { projectId: p.id } }" class="project-name">
                {{ p.name }}
              </RouterLink>
              <span class="muted">{{ PROJECT_ROLE_LABELS[p.myRole] }}</span>
            </div>
            <div
              v-if="p.progress.total > 0"
              class="bar"
              role="progressbar"
              :aria-label="`Progresso de ${p.name}`"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-valuenow="p.progress.percentDone ?? 0"
            >
              <i :style="{ width: `${p.progress.percentDone ?? 0}%` }" />
            </div>
            <div v-else class="bar" aria-hidden="true" />
            <p class="muted" data-test="progress-percent">{{ progressPercentLabel(p.progress) }}</p>
            <p v-if="p.progress.total > 0" class="muted" data-test="progress-counts">
              {{ progressCountsLabel(p.progress) }}
            </p>
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
h2 {
  font-size: 1.25rem;
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
.project p {
  margin: 0;
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
.bar {
  height: 0.5rem;
  margin: 0.5rem 0;
  border: 1px solid var(--color-border);
  border-radius: 2px;
  overflow: hidden;
}
.bar i {
  display: block;
  height: 100%;
  background: var(--color-accent);
}
</style>
