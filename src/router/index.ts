import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Panel',
    meta: { title: 'Panel de Control' },
    component: () => import('@/views/DashboardView.vue')
  },
  {
    path: '/envios',
    name: 'Envíos',
    meta: { title: 'Gestión de Envíos' },
    component: () => import('@/views/ShipmentsView.vue')
  },
  {
    path: '/configuracion',
    name: 'Configuración',
    meta: { title: 'Configuración' },
    component: () => import('@/views/SettingsView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
