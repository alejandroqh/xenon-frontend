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
    path: '/importaciones',
    name: 'Importaciones',
    meta: { title: 'Importaciones' },
    component: () => import('@/views/ShipmentsView.vue')
  },
  {
    path: '/productos',
    name: 'Productos',
    meta: { title: 'Productos' },
    component: () => import('@/views/ProductosView.vue')
  },
  {
    path: '/inventario',
    name: 'Inventario',
    meta: { title: 'Inventario' },
    component: () => import('@/views/InventarioView.vue')
  },
  {
    path: '/clientes',
    name: 'Clientes',
    meta: { title: 'Clientes' },
    component: () => import('@/views/ClientesView.vue')
  },
  {
    path: '/rutas',
    name: 'Rutas',
    meta: { title: 'Rutas' },
    component: () => import('@/views/RutasView.vue')
  },
  {
    path: '/promociones',
    name: 'Promociones',
    meta: { title: 'Promociones' },
    component: () => import('@/views/PromocionesView.vue')
  },
  {
    path: '/reportes',
    name: 'Reportes',
    meta: { title: 'Reportes' },
    component: () => import('@/views/ReportesView.vue')
  },
  {
    path: '/estadisticas',
    name: 'Estadísticas',
    meta: { title: 'Estadísticas' },
    component: () => import('@/views/EstadisticasView.vue')
  },
  {
    path: '/auditoria',
    name: 'Auditoría',
    meta: { title: 'Auditoría' },
    component: () => import('@/views/AuditoriaView.vue')
  },
  {
    path: '/usuarios',
    name: 'Usuarios',
    meta: { title: 'Usuarios' },
    component: () => import('@/views/UsuariosView.vue')
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
