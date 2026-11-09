import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
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
      // Provisório: o DashboardView (ecrã 1 do wireframe) chega com os projetos.
      component: HomeView,
    },
  ],
})

router.beforeEach((to) => authGuard(to))

export default router
