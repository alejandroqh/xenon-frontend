<script setup lang="ts">
import { ref } from 'vue'
import { useSucursalStore } from '@/stores/sucursal'

const sucursalStore = useSucursalStore()
const companyName = ref('')
const email = ref('')
</script>

<template>
  <div class="max-w-2xl space-y-8">
    <!-- Company Settings -->
    <div class="bg-white rounded-xl border border-gray-200">
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">Configuración de Empresa</h2>
        <p class="mt-1 text-sm text-gray-500">Administra la información de tu empresa</p>
      </div>
      <div class="p-6 space-y-6">
        <div>
          <label class="block text-sm font-medium text-gray-700">Nombre de la Empresa</label>
          <input
            v-model="companyName"
            type="text"
            class="mt-1 block w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Nombre de tu empresa"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Correo Electrónico</label>
          <input
            v-model="email"
            type="email"
            class="mt-1 block w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="empresa@ejemplo.com"
          />
        </div>
      </div>
      <div class="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl">
        <button
          class="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
        >
          Guardar Cambios
        </button>
      </div>
    </div>

    <!-- Sucursal Info -->
    <div class="bg-white rounded-xl border border-gray-200">
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">Sucursal Actual</h2>
        <p class="mt-1 text-sm text-gray-500">Información de la sucursal seleccionada</p>
      </div>
      <div class="p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-900">{{ sucursalStore.sucursalActual.nombre }}</p>
            <p class="text-sm text-gray-500">ID: {{ sucursalStore.sucursalActual.id }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Notification Settings -->
    <div class="bg-white rounded-xl border border-gray-200">
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">Notificaciones</h2>
        <p class="mt-1 text-sm text-gray-500">Configura cómo recibes las actualizaciones</p>
      </div>
      <div class="p-6 space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-900">Notificaciones por Correo</p>
            <p class="text-sm text-gray-500">Recibe actualizaciones de envíos por correo electrónico</p>
          </div>
          <button
            class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-200 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <span class="translate-x-0 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
