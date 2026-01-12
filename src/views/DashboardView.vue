<script setup lang="ts">
import { useSucursalStore } from '@/stores/sucursal'

const sucursalStore = useSucursalStore()

const stats = [
  { label: 'Total de Envíos', value: '0', change: '+0%' },
  { label: 'En Tránsito', value: '0', change: '+0%' },
  { label: 'Entregados', value: '0', change: '+0%' },
  { label: 'Pendientes', value: '0', change: '+0%' }
]
</script>

<template>
  <div class="space-y-8">
    <!-- Stats Grid -->
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="p-6 bg-white rounded-xl border border-gray-200"
      >
        <p class="text-sm font-medium text-gray-500">{{ stat.label }}</p>
        <div class="flex items-baseline mt-2">
          <p class="text-3xl font-semibold text-gray-900">{{ stat.value }}</p>
          <span class="ml-2 text-sm text-gray-500">{{ stat.change }}</span>
        </div>
      </div>
    </div>

    <!-- Recent Shipments -->
    <div class="bg-white rounded-xl border border-gray-200">
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">Envíos Recientes</h2>
        <p class="text-sm text-gray-500">Sucursal: {{ sucursalStore.sucursalActual.nombre }}</p>
      </div>
      <div class="p-6">
        <p class="text-sm text-gray-500">No hay envíos aún. Comienza a rastrear tu primer envío.</p>
      </div>
    </div>
  </div>
</template>
