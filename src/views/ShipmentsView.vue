<script setup lang="ts">
import { ref } from 'vue'
import { useSucursalStore } from '@/stores/sucursal'

const sucursalStore = useSucursalStore()
const shipments = ref<any[]>([])
const searchQuery = ref('')
</script>

<template>
  <div class="space-y-6">
    <!-- Header with actions -->
    <div class="flex items-center justify-between">
      <div class="relative">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar envíos..."
          class="w-80 px-4 py-2 pl-10 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <svg
          class="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <button
        class="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
      >
        Agregar Envío
      </button>
    </div>

    <!-- Shipments table -->
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Número de Rastreo
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Transportista
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Estado
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Origen
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Destino
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Fecha Estimada
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-if="shipments.length === 0">
            <td colspan="6" class="px-6 py-12 text-center text-sm text-gray-500">
              No se encontraron envíos para {{ sucursalStore.sucursalActual.nombre }}. Agrega tu primer envío para comenzar.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
