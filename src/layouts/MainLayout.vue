<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { useSucursalStore } from '@/stores/sucursal'

const appName = import.meta.env.VITE_APP_NAME
const sucursalStore = useSucursalStore()

const navigation = [
  { name: 'Panel', path: '/' },
  { name: 'Envíos', path: '/envios' },
  { name: 'Configuración', path: '/configuracion' }
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

      <!-- Sucursal Selector -->
      <div class="p-4 border-b border-gray-200">
        <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
          Sucursal
        </label>
        <select
          :value="sucursalStore.sucursalActual.id"
          @change="onSucursalChange"
          class="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option
            v-for="sucursal in sucursalStore.todasLasSucursales"
            :key="sucursal.id"
            :value="sucursal.id"
          >
            {{ sucursal.nombre }}
          </option>
        </select>
      </div>

      <!-- Navigation -->
      <nav class="p-4 space-y-1 flex-1">
        <RouterLink
          v-for="item in navigation"
          :key="item.path"
          :to="item.path"
          class="flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors"
          :class="[
            $route.path === item.path
              ? 'bg-primary-50 text-primary-700'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          ]"
        >
          {{ item.name }}
        </RouterLink>
      </nav>

      <!-- Subtitle -->
      <div class="p-4 border-t border-gray-200">
        <span class="text-xs text-gray-500">Plataforma de Operaciones Comerciales</span>
      </div>
    </aside>

    <!-- Main content -->
    <main class="pl-64">
      <!-- Header -->
      <header class="sticky top-0 z-10 flex items-center justify-between h-16 px-8 bg-white border-b border-gray-200">
        <h1 class="text-lg font-semibold text-gray-900">
          {{ $route.meta.title || $route.name }}
        </h1>
        <div class="flex items-center text-sm text-gray-500">
          <span class="px-3 py-1 bg-gray-100 rounded-full">
            {{ sucursalStore.sucursalActual.nombre }}
          </span>
        </div>
      </header>

      <!-- Page content -->
      <div class="p-8">
        <RouterView />
      </div>
    </main>
  </div>
</template>
