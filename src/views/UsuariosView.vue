<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import * as usuariosApi from '@/api/usuarios'
import type { UsuarioResponse, NivelUsuario } from '@/types'
import { UserCircleIcon } from '@heroicons/vue/24/solid'

const usuarios = ref<UsuarioResponse[]>([])
const cargando = ref(true)
const error = ref<string | null>(null)
const filtroActivo = ref<boolean | undefined>(undefined)

const nivelLabels: Record<NivelUsuario, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
  operador: 'Operador',
  visor: 'Visor'
}

const nivelColors: Record<NivelUsuario, string> = {
  admin: 'bg-purple-100 text-purple-800',
  gerente: 'bg-blue-100 text-blue-800',
  vendedor: 'bg-green-100 text-green-800',
  operador: 'bg-orange-100 text-orange-800',
  visor: 'bg-gray-100 text-gray-800'
}

async function cargarUsuarios() {
  cargando.value = true
  error.value = null
  try {
    usuarios.value = await usuariosApi.listar(
      filtroActivo.value !== undefined ? { activo: filtroActivo.value } : undefined
    )
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error al cargar usuarios'
  } finally {
    cargando.value = false
  }
}

function cambiarFiltro(valor: boolean | undefined) {
  filtroActivo.value = valor
  cargarUsuarios()
}

const usuariosFiltrados = computed(() => usuarios.value)

onMounted(() => {
  cargarUsuarios()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold text-gray-900">Usuarios del Sistema</h2>
        <p class="mt-1 text-sm text-gray-500">
          Gestiona los usuarios y sus permisos por sucursal
        </p>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-2">
      <span class="text-sm text-gray-500">Filtrar:</span>
      <button
        @click="cambiarFiltro(undefined)"
        :class="[
          'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
          filtroActivo === undefined
            ? 'bg-primary-100 text-primary-700'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        ]"
      >
        Todos
      </button>
      <button
        @click="cambiarFiltro(true)"
        :class="[
          'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
          filtroActivo === true
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        ]"
      >
        Activos
      </button>
      <button
        @click="cambiarFiltro(false)"
        :class="[
          'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
          filtroActivo === false
            ? 'bg-red-100 text-red-700'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        ]"
      >
        Inactivos
      </button>
    </div>

    <!-- Loading state -->
    <div v-if="cargando" class="flex items-center justify-center h-64">
      <div class="flex items-center gap-3 text-gray-500">
        <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Cargando usuarios...</span>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="flex items-center justify-center h-64">
      <div class="text-center">
        <p class="text-red-600 mb-4">{{ error }}</p>
        <button
          @click="cargarUsuarios"
          class="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>

    <!-- Users table -->
    <div v-else class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Usuario
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Nivel
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Estado
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Sucursales
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              App
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="usuario in usuariosFiltrados" :key="usuario.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center">
                <div class="flex-shrink-0 h-10 w-10">
                  <img
                    v-if="usuario.imagen"
                    :src="usuario.imagen"
                    :alt="usuario.nombreCompleto"
                    class="h-10 w-10 rounded-full object-cover"
                  />
                  <UserCircleIcon v-else class="h-10 w-10 text-gray-300" />
                </div>
                <div class="ml-4">
                  <div class="text-sm font-medium text-gray-900">{{ usuario.nombreCompleto }}</div>
                  <div class="text-sm text-gray-500">{{ usuario.email }}</div>
                  <div class="text-xs text-gray-400">@{{ usuario.nombreUsuario }}</div>
                </div>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                :class="[
                  'inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium',
                  nivelColors[usuario.nivel]
                ]"
              >
                {{ nivelLabels[usuario.nivel] }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                :class="[
                  'inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium',
                  usuario.activo
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                ]"
              >
                {{ usuario.activo ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td class="px-6 py-4">
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="permiso in usuario.permisosPorSucursal"
                  :key="permiso.sucursalId"
                  class="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                  :title="`Menus: ${Object.keys(permiso.menus).join(', ')}`"
                >
                  {{ permiso.sucursalNombre }}
                </span>
                <span
                  v-if="usuario.permisosPorSucursal.length === 0"
                  class="text-xs text-gray-400 italic"
                >
                  Sin acceso
                </span>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                :class="[
                  'inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium',
                  usuario.accesoApp
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-500'
                ]"
              >
                {{ usuario.accesoApp ? 'Si' : 'No' }}
              </span>
            </td>
          </tr>
          <tr v-if="usuariosFiltrados.length === 0">
            <td colspan="5" class="px-6 py-12 text-center text-gray-500">
              No se encontraron usuarios
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
