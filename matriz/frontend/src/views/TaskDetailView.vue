<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { apiErrorMessage } from '@/api/errors'
import { ApiError } from '@/api/http'
import type { AccountSummary, Comment, Project, Task, TaskStatus } from '@/api/types'
import { ensureAccount } from '@/auth/auth-api'
import CommentForm from '@/components/CommentForm.vue'
import SelectField from '@/components/SelectField.vue'
import TaskForm from '@/components/TaskForm.vue'
import TaskPriorityBadge from '@/components/TaskPriorityBadge.vue'
import TaskStatusBadge from '@/components/TaskStatusBadge.vue'
import { canManageTasks, getProject } from '@/projects/projects-api'
import {
  NO_ASSIGNEE_LABEL,
  TASK_STATUS_LABELS,
  TASK_STATUS_OPTIONS,
  accountLabel,
  assigneeLabel,
} from '@/tasks/task-labels'
import { formatDateTime } from '@/tasks/comment-validation'
import type { TaskFormValues } from '@/tasks/task-validation'
import {
  addTaskAssignee,
  changeTaskStatus,
  createTaskComment,
  deleteComment,
  deleteTask,
  getTask,
  listAssignableAccounts,
  listTaskComments,
  removeTaskAssignee,
  updateComment,
  updateTask,
} from '@/tasks/tasks-api'

/**
 * Detalhe da tarefa (US19): o Gestor edita o título, a descrição e a
 * prioridade, atribui e remove responsáveis (DE16) e elimina a tarefa (US06,
 * US22); qualquer membro muda o estado (US07) e comenta, e só o autor edita
 * e apaga cada comentário (US13, PN15). Num projeto arquivado é só de
 * leitura (CL3).
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

// Responsáveis (US06, DE16)
const assignable = ref<AccountSummary[] | undefined>()
const newAssigneeId = ref('')
const assigning = ref(false)
/** Conta a ser removida dos responsáveis, enquanto o pedido está em curso. */
const removingId = ref<string | null>(null)
const assigneeError = ref<string | null>(null)
/** Quem ainda pode ser atribuído: membros ativos que não são já responsáveis. */
const assigneeOptions = computed(() => {
  const current = new Set(task.value?.assignees.map((a) => a.id))
  return [
    { value: '', label: 'Escolher…' },
    ...(assignable.value ?? [])
      .filter((a) => !current.has(a.id))
      .map((a) => ({ value: a.id, label: a.name })),
  ]
})

// Comentários (US13, US19, PN15)
/** `undefined` enquanto carregam. */
const comments = ref<Comment[] | undefined>()
const commentsError = ref<string | null>(null)
const commentMessage = ref<string | null>(null)
/** Num projeto arquivado, os comentários ficam só de leitura (CL3). */
const canComment = computed(() => project.value?.status === 'ACTIVE')
const newCommentForm = ref<InstanceType<typeof CommentForm> | null>(null)
const posting = ref(false)
const postError = ref<string | null>(null)
/** Comentário em edição e o seu pedido. */
const editingCommentId = ref<string | null>(null)
const savingComment = ref(false)
const editCommentError = ref<string | null>(null)
/** Comentário com a confirmação de apagar aberta e o seu pedido. */
const confirmingDeleteCommentId = ref<string | null>(null)
const deletingComment = ref(false)
const deleteCommentError = ref<string | null>(null)
/** Só um pedido de comentários de cada vez. */
const commentBusy = computed(() => posting.value || savingComment.value || deletingComment.value)

/** Só o autor edita e apaga o seu comentário, mesmo que outra pessoa seja Gestor (PN15). */
function isOwnComment(c: Comment) {
  return canComment.value && c.author.id === accountId.value
}

// Eliminação (US06)
const confirmingDelete = ref(false)
const deleting = ref(false)
const deleteError = ref<string | null>(null)

/**
 * Só uma alteração à tarefa de cada vez: cada resposta substitui a tarefa
 * inteira, e uma resposta que chegasse fora de ordem repunha dados antigos.
 */
const busy = computed(
  () =>
    changingStatus.value ||
    saving.value ||
    deleting.value ||
    assigning.value ||
    removingId.value !== null,
)

function isUnauthenticated(e: unknown) {
  // Um 401 já terminou a sessão e voltou ao ecrã de entrada (cliente HTTP).
  return e instanceof ApiError && e.status === 401
}

function showTask(t: Task) {
  task.value = t
  statusValue.value = t.status
}

/**
 * Identifica o carregamento mais recente. Uma resposta de antes de mudar de
 * tarefa (carregamento, estado ou edição) não substitui a tarefa à vista.
 */
let taskLoad = 0

async function load() {
  const current = ++taskLoad
  task.value = null
  project.value = null
  loadError.value = null
  assignable.value = undefined
  assigneeError.value = null
  newAssigneeId.value = ''
  comments.value = undefined
  commentsError.value = null
  commentMessage.value = null
  postError.value = null
  editingCommentId.value = null
  confirmingDeleteCommentId.value = null
  try {
    const [t, account] = await Promise.all([getTask(taskId.value), ensureAccount()])
    const p = await getProject(t.projectId)
    if (current !== taskLoad) return
    project.value = p
    accountId.value = account.id
    showTask(t)
    void loadComments(current, t.id)
    if (canManage.value) void loadAssignable(current, p.id)
  } catch (e) {
    if (current !== taskLoad || isUnauthenticated(e)) return
    loadError.value = apiErrorMessage(e, 'Não foi possível carregar a tarefa.')
  }
}

/** Só para o Gestor: quem pode ser escolhido como responsável. */
async function loadAssignable(load: number, projectId: string) {
  try {
    const accounts = await listAssignableAccounts(projectId)
    if (load === taskLoad) assignable.value = accounts
  } catch (e) {
    if (load !== taskLoad || isUnauthenticated(e)) return
    assigneeError.value = apiErrorMessage(e, 'Não foi possível carregar quem pode ser responsável.')
  }
}

async function loadComments(load: number, id: string) {
  try {
    const items = await listTaskComments(id)
    if (load === taskLoad) comments.value = items
  } catch (e) {
    if (load !== taskLoad || isUnauthenticated(e)) return
    commentsError.value = apiErrorMessage(e, 'Não foi possível carregar os comentários.')
  }
}

/** Publica o comentário e junta-o ao fim da lista com a resposta da API. */
async function addComment(body: string) {
  if (!task.value || commentBusy.value) return
  posting.value = true
  postError.value = null
  commentMessage.value = null
  const load = taskLoad
  try {
    const created = await createTaskComment(task.value.id, body)
    if (load !== taskLoad) return
    comments.value = [...(comments.value ?? []), created]
    newCommentForm.value?.reset()
    commentMessage.value = 'Comentário publicado.'
  } catch (e) {
    if (load !== taskLoad || isUnauthenticated(e)) return
    // O texto escrito fica no campo para tentar outra vez.
    postError.value = apiErrorMessage(e, 'Não foi possível publicar o comentário.')
  } finally {
    posting.value = false
  }
}

function startEditingComment(id: string) {
  editingCommentId.value = id
  editCommentError.value = null
  confirmingDeleteCommentId.value = null
  commentMessage.value = null
}

/** Guarda o texto editado e substitui o comentário pela resposta da API (com `editedAt`). */
async function saveComment(id: string, body: string) {
  if (commentBusy.value) return
  savingComment.value = true
  editCommentError.value = null
  const load = taskLoad
  try {
    const updated = await updateComment(id, body)
    if (load !== taskLoad) return
    comments.value = (comments.value ?? []).map((c) => (c.id === id ? updated : c))
    editingCommentId.value = null
    commentMessage.value = 'Comentário editado.'
  } catch (e) {
    if (load !== taskLoad || isUnauthenticated(e)) return
    // O formulário mantém o texto editado.
    editCommentError.value = apiErrorMessage(e, 'Não foi possível editar o comentário.')
  } finally {
    savingComment.value = false
  }
}

function startDeletingComment(id: string) {
  confirmingDeleteCommentId.value = id
  deleteCommentError.value = null
  editingCommentId.value = null
  commentMessage.value = null
}

async function confirmDeleteComment(id: string) {
  if (commentBusy.value) return
  deletingComment.value = true
  deleteCommentError.value = null
  const load = taskLoad
  try {
    await deleteComment(id)
    if (load !== taskLoad) return
    // A resposta é 204: tira o comentário da lista à vista.
    comments.value = (comments.value ?? []).filter((c) => c.id !== id)
    confirmingDeleteCommentId.value = null
    commentMessage.value = 'Comentário apagado.'
  } catch (e) {
    if (load !== taskLoad || isUnauthenticated(e)) return
    deleteCommentError.value = apiErrorMessage(e, 'Não foi possível apagar o comentário.')
  } finally {
    deletingComment.value = false
  }
}

async function addAssignee() {
  if (!task.value || !newAssigneeId.value || busy.value) return
  const id = newAssigneeId.value
  const name = assignable.value?.find((a) => a.id === id)?.name ?? ''
  assigning.value = true
  assigneeError.value = null
  message.value = null
  const load = taskLoad
  try {
    const updated = await addTaskAssignee(task.value.id, id)
    if (load !== taskLoad) return
    showTask(updated)
    newAssigneeId.value = ''
    message.value = `${name} passou a responsável.`
  } catch (e) {
    if (load !== taskLoad || isUnauthenticated(e)) return
    assigneeError.value = apiErrorMessage(e, 'Não foi possível atribuir o responsável.')
  } finally {
    assigning.value = false
  }
}

async function removeAssignee(id: string, name: string) {
  if (!task.value || busy.value) return
  removingId.value = id
  assigneeError.value = null
  message.value = null
  const load = taskLoad
  try {
    await removeTaskAssignee(task.value.id, id)
    if (load !== taskLoad) return
    // A resposta é 204: tira a pessoa da lista à vista.
    task.value = { ...task.value, assignees: task.value.assignees.filter((a) => a.id !== id) }
    message.value = `${name} deixou de ser responsável.`
  } catch (e) {
    if (load !== taskLoad || isUnauthenticated(e)) return
    assigneeError.value = apiErrorMessage(e, 'Não foi possível remover o responsável.')
  } finally {
    removingId.value = null
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
  const load = taskLoad
  try {
    const changed = await changeTaskStatus(task.value.id, next)
    if (load !== taskLoad) return
    showTask(changed)
    message.value = `Estado alterado para "${TASK_STATUS_LABELS[next]}".`
  } catch (e) {
    if (load !== taskLoad || !task.value) return
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
  const load = taskLoad
  try {
    const updated = await updateTask(task.value.id, values)
    if (load !== taskLoad) return
    showTask(updated)
    editing.value = false
    message.value = 'Alterações guardadas.'
  } catch (e) {
    if (load !== taskLoad || isUnauthenticated(e)) return
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
          <dt id="assignees-title">Responsáveis</dt>
          <dd>
            <span v-if="task.assignees.length === 0">{{ NO_ASSIGNEE_LABEL }}</span>
            <ul v-else class="assignee-list" aria-labelledby="assignees-title">
              <li v-for="assignee in task.assignees" :key="assignee.id">
                {{ assigneeLabel(assignee) }}
                <button
                  v-if="canManage"
                  type="button"
                  class="btn"
                  :disabled="busy"
                  :aria-label="`Remover ${assignee.name} dos responsáveis`"
                  @click="removeAssignee(assignee.id, assignee.name)"
                >
                  {{ removingId === assignee.id ? 'A remover…' : 'Remover' }}
                </button>
              </li>
            </ul>
          </dd>
          <dt>Descrição</dt>
          <dd class="task-description">{{ task.description ?? 'Sem descrição' }}</dd>
        </dl>
        <p v-if="assigneeError" role="alert" class="alert">{{ assigneeError }}</p>
        <p v-else-if="canManage && !assignable" class="muted" role="status">
          A carregar quem pode ser responsável…
        </p>
        <p v-else-if="canManage && assigneeOptions.length === 1" class="muted">
          Não há mais membros do projeto que possam ser responsáveis.
        </p>
        <form
          v-if="canManage && assignable && assigneeOptions.length > 1"
          class="assignee-add"
          aria-label="Atribuir responsável"
          @submit.prevent="addAssignee"
        >
          <SelectField
            v-model="newAssigneeId"
            label="Atribuir responsável"
            :options="assigneeOptions"
            :disabled="busy"
          />
          <button type="submit" class="btn" :disabled="busy || !newAssigneeId">
            {{ assigning ? 'A atribuir…' : 'Atribuir' }}
          </button>
        </form>
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

      <section class="card stack" aria-labelledby="comments-title">
        <h2 id="comments-title">Comentários</h2>
        <p v-if="commentsError" role="alert" class="alert">{{ commentsError }}</p>
        <p v-else-if="!comments" class="muted" role="status">A carregar os comentários…</p>
        <p v-else-if="comments.length === 0" class="muted">Ainda não há comentários.</p>
        <ol v-else class="comment-list" aria-labelledby="comments-title">
          <li v-for="comment in comments" :key="comment.id" class="stack">
            <p class="comment-meta">
              <strong>{{ accountLabel(comment.author) }}</strong>
              ·
              <time :datetime="comment.createdAt">{{ formatDateTime(comment.createdAt) }}</time>
              <span v-if="comment.editedAt" class="muted"> (editado)</span>
            </p>
            <CommentForm
              v-if="editingCommentId === comment.id"
              label="Editar comentário"
              :initial="comment.body"
              submit-label="Guardar"
              submitting-label="A guardar…"
              :submitting="savingComment"
              :disabled="commentBusy"
              :error="editCommentError"
              @submit="(body) => saveComment(comment.id, body)"
            >
              <template #actions>
                <button
                  type="button"
                  class="btn"
                  :disabled="savingComment"
                  @click="editingCommentId = null"
                >
                  Cancelar
                </button>
              </template>
            </CommentForm>
            <template v-else>
              <p class="comment-body">{{ comment.body }}</p>
              <div
                v-if="isOwnComment(comment) && confirmingDeleteCommentId === comment.id"
                role="alertdialog"
                :aria-labelledby="`delete-comment-${comment.id}`"
                class="stack"
              >
                <p :id="`delete-comment-${comment.id}`">
                  Apagar este comentário? Não é possível desfazer.
                </p>
                <p v-if="deleteCommentError" role="alert" class="alert">{{ deleteCommentError }}</p>
                <div class="actions">
                  <button
                    type="button"
                    class="btn btn-danger"
                    :disabled="commentBusy"
                    @click="confirmDeleteComment(comment.id)"
                  >
                    {{ deletingComment ? 'A apagar…' : 'Sim, apagar' }}
                  </button>
                  <button
                    type="button"
                    class="btn"
                    :disabled="deletingComment"
                    @click="confirmingDeleteCommentId = null"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
              <div v-else-if="isOwnComment(comment)" class="actions">
                <button
                  type="button"
                  class="btn"
                  :disabled="commentBusy"
                  aria-label="Editar o meu comentário"
                  @click="startEditingComment(comment.id)"
                >
                  Editar
                </button>
                <button
                  type="button"
                  class="btn btn-danger"
                  :disabled="commentBusy"
                  aria-label="Apagar o meu comentário"
                  @click="startDeletingComment(comment.id)"
                >
                  Apagar
                </button>
              </div>
            </template>
          </li>
        </ol>
        <p v-if="commentMessage" role="status" class="notice">{{ commentMessage }}</p>
        <CommentForm
          v-if="canComment && comments"
          ref="newCommentForm"
          label="Novo comentário"
          submit-label="Comentar"
          submitting-label="A publicar…"
          :submitting="posting"
          :disabled="commentBusy"
          :error="postError"
          @submit="addComment"
        />
      </section>
    </template>
  </main>
</template>
