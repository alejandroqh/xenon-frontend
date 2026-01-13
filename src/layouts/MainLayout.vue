<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useSucursalStore } from '@/stores/sucursal'
import { useAuthStore, type MenuRuta } from '@/stores/auth'
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

async function cerrarSesion() {
  await authStore.cerrarSesion()
  sucursalStore.$reset()
  router.push('/login')
}

interface NavItem {
  name: string
  path: string
  icon: typeof HomeIcon
  menuKey: MenuRuta
}

interface NavSection {
  group: string
  items: NavItem[]
}

const allNavigation: NavSection[] = [
  {
    group: 'Principal',
    items: [
      { name: 'Panel', path: '/', icon: HomeIcon, menuKey: 'panel' }
    ]
  },
  {
    group: 'Operaciones',
    items: [
      { name: 'Importaciones', path: '/importaciones', icon: TruckIcon, menuKey: 'importaciones' },
      { name: 'Productos', path: '/productos', icon: CubeIcon, menuKey: 'productos' },
      { name: 'Inventario', path: '/inventario', icon: ArchiveBoxIcon, menuKey: 'inventario' }
    ]
  },
  {
    group: 'Ventas',
    items: [
      { name: 'Clientes', path: '/clientes', icon: UsersIcon, menuKey: 'clientes' },
      { name: 'Rutas', path: '/rutas', icon: MapIcon, menuKey: 'rutas' },
      { name: 'Promociones', path: '/promociones', icon: TagIcon, menuKey: 'promociones' }
    ]
  },
  {
    group: 'Análisis',
    items: [
      { name: 'Reportes', path: '/reportes', icon: DocumentChartBarIcon, menuKey: 'reportes' },
      { name: 'Estadísticas', path: '/estadisticas', icon: ChartBarIcon, menuKey: 'estadisticas' }
    ]
  },
  {
    group: 'Sistema',
    items: [
      { name: 'Auditoría', path: '/auditoria', icon: ClipboardDocumentListIcon, menuKey: 'auditoria' },
      { name: 'Usuarios', path: '/usuarios', icon: UserGroupIcon, menuKey: 'usuarios' },
      { name: 'Configuración', path: '/configuracion', icon: Cog6ToothIcon, menuKey: 'configuracion' }
    ]
  }
]

// Filter navigation based on permissions for current sucursal
const navigation = computed(() => {
  const sucursalId = sucursalStore.sucursalActual?.id
  if (!sucursalId) return []

  return allNavigation
    .map(section => ({
      ...section,
      items: section.items.filter(item => authStore.puedeVer(sucursalId, item.menuKey))
    }))
    .filter(section => section.items.length > 0)
})

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
          v-if="sucursalStore.sucursalActual"
          :value="sucursalStore.sucursalActual.id"
          @change="onSucursalChange"
          class="px-4 py-2 text-sm font-medium bg-primary-50 text-primary-700 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer hover:bg-primary-100 transition-colors"
        >
          <option
            v-for="sucursal in sucursalStore.sucursalesAccesibles"
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
