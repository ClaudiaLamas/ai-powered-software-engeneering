<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { apiErrorMessage } from '@/api/errors'
import { ApiError } from '@/api/http'
import type { Project, Task, TaskStatus } from '@/api/types'
import { ensureAccount } from '@/auth/auth-api'
import SelectField from '@/components/SelectField.vue'
import TaskForm from '@/components/TaskForm.vue'
import TaskPriorityBadge from '@/components/TaskPriorityBadge.vue'
import TaskStatusBadge from '@/components/TaskStatusBadge.vue'
import { canManageTasks, getProject } from '@/projects/projects-api'
import { TASK_STATUS_LABELS, TASK_STATUS_OPTIONS, assigneeLabel } from '@/tasks/task-labels'
import type { TaskFormValues } from '@/tasks/task-validation'
import { changeTaskStatus, deleteTask, getTask, updateTask } from '@/tasks/tasks-api'

/**
 * Detalhe da tarefa (US19, sem comentários): o Gestor edita o título, a
 * descrição e a prioridade e elimina a tarefa (US06, US22); qualquer membro
 * muda o estado (US07). Num projeto arquivado é só de leitura (CL3).
 */
const route = useRoute()
const router = useRouter()
const taskId = computed(() => String(route.params.taskId))

const task = ref<Task | null>(null)
const project = ref<Project | null>(null)
const accountId = ref<string | undefined>()
const loadError = ref<string | null>(null)

const canManage = computed(() => !!project.value && canManageTasks(project.value, accountId.value))
const canChangeStatus = computed(() => project.value?.status === 'ACTIVE')

const message = ref<string | null>(null)

// Estado (US07)
const statusValue = ref<TaskStatus>('TODO')
const changingStatus = ref(false)
const statusError = ref<string | null>(null)

// Edição (US06, US22)
const editing = ref(false)
const saving = ref(false)
const saveError = ref<unknown>(null)

// Eliminação (US06)
const confirmingDelete = ref(false)
const deleting = ref(false)
const deleteError = ref<string | null>(null)

/**
 * Só uma alteração à tarefa de cada vez: cada resposta substitui a tarefa
 * inteira, e uma resposta que chegasse fora de ordem repunha dados antigos.
 */
const busy = computed(() => changingStatus.value || saving.value || deleting.value)

function isUnauthenticated(e: unknown) {
  // Um 401 já terminou a sessão e voltou ao ecrã de entrada (cliente HTTP).
  return e instanceof ApiError && e.status === 401
}

function showTask(t: Task) {
  task.value = t
  statusValue.value = t.status
}

async function load() {
  task.value = null
  project.value = null
  loadError.value = null
  try {
    const [t, account] = await Promise.all([getTask(taskId.value), ensureAccount()])
    project.value = await getProject(t.projectId)
    accountId.value = account.id
    showTask(t)
  } catch (e) {
    if (isUnauthenticated(e)) return
    loadError.value = apiErrorMessage(e, 'Não foi possível carregar a tarefa.')
  }
}

async function onStatusChange(next: TaskStatus) {
  if (!task.value || next === task.value.status || busy.value) {
    // O seletor volta a mostrar o estado atual.
    statusValue.value = task.value?.status ?? statusValue.value
    return
  }
  statusValue.value = next
  changingStatus.value = true
  statusError.value = null
  message.value = null
  try {
    showTask(await changeTaskStatus(task.value.id, next))
    message.value = `Estado alterado para "${TASK_STATUS_LABELS[next]}".`
  } catch (e) {
    // Se falhar, a tarefa fica como estava.
    statusValue.value = task.value.status
    if (isUnauthenticated(e)) return
    statusError.value = apiErrorMessage(e, 'Não foi possível mudar o estado.')
  } finally {
    changingStatus.value = false
  }
}

function startEditing() {
  editing.value = true
  saveError.value = null
  message.value = null
}

async function save(values: TaskFormValues) {
  if (!task.value || busy.value) return
  saving.value = true
  saveError.value = null
  try {
    showTask(await updateTask(task.value.id, values))
    editing.value = false
    message.value = 'Alterações guardadas.'
  } catch (e) {
    if (isUnauthenticated(e)) return
    // O formulário mantém o que foi escrito.
    saveError.value = e
  } finally {
    saving.value = false
  }
}

function startDeleting() {
  confirmingDelete.value = true
  deleteError.value = null
  message.value = null
}

async function confirmDelete() {
  if (!task.value || busy.value) return
  deleting.value = true
  deleteError.value = null
  const { id, title, projectId } = task.value
  try {
    await deleteTask(id)
    await router.push({
      name: 'project',
      params: { projectId },
      state: { notice: `A tarefa "${title}" foi eliminada.` },
    })
  } catch (e) {
    if (isUnauthenticated(e)) return
    deleteError.value = apiErrorMessage(e, 'Não foi possível eliminar a tarefa.')
  } finally {
    deleting.value = false
  }
}

watch(taskId, load, { immediate: true })
</script>

<template>
  <main class="page stack">
    <p v-if="loadError" role="alert" class="alert">{{ loadError }}</p>
    <p v-else-if="!task || !project" class="muted" role="status">A carregar a tarefa…</p>
    <template v-else>
      <RouterLink :to="{ name: 'project', params: { projectId: project.id } }">
        ← {{ project.name }}
      </RouterLink>
      <p v-if="project.status === 'ARCHIVED'" class="notice">
        Projeto arquivado: a tarefa não pode ser alterada.
      </p>
      <p v-if="message" role="status" class="notice">{{ message }}</p>

      <section v-if="editing" class="card stack" aria-labelledby="edit-task-title">
        <h1 id="edit-task-title">Editar tarefa</h1>
        <TaskForm
          :initial="{
            title: task.title,
            description: task.description ?? '',
            priority: task.priority,
          }"
          submit-label="Guardar"
          submitting-label="A guardar…"
          :submitting="saving"
          :disabled="busy"
          :error="saveError"
          @submit="save"
        >
          <template #actions>
            <button type="button" class="btn" :disabled="saving" @click="editing = false">
              Cancelar
            </button>
          </template>
        </TaskForm>
      </section>

      <section v-else class="stack" aria-label="Tarefa">
        <h1>{{ task.title }}</h1>
        <p class="task-meta">
          <TaskStatusBadge :status="task.status" />
          <TaskPriorityBadge :priority="task.priority" />
        </p>
        <dl class="task-details">
          <dt>Responsável</dt>
          <dd>{{ assigneeLabel(task.assignee) }}</dd>
          <dt>Descrição</dt>
          <dd class="task-description">{{ task.description ?? 'Sem descrição' }}</dd>
        </dl>
        <div v-if="canManage" class="actions">
          <button type="button" class="btn" @click="startEditing">Editar</button>
          <button
            v-if="!confirmingDelete"
            type="button"
            class="btn btn-danger"
            @click="startDeleting"
          >
            Eliminar
          </button>
        </div>
        <div
          v-if="canManage && confirmingDelete"
          role="alertdialog"
          aria-labelledby="delete-question"
          class="card stack"
        >
          <p id="delete-question">
            Eliminar a tarefa "{{ task.title }}"? Os comentários são eliminados com ela e não é
            possível desfazer.
          </p>
          <p v-if="deleteError" role="alert" class="alert">{{ deleteError }}</p>
          <div class="actions">
            <button type="button" class="btn btn-danger" :disabled="busy" @click="confirmDelete">
              {{ deleting ? 'A eliminar…' : 'Sim, eliminar' }}
            </button>
            <button type="button" class="btn" :disabled="deleting" @click="confirmingDelete = false">
              Cancelar
            </button>
          </div>
        </div>
      </section>

      <section class="card stack" aria-label="Estado da tarefa">
        <SelectField
          :model-value="statusValue"
          label="Estado"
          :options="TASK_STATUS_OPTIONS"
          :disabled="!canChangeStatus || busy"
          :error="statusError"
          @update:model-value="onStatusChange"
        />
        <p v-if="changingStatus" class="muted" role="status">A mudar o estado…</p>
      </section>
    </template>
  </main>
</template>
