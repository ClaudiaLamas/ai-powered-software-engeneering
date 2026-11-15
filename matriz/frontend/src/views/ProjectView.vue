<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { apiErrorMessage } from '@/api/errors'
import { ApiError } from '@/api/http'
import type {
  AccountSummary,
  Project,
  Task,
  TaskCountsByStatus,
  TaskPriority,
  TaskStatus,
} from '@/api/types'
import { ensureAccount } from '@/auth/auth-api'
import AppBreadcrumbs from '@/components/AppBreadcrumbs.vue'
import AppButton from '@/components/AppButton.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ErrorMessage from '@/components/ErrorMessage.vue'
import LoadingIndicator from '@/components/LoadingIndicator.vue'
import ProgressIndicator from '@/components/ProgressIndicator.vue'
import ProjectForm from '@/components/ProjectForm.vue'
import ProjectStatusBadge from '@/components/ProjectStatusBadge.vue'
import SelectField from '@/components/SelectField.vue'
import TaskForm from '@/components/TaskForm.vue'
import TaskGroup from '@/components/TaskGroup.vue'
import { PROJECT_ROLE_LABELS } from '@/projects/project-labels'
import type { ProjectFormValues } from '@/projects/project-validation'
import { archiveProject, canManageTasks, getProject, updateProject } from '@/projects/projects-api'
import {
  COUNT_KEY,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  TASK_STATUS_OPTIONS,
  accountLabel,
} from '@/tasks/task-labels'
import type { TaskFormValues } from '@/tasks/task-validation'
import {
  changeTaskStatus,
  createTask,
  listAssignableAccounts,
  listProjectTasks,
} from '@/tasks/tasks-api'

/**
 * Projeto (wireframe, ecrã 2): nome, descrição, estado, Gestor, equipa e
 * progresso de todas as tarefas (US09, US18); tarefas em três grupos por
 * estado, cada um com o seu pedido, o total real e "Ver mais" (US08, US23),
 * com o seletor de estado em cada cartão (US07). O Gestor cria tarefas aqui
 * (US06, US22), já com os responsáveis (DE16), e edita e arquiva o projeto
 * (US10). Num projeto arquivado é tudo só de leitura (CL3).
 */
const PAGE_SIZE = 20

const route = useRoute()
const projectId = computed(() => String(route.params.projectId))

const project = ref<Project | null>(null)
const projectError = ref<string | null>(null)
const accountId = ref<string | undefined>()
const canManage = computed(() => !!project.value && canManageTasks(project.value, accountId.value))
/** Qualquer membro muda o estado das tarefas num projeto ativo (US07, PN09). */
const canChangeStatus = computed(() => project.value?.status === 'ACTIVE')

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
/** Quem o Gestor pode escolher como responsável; `undefined` até carregar (ou se falhar). */
const assignable = ref<AccountSummary[] | undefined>()
const assignableError = ref<string | null>(null)

// Mudança de estado a partir dos cartões (US07).
const changingStatus = ref(false)
const statusError = ref<string | null>(null)
/** Muda quando uma mudança falha, para os seletores voltarem a mostrar o estado real. */
const statusRevision = ref(0)

// Edição e arquivo do projeto (US10)
const editingProject = ref(false)
const savingProject = ref(false)
const saveProjectError = ref<unknown>(null)
const confirmingArchive = ref(false)
const archiving = ref(false)
const archiveError = ref<string | null>(null)
const archiveQuestion = computed(
  () =>
    `Arquivar o projeto "${project.value?.name}"? Passa a ser só de leitura: ` +
    'ninguém poderá alterar as tarefas, os comentários nem a equipa.',
)

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
/**
 * Muda a cada refresh do projeto e a cada edição ou arquivo bem-sucedidos.
 * Uma resposta de refresh só substitui o projeto se ainda for a mais recente,
 * para não repor dados de antes de uma edição ou de um arquivo.
 */
let projectRevision = 0

async function loadProject() {
  const load = ++projectLoad
  project.value = null
  projectError.value = null
  statusError.value = null
  editingProject.value = false
  confirmingArchive.value = false
  counts.value = null
  assignable.value = undefined
  assignableError.value = null
  invalidateGroups(true)
  try {
    const [p, account] = await Promise.all([getProject(projectId.value), ensureAccount()])
    if (load !== projectLoad) return
    project.value = p
    accountId.value = account.id
    if (canManage.value) void loadAssignable(load)
    await loadGroups()
  } catch (e) {
    if (load !== projectLoad || isUnauthenticated(e)) return
    projectError.value = apiErrorMessage(e, 'Não foi possível carregar o projeto.')
  }
}

/**
 * Volta a pedir o projeto, sem esconder o ecrã, para o indicador de progresso
 * (de todas as tarefas, PN13) mostrar as contagens depois de uma alteração.
 * Se falhar, fica o que estava à vista.
 */
async function refreshProject() {
  const load = projectLoad
  const revision = ++projectRevision
  try {
    const p = await getProject(projectId.value)
    if (load === projectLoad && revision === projectRevision) project.value = p
  } catch {
    // O próximo carregamento volta a tentar.
  }
}

/** Só para o Gestor: sem esta lista, o formulário cria a tarefa sem responsáveis. */
async function loadAssignable(load: number) {
  try {
    const accounts = await listAssignableAccounts(projectId.value)
    if (load === projectLoad) assignable.value = accounts
  } catch (e) {
    if (load !== projectLoad || isUnauthenticated(e)) return
    assignableError.value = apiErrorMessage(e, 'Não foi possível carregar quem pode ser responsável.')
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
    await Promise.all([loadGroups(true), refreshProject()])
  } catch (e) {
    if (isUnauthenticated(e)) return
    createError.value = e
  } finally {
    creating.value = false
  }
}

/** Seletor de estado de um cartão (US07): recarrega os grupos e o progresso. */
async function onChangeStatus(task: Task, next: TaskStatus) {
  if (next === task.status || changingStatus.value) return
  changingStatus.value = true
  statusError.value = null
  notice.value = null
  createdMessage.value = null
  const load = projectLoad
  try {
    await changeTaskStatus(task.id, next)
    if (load !== projectLoad) return
    notice.value = `Estado de "${task.title}" alterado para "${TASK_STATUS_LABELS[next]}".`
    await Promise.all([loadGroups(true), refreshProject()])
  } catch (e) {
    if (load !== projectLoad || isUnauthenticated(e)) return
    statusRevision.value += 1
    statusError.value = apiErrorMessage(e, 'Não foi possível mudar o estado.')
  } finally {
    changingStatus.value = false
  }
}

function startEditingProject() {
  editingProject.value = true
  confirmingArchive.value = false
  saveProjectError.value = null
  notice.value = null
}

async function saveProject(values: ProjectFormValues) {
  if (savingProject.value) return
  savingProject.value = true
  saveProjectError.value = null
  const load = projectLoad
  try {
    const updated = await updateProject(projectId.value, values)
    if (load !== projectLoad) return
    projectRevision += 1
    project.value = updated
    editingProject.value = false
    notice.value = 'Alterações ao projeto guardadas.'
  } catch (e) {
    if (load !== projectLoad || isUnauthenticated(e)) return
    // O formulário mantém o que foi escrito.
    saveProjectError.value = e
  } finally {
    savingProject.value = false
  }
}

function startArchiving() {
  confirmingArchive.value = true
  editingProject.value = false
  archiveError.value = null
  notice.value = null
}

async function confirmArchive() {
  if (archiving.value) return
  archiving.value = true
  archiveError.value = null
  const load = projectLoad
  try {
    const archived = await archiveProject(projectId.value)
    if (load !== projectLoad) return
    projectRevision += 1
    project.value = archived
    confirmingArchive.value = false
    createdMessage.value = null
    notice.value = 'O projeto foi arquivado e ficou só de leitura.'
  } catch (e) {
    if (load !== projectLoad || isUnauthenticated(e)) return
    archiveError.value = apiErrorMessage(e, 'Não foi possível arquivar o projeto.')
  } finally {
    archiving.value = false
  }
}

watch([statusFilter, priorityFilter], () => {
  if (project.value) void loadGroups()
})
watch(projectId, loadProject, { immediate: true })
</script>

<template>
  <main class="page stack">
    <ErrorMessage v-if="projectError" :message="projectError" />
    <LoadingIndicator v-else-if="!project" label="A carregar o projeto…" />
    <template v-else>
      <AppBreadcrumbs :items="[{ label: 'Painel', to: '/' }, { label: project.name }]" />

      <header class="stack project-header">
        <div class="title-row">
          <h1>{{ project.name }}</h1>
          <ProjectStatusBadge :status="project.status" />
        </div>
        <p v-if="project.status === 'ARCHIVED'" class="notice">
          Projeto arquivado: as tarefas não podem ser alteradas.
        </p>
        <p v-if="project.description" class="project-description">{{ project.description }}</p>
        <p class="muted">Gestor: {{ accountLabel(project.manager) }}</p>
        <ProgressIndicator :progress="project.progress" :project-name="project.name" />
        <div v-if="canManage && !editingProject && !confirmingArchive" class="actions">
          <AppButton @click="startEditingProject">Editar projeto</AppButton>
          <AppButton variant="danger" @click="startArchiving">Arquivar projeto</AppButton>
        </div>
        <ConfirmDialog
          v-if="canManage && confirmingArchive"
          class="card"
          :question="archiveQuestion"
          confirm-label="Sim, arquivar"
          busy-label="A arquivar…"
          :busy="archiving"
          :error="archiveError"
          @confirm="confirmArchive"
          @cancel="confirmingArchive = false"
        />
      </header>

      <section v-if="canManage && editingProject" class="card stack" aria-labelledby="edit-project-title">
        <h2 id="edit-project-title">Editar projeto</h2>
        <ProjectForm
          :initial="{ name: project.name, description: project.description ?? '' }"
          :submitting="savingProject"
          :error="saveProjectError"
          @submit="saveProject"
          @cancel="editingProject = false"
        />
      </section>

      <p v-if="notice" role="status" class="notice">{{ notice }}</p>
      <ErrorMessage v-if="statusError" :message="statusError" />

      <details class="card team">
        <summary>Membros ({{ project.members.length }})</summary>
        <ul class="member-list" aria-label="Membros do projeto">
          <li v-for="member in project.members" :key="member.account.id">
            <span>{{ accountLabel(member.account) }}</span>
            <span class="muted">{{ PROJECT_ROLE_LABELS[member.role] }}</span>
          </li>
        </ul>
      </details>

      <section v-if="canManage" class="card stack" aria-labelledby="new-task-title">
        <h2 id="new-task-title">Nova tarefa</h2>
        <p v-if="createdMessage" role="status" class="notice">{{ createdMessage }}</p>
        <ErrorMessage v-if="assignableError" :message="assignableError" />
        <TaskForm
          ref="taskForm"
          submit-label="Criar tarefa"
          submitting-label="A criar…"
          :submitting="creating"
          :error="createError"
          :assignable-accounts="assignable"
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
          :can-change-status="canChangeStatus"
          :changing-status="changingStatus"
          :revision="statusRevision"
          @more="loadMore(status)"
          @retry="loadGroup(status, Math.max(groups[status].pages, 1))"
          @change-status="onChangeStatus"
        />
      </div>
    </template>
  </main>
</template>
