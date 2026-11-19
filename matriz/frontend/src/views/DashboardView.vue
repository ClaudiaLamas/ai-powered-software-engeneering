<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ApiError } from '@/api/http'
import type { Account, ProjectSummary } from '@/api/types'
import { loadMe } from '@/auth/auth-api'
import { listMyProjects } from '@/projects/projects-api'
import EmptyState from '@/components/EmptyState.vue'
import ErrorMessage from '@/components/ErrorMessage.vue'
import LoadingIndicator from '@/components/LoadingIndicator.vue'
import ProjectCard from '@/components/ProjectCard.vue'
import { TASK_STATUS_LABELS } from '@/tasks/task-labels'

/**
 * Ecrã inicial (wireframe, ecrã 1; FN05, US05): a conta autenticada
 * (`GET /me`) e os projetos onde é Gestor ou Membro (`GET /projects`), cada um
 * com o progresso calculado no servidor sobre todas as tarefas (FN09, PN13).
 * Por cima, um resumo dos projetos ativos (somas do progresso de cada um); os
 * arquivados ficam numa secção à parte, depois dos ativos (implementation-plan
 * §1.1).
 */
const account = ref<Account | null>(null)
const projects = ref<ProjectSummary[] | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const active = computed(() => (projects.value ?? []).filter((p) => p.status === 'ACTIVE'))
const archived = computed(() => (projects.value ?? []).filter((p) => p.status === 'ARCHIVED'))

/** Somas das tarefas dos projetos ativos, com os números que a API devolve. */
const summary = computed(() => {
  const sum = (key: 'todo' | 'inProgress' | 'done') =>
    active.value.reduce((total, p) => total + p.progress[key], 0)
  return [
    { key: 'projects', label: 'Projetos ativos', value: active.value.length },
    { key: 'todo', label: TASK_STATUS_LABELS.TODO, value: sum('todo') },
    { key: 'in_progress', label: TASK_STATUS_LABELS.IN_PROGRESS, value: sum('inProgress') },
    { key: 'done', label: TASK_STATUS_LABELS.DONE, value: sum('done') },
  ]
})

const today = new Intl.DateTimeFormat('pt-PT', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
}).format(new Date())

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
  <main class="page stack dashboard">
    <template v-if="loading">
      <LoadingIndicator />
      <ul class="projects" aria-hidden="true" data-test="skeleton">
        <li v-for="n in 3" :key="n" class="card skeleton-card">
          <span class="skeleton skeleton-title" />
          <span class="skeleton skeleton-bar" />
          <span class="skeleton skeleton-line" />
        </li>
      </ul>
    </template>
    <ErrorMessage v-else-if="error" :message="error" retryable @retry="load" />
    <template v-else-if="account && projects">
      <header class="dashboard-header">
        <p class="muted dashboard-date" data-test="today">{{ today }}</p>
        <h1>Olá, {{ account.name }}</h1>
        <p class="muted account">
          <span>{{ account.email }}</span>
          <span v-if="account.isAdmin" class="badge badge-admin">Permissão de Administrador</span>
        </p>
      </header>

      <section v-if="projects.length > 0" aria-labelledby="summary-title" class="stack summary-section">
        <h2 id="summary-title" class="summary-title">Resumo dos projetos ativos</h2>
        <dl class="summary" data-test="summary">
          <div v-for="item in summary" :key="item.key" class="summary-item" :class="`summary-${item.key}`">
            <dt>{{ item.label }}</dt>
            <dd>{{ item.value }}</dd>
          </div>
        </dl>
      </section>

      <section class="stack" aria-labelledby="projects-title" data-test="active-projects">
        <h2 id="projects-title">Os meus projetos</h2>
        <div v-if="projects.length === 0" class="card empty-projects">
          <EmptyState message="Ainda não participa em nenhum projeto." />
          <p class="muted">Quando for adicionado a um projeto, ele aparece aqui.</p>
        </div>
        <EmptyState
          v-else-if="active.length === 0"
          class="card"
          message="Não tem projetos ativos."
        />
        <ul v-else class="projects">
          <ProjectCard v-for="p in active" :key="p.id" :project="p" />
        </ul>
      </section>

      <section
        v-if="archived.length > 0"
        class="stack"
        aria-labelledby="archived-title"
        data-test="archived-projects"
      >
        <h2 id="archived-title">Arquivados</h2>
        <ul class="projects">
          <ProjectCard v-for="p in archived" :key="p.id" :project="p" />
        </ul>
      </section>
    </template>
  </main>
</template>

<style scoped>
.dashboard {
  gap: var(--space-6);
}
.dashboard-date {
  font-size: var(--font-size-sm);
}
/* Só a primeira letra: "Quinta-feira, 19 de novembro". */
.dashboard-date::first-letter {
  text-transform: uppercase;
}
h1 {
  margin-bottom: var(--space-1);
}
.account {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  overflow-wrap: anywhere;
}
.badge-admin {
  --badge-color: var(--color-status-todo);
}

/* Resumo (D1): quatro números, com a cor de cada estado. */
.summary-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 9rem), 1fr));
  gap: var(--space-3);
}
.summary-item {
  --summary-color: var(--color-border-hover);
  display: flex;
  flex-direction: column-reverse;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-left: 4px solid var(--summary-color);
  border-radius: var(--radius);
  background: var(--color-background-soft);
}
.summary-projects {
  --summary-color: var(--color-accent);
}
.summary-todo {
  --summary-color: var(--color-status-todo);
}
.summary-in_progress {
  --summary-color: var(--color-status-in-progress);
}
.summary-done {
  --summary-color: var(--color-status-done);
}
.summary dt {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.summary dd {
  margin: 0;
  color: var(--color-heading);
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.1;
}

.projects {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr));
  gap: var(--space-4);
}

.empty-projects {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

/* Carregamento (D6): cartões de esqueleto, só decorativos. */
.skeleton-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.skeleton {
  display: block;
  border-radius: var(--radius-sm);
  background: var(--color-background-mute);
  animation: skeleton-pulse 1.4s ease-in-out infinite;
}
.skeleton-title {
  width: 60%;
  height: 1.1rem;
}
.skeleton-bar {
  height: var(--space-2);
}
.skeleton-line {
  width: 40%;
  height: 0.8rem;
}
@keyframes skeleton-pulse {
  50% {
    opacity: 0.45;
  }
}
</style>
