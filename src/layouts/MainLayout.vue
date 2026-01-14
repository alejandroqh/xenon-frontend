<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import { useSucursalStore } from '@/stores/sucursal'
import { useAuthStore, type MenuRuta } from '@/stores/auth'
import SucursalSelectorModal from '@/components/SucursalSelectorModal.vue'
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
  ArrowRightStartOnRectangleIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/vue/24/outline'

// Sidebar state
const sidebarOpen = ref(false)
const isLargeScreen = ref(false)

function checkScreenSize() {
  isLargeScreen.value = window.innerWidth >= 1024
  if (isLargeScreen.value) {
    sidebarOpen.value = true
  }
}

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

function closeSidebarOnMobile() {
  if (!isLargeScreen.value) {
    sidebarOpen.value = false
  }
}

onMounted(() => {
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize)
})

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
  const sucursalId = target.value
  const sucursal = sucursalStore.sucursalesAccesibles.find(s => s.id === sucursalId)

  sucursalStore.seleccionarSucursal(sucursalId, true)

  if (sucursal) {
    Swal.fire({
      title: sucursal.nombre,
      text: 'Sucursal activa',
      icon: 'success',
      position: 'center',
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true
    })
  }
}

// User level labels in Spanish
const nivelLabels: Record<string, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
  operador: 'Operador',
  visor: 'Visor'
}

// Get user initials for avatar fallback
const userInitials = computed(() => {
  if (!authStore.usuario?.nombreCompleto) return '?'
  return authStore.usuario.nombreCompleto
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Mobile overlay -->
    <Transition name="fade">
      <div
        v-if="sidebarOpen && !isLargeScreen"
        class="fixed inset-0 z-20 bg-gray-900/50"
        @click="closeSidebarOnMobile"
      />
    </Transition>

    <!-- Sidebar -->
    <Transition name="slide">
      <aside
        v-show="sidebarOpen"
        class="fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 flex flex-col"
      >
        <!-- Logo -->
        <div class="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div class="flex items-center gap-2">
            <span class="text-xl font-semibold text-gray-900">{{ appName }}</span>
            <span class="text-xs text-gray-500">y más...</span>
          </div>
          <button
            @click="toggleSidebar"
            class="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
          >
            <XMarkIcon class="w-5 h-5" />
          </button>
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
                @click="closeSidebarOnMobile"
              >
                <component :is="item.icon" class="w-5 h-5" />
                {{ item.name }}
              </RouterLink>
            </div>
          </div>
        </nav>

        <!-- Footer -->
        <div class="border-t border-gray-200">
          <!-- User Info -->
          <div v-if="authStore.usuario" class="p-4 border-b border-gray-100">
            <div class="flex items-center gap-3">
              <!-- Avatar -->
              <div class="shrink-0">
                <img
                  v-if="authStore.usuario.imagen"
                  :src="authStore.usuario.imagen"
                  :alt="authStore.usuario.nombreCompleto"
                  class="w-10 h-10 rounded-full object-cover"
                />
                <div
                  v-else
                  class="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold"
                >
                  {{ userInitials }}
                </div>
              </div>
              <!-- User Details -->
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-gray-900 truncate">
                  {{ authStore.usuario.nombreCompleto }}
                </p>
                <p class="text-xs text-gray-500 truncate">
                  @{{ authStore.usuario.nombreUsuario }}
                </p>
              </div>
            </div>
            <!-- User Level Badge -->
            <div class="mt-2">
              <span
                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                :class="{
                  'bg-purple-100 text-purple-800': authStore.usuario.nivel === 'admin',
                  'bg-blue-100 text-blue-800': authStore.usuario.nivel === 'gerente',
                  'bg-green-100 text-green-800': authStore.usuario.nivel === 'vendedor',
                  'bg-yellow-100 text-yellow-800': authStore.usuario.nivel === 'operador',
                  'bg-gray-100 text-gray-800': authStore.usuario.nivel === 'visor'
                }"
              >
                {{ nivelLabels[authStore.usuario.nivel] || authStore.usuario.nivel }}
              </span>
            </div>
          </div>
          <!-- Logout & Info -->
          <div class="p-4 space-y-3">
            <button
              @click="cerrarSesion"
              class="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <ArrowRightStartOnRectangleIcon class="w-5 h-5" />
              Cerrar sesion
            </button>
            <span class="block text-xs text-gray-500">Plataforma de Operaciones Comerciales</span>
          </div>
        </div>
      </aside>
    </Transition>

    <!-- Main content -->
    <main
      class="transition-all duration-300"
      :class="sidebarOpen && isLargeScreen ? 'lg:pl-64' : ''"
    >
      <!-- Header -->
      <header class="sticky top-0 z-10 flex items-center justify-between h-16 px-4 sm:px-8 bg-white border-b border-gray-200">
        <div class="flex items-center gap-3">
          <button
            @click="toggleSidebar"
            class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bars3Icon class="w-5 h-5" />
          </button>
          <h1 class="text-lg font-semibold text-gray-900">
            {{ $route.meta.title || $route.name }}
          </h1>
        </div>
        <select
          v-if="sucursalStore.sucursalActual"
          :value="sucursalStore.sucursalActual.id"
          @change="onSucursalChange"
          class="px-3 py-2 text-sm font-medium bg-primary-50 text-primary-700 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer hover:bg-primary-100 transition-colors"
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
      <div class="p-4 sm:p-8">
        <RouterView />
      </div>
    </main>

    <!-- Sucursal Selection Modal -->
    <SucursalSelectorModal />
  </div>
</template>

<style scoped>
/* Fade transition for overlay */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Slide transition for sidebar */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}
</style>
