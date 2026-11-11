<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { apiErrorMessage } from '@/api/errors'
import { ApiError } from '@/api/http'
import type { Project, Task, TaskCountsByStatus, TaskPriority, TaskStatus } from '@/api/types'
import { ensureAccount } from '@/auth/auth-api'
import SelectField from '@/components/SelectField.vue'
import TaskForm from '@/components/TaskForm.vue'
import TaskGroup from '@/components/TaskGroup.vue'
import { canManageTasks, getProject } from '@/projects/projects-api'
import {
  COUNT_KEY,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  TASK_STATUS_OPTIONS,
} from '@/tasks/task-labels'
import type { TaskFormValues } from '@/tasks/task-validation'
import { createTask, listProjectTasks } from '@/tasks/tasks-api'

/**
 * Projeto (wireframe, ecrã 2): dados do projeto e tarefas em três grupos por
 * estado, cada um com o seu pedido, o total real e "Ver mais" (US08, US23).
 * O Gestor cria tarefas aqui (US06, US22).
 */
const PAGE_SIZE = 20

const route = useRoute()
const projectId = computed(() => String(route.params.projectId))

const project = ref<Project | null>(null)
const projectError = ref<string | null>(null)
const accountId = ref<string | undefined>()
const canManage = computed(() => !!project.value && canManageTasks(project.value, accountId.value))

// Filtros (US23): '' = todos.
const statusFilter = ref<TaskStatus | ''>('')
const priorityFilter = ref<TaskPriority | ''>('')
const statusFilterOptions = [{ value: '' as const, label: 'Todos' }, ...TASK_STATUS_OPTIONS]
const priorityFilterOptions = [{ value: '' as const, label: 'Todas' }, ...TASK_PRIORITY_OPTIONS]
const visibleStatuses = computed(() =>
  statusFilter.value ? [statusFilter.value] : [...TASK_STATUSES],
)

interface GroupState {
  items: Task[]
  /** Páginas já carregadas. */
  pages: number
  loading: boolean
  error: string | null
  /** Identifica o pedido mais recente, para ignorar respostas antigas. */
  request: number
}

const groups = reactive(
  Object.fromEntries(
    TASK_STATUSES.map((s) => [s, { items: [], pages: 0, loading: false, error: null, request: 0 }]),
  ) as unknown as Record<TaskStatus, GroupState>,
)
/** Totais reais por estado, da última resposta da API (`countsByStatus`). */
const counts = ref<TaskCountsByStatus | null>(null)

const createdMessage = ref<string | null>(null)
const creating = ref(false)
const createError = ref<unknown>(null)
const taskForm = ref<InstanceType<typeof TaskForm> | null>(null)

// Aviso deixado pelo detalhe da tarefa depois de a eliminar.
const notice = ref<string | null>(
  typeof history.state?.notice === 'string' ? history.state.notice : null,
)

function query(status: TaskStatus, page: number) {
  return {
    status,
    priority: priorityFilter.value || undefined,
    page,
    pageSize: PAGE_SIZE,
  }
}

/**
 * (Re)carrega um grupo desde a primeira página até `pages`, para manter as
 * tarefas que já estavam à vista depois de uma alteração.
 */
async function loadGroup(status: TaskStatus, pages = 1) {
  const group = groups[status]
  const request = ++group.request
  group.loading = true
  group.error = null
  try {
    const results = await Promise.all(
      Array.from({ length: pages }, (_, i) => listProjectTasks(projectId.value, query(status, i + 1))),
    )
    if (request !== group.request) return
    group.items = results.flatMap((r) => r.items)
    group.pages = pages
    counts.value = results[results.length - 1]!.countsByStatus
  } catch (e) {
    if (request !== group.request || isUnauthenticated(e)) return
    group.error = apiErrorMessage(e, 'Não foi possível carregar as tarefas.')
  } finally {
    if (request === group.request) group.loading = false
  }
}

/** "Ver mais": junta a página seguinte às que já estão à vista. */
async function loadMore(status: TaskStatus) {
  const group = groups[status]
  const request = ++group.request
  group.loading = true
  group.error = null
  try {
    const page = await listProjectTasks(projectId.value, query(status, group.pages + 1))
    if (request !== group.request) return
    group.items = [...group.items, ...page.items]
    group.pages += 1
    counts.value = page.countsByStatus
  } catch (e) {
    if (request !== group.request || isUnauthenticated(e)) return
    group.error = apiErrorMessage(e, 'Não foi possível carregar mais tarefas.')
  } finally {
    if (request === group.request) group.loading = false
  }
}

/**
 * Invalida os pedidos em curso de todos os grupos, incluindo os que o filtro
 * de estado escondeu, para que uma resposta antiga (de outros filtros ou de
 * outro projeto) não substitua as tarefas nem as contagens. Com `clear`,
 * esvazia também as tarefas já carregadas, que deixaram de corresponder ao
 * projeto ou aos filtros.
 */
function invalidateGroups(clear: boolean) {
  for (const status of TASK_STATUSES) {
    const group = groups[status]
    group.request += 1
    group.loading = false
    if (clear) {
      group.items = []
      group.pages = 0
      group.error = null
    }
  }
}

/**
 * Pede os grupos visíveis. Com `keepPages` (depois de criar uma tarefa no
 * mesmo projeto e com os mesmos filtros), volta a pedir as páginas que já
 * estavam à vista; sem ele, começa do zero.
 */
function loadGroups(keepPages = false) {
  invalidateGroups(!keepPages)
  return Promise.all(
    visibleStatuses.value.map((s) => loadGroup(s, keepPages ? Math.max(groups[s].pages, 1) : 1)),
  )
}

function isUnauthenticated(e: unknown) {
  // Um 401 já terminou a sessão e voltou ao ecrã de entrada (cliente HTTP).
  return e instanceof ApiError && e.status === 401
}

/** Identifica o carregamento mais recente do projeto, para ignorar o de uma rota anterior. */
let projectLoad = 0

async function loadProject() {
  const load = ++projectLoad
  project.value = null
  projectError.value = null
  counts.value = null
  invalidateGroups(true)
  try {
    const [p, account] = await Promise.all([getProject(projectId.value), ensureAccount()])
    if (load !== projectLoad) return
    project.value = p
    accountId.value = account.id
    await loadGroups()
  } catch (e) {
    if (load !== projectLoad || isUnauthenticated(e)) return
    projectError.value = apiErrorMessage(e, 'Não foi possível carregar o projeto.')
  }
}

async function submitTask(values: TaskFormValues) {
  creating.value = true
  createError.value = null
  createdMessage.value = null
  notice.value = null
  try {
    const task = await createTask(projectId.value, values)
    createdMessage.value = `Tarefa "${task.title}" criada.`
    taskForm.value?.reset()
    // As contagens e os grupos vêm das respostas da API, sem recarregar a página.
    await loadGroups(true)
  } catch (e) {
    if (isUnauthenticated(e)) return
    createError.value = e
  } finally {
    creating.value = false
  }
}

watch([statusFilter, priorityFilter], () => {
  if (project.value) void loadGroups()
})
watch(projectId, loadProject, { immediate: true })
</script>

<template>
  <main class="page stack">
    <p v-if="projectError" role="alert" class="alert">{{ projectError }}</p>
    <p v-else-if="!project" class="muted" role="status">A carregar o projeto…</p>
    <template v-else>
      <header class="stack project-header">
        <h1>{{ project.name }}</h1>
        <p v-if="project.status === 'ARCHIVED'" class="notice">
          Projeto arquivado: as tarefas não podem ser alteradas.
        </p>
        <p v-if="project.description" class="project-description">{{ project.description }}</p>
        <p class="muted">Gestor: {{ project.manager.name }}</p>
        <p v-if="counts" class="task-counts" aria-label="Tarefas por estado">
          <template v-for="(status, i) in TASK_STATUSES" :key="status">
            {{ i > 0 ? ', ' : '' }}{{ TASK_STATUS_LABELS[status] }}: {{ counts[COUNT_KEY[status]] }}
          </template>
        </p>
      </header>

      <p v-if="notice" role="status" class="notice">{{ notice }}</p>

      <section v-if="canManage" class="card stack" aria-labelledby="new-task-title">
        <h2 id="new-task-title">Nova tarefa</h2>
        <p v-if="createdMessage" role="status" class="notice">{{ createdMessage }}</p>
        <TaskForm
          ref="taskForm"
          submit-label="Criar tarefa"
          submitting-label="A criar…"
          :submitting="creating"
          :error="createError"
          @submit="submitTask"
        />
      </section>

      <div class="filters" role="group" aria-label="Filtros">
        <SelectField v-model="statusFilter" label="Estado" :options="statusFilterOptions" />
        <SelectField v-model="priorityFilter" label="Prioridade" :options="priorityFilterOptions" />
      </div>

      <div class="task-groups">
        <TaskGroup
          v-for="status in visibleStatuses"
          :key="status"
          :status="status"
          :tasks="groups[status].items"
          :total="counts ? counts[COUNT_KEY[status]] : 0"
          :loading="groups[status].loading"
          :error="groups[status].error"
          @more="loadMore(status)"
          @retry="loadGroup(status, Math.max(groups[status].pages, 1))"
        />
      </div>
    </template>
  </main>
</template>
