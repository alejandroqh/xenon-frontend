import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    requiresAuth?: boolean
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    meta: { title: 'Iniciar Sesion', requiresAuth: false },
    component: () => import('@/views/LoginView.vue')
  },
  {
    path: '/',
    name: 'Panel',
    meta: { title: 'Panel de Control', requiresAuth: true },
    component: () => import('@/views/DashboardView.vue')
  },
  {
    path: '/importaciones',
    name: 'Importaciones',
    meta: { title: 'Importaciones', requiresAuth: true },
    component: () => import('@/views/ShipmentsView.vue')
  },
  {
    path: '/productos',
    name: 'Productos',
    meta: { title: 'Productos', requiresAuth: true },
    component: () => import('@/views/ProductosView.vue')
  },
  {
    path: '/inventario',
    name: 'Inventario',
    meta: { title: 'Inventario', requiresAuth: true },
    component: () => import('@/views/InventarioView.vue')
  },
  {
    path: '/clientes',
    name: 'Clientes',
    meta: { title: 'Clientes', requiresAuth: true },
    component: () => import('@/views/ClientesView.vue')
  },
  {
    path: '/rutas',
    name: 'Rutas',
    meta: { title: 'Rutas', requiresAuth: true },
    component: () => import('@/views/RutasView.vue')
  },
  {
    path: '/promociones',
    name: 'Promociones',
    meta: { title: 'Promociones', requiresAuth: true },
    component: () => import('@/views/PromocionesView.vue')
  },
  {
    path: '/reportes',
    name: 'Reportes',
    meta: { title: 'Reportes', requiresAuth: true },
    component: () => import('@/views/ReportesView.vue')
  },
  {
    path: '/estadisticas',
    name: 'Estadisticas',
    meta: { title: 'Estadisticas', requiresAuth: true },
    component: () => import('@/views/EstadisticasView.vue')
  },
  {
    path: '/auditoria',
    name: 'Auditoria',
    meta: { title: 'Auditoria', requiresAuth: true },
    component: () => import('@/views/AuditoriaView.vue')
  },
  {
    path: '/usuarios',
    name: 'Usuarios',
    meta: { title: 'Usuarios', requiresAuth: true },
    component: () => import('@/views/UsuariosView.vue')
  },
  {
    path: '/configuracion',
    name: 'Configuracion',
    meta: { title: 'Configuracion', requiresAuth: true },
    component: () => import('@/views/SettingsView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  // Wait for auth initialization before making routing decisions
  if (!authStore.inicializado) {
    await authStore.inicializar()
  }

  // Redirect unauthenticated users to login
  if (to.meta.requiresAuth !== false && !authStore.estaAutenticado) {
    next({ name: 'Login' })
    return
  }

  // Redirect authenticated users away from login
  if (to.name === 'Login' && authStore.estaAutenticado) {
    next({ name: 'Panel' })
    return
  }

  next()
})

export default router
