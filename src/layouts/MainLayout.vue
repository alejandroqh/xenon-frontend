<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useSucursalStore } from '@/stores/sucursal'
import { useAuthStore } from '@/stores/auth'
import {
  HomeIcon,
  TruckIcon,
  CubeIcon,
  ArchiveBoxIcon,
  UsersIcon,
  MapIcon,
  TagIcon,
  DocumentChartBarIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ArrowRightStartOnRectangleIcon
} from '@heroicons/vue/24/outline'

const appName = import.meta.env.VITE_APP_NAME
const router = useRouter()
const sucursalStore = useSucursalStore()
const authStore = useAuthStore()

function cerrarSesion() {
  authStore.cerrarSesion()
  router.push('/login')
}

const navigation = [
  {
    group: 'Principal',
    items: [
      { name: 'Panel', path: '/', icon: HomeIcon }
    ]
  },
  {
    group: 'Operaciones',
    items: [
      { name: 'Importaciones', path: '/importaciones', icon: TruckIcon },
      { name: 'Productos', path: '/productos', icon: CubeIcon },
      { name: 'Inventario', path: '/inventario', icon: ArchiveBoxIcon }
    ]
  },
  {
    group: 'Ventas',
    items: [
      { name: 'Clientes', path: '/clientes', icon: UsersIcon },
      { name: 'Rutas', path: '/rutas', icon: MapIcon },
      { name: 'Promociones', path: '/promociones', icon: TagIcon }
    ]
  },
  {
    group: 'Análisis',
    items: [
      { name: 'Reportes', path: '/reportes', icon: DocumentChartBarIcon },
      { name: 'Estadísticas', path: '/estadisticas', icon: ChartBarIcon }
    ]
  },
  {
    group: 'Sistema',
    items: [
      { name: 'Auditoría', path: '/auditoria', icon: ClipboardDocumentListIcon },
      { name: 'Usuarios', path: '/usuarios', icon: UserGroupIcon },
      { name: 'Configuración', path: '/configuracion', icon: Cog6ToothIcon }
    ]
  }
]

function onSucursalChange(event: Event) {
  const target = event.target as HTMLSelectElement
  sucursalStore.seleccionarSucursal(target.value)
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Sidebar -->
    <aside class="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col">
      <!-- Logo -->
      <div class="flex items-center gap-2 h-16 px-6 border-b border-gray-200">
        <span class="text-xl font-semibold text-gray-900">{{ appName }}</span>
        <span class="text-xs text-gray-500">y más...</span>
      </div>

      <!-- Navigation -->
      <nav class="p-4 space-y-4 flex-1 overflow-y-auto">
        <div v-for="section in navigation" :key="section.group">
          <p class="px-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {{ section.group }}
          </p>
          <div class="space-y-1">
            <RouterLink
              v-for="item in section.items"
              :key="item.path"
              :to="item.path"
              class="flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors"
              :class="[
                $route.path === item.path
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              ]"
            >
              <component :is="item.icon" class="w-5 h-5" />
              {{ item.name }}
            </RouterLink>
          </div>
        </div>
      </nav>

      <!-- Footer -->
      <div class="p-4 border-t border-gray-200 space-y-3">
        <button
          @click="cerrarSesion"
          class="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <ArrowRightStartOnRectangleIcon class="w-5 h-5" />
          Cerrar sesion
        </button>
        <span class="block text-xs text-gray-500">Plataforma de Operaciones Comerciales</span>
      </div>
    </aside>

    <!-- Main content -->
    <main class="pl-64">
      <!-- Header -->
      <header class="sticky top-0 z-10 flex items-center justify-between h-16 px-8 bg-white border-b border-gray-200">
        <h1 class="text-lg font-semibold text-gray-900">
          {{ $route.meta.title || $route.name }}
        </h1>
        <select
          :value="sucursalStore.sucursalActual.id"
          @change="onSucursalChange"
          class="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option
            v-for="sucursal in sucursalStore.todasLasSucursales"
            :key="sucursal.id"
            :value="sucursal.id"
          >
            {{ sucursal.nombre }}
          </option>
        </select>
      </header>

      <!-- Page content -->
      <div class="p-8">
        <RouterView />
      </div>
    </main>
  </div>
</template>
