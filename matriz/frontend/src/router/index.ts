import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import { authGuard } from './guard'

export const routes: RouteRecordRaw[] = [
  {
    path: '/entrar',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    name: 'home',
    // Ecrã inicial (wireframe, ecrã 1; US05).
    component: DashboardView,
  },
  {
    path: '/projetos/:projectId',
    name: 'project',
    component: () => import('../views/ProjectView.vue'),
  },
  {
    path: '/tarefas/:taskId',
    name: 'task',
    component: () => import('../views/TaskDetailView.vue'),
  },
  {
    // Qualquer outro endereço. Não é pública: sem sessão, vai para a entrada.
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFoundView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to) => authGuard(to))

export default router
