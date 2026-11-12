import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import { authGuard } from './guard'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
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
  ],
})

router.beforeEach((to) => authGuard(to))

export default router
