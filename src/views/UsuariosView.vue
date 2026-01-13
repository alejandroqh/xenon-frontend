<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import * as usuariosApi from '@/api/usuarios'
import type { UsuarioResponse, NivelUsuario } from '@/types'
import { UserCircleIcon } from '@heroicons/vue/24/solid'
import {
  PencilSquareIcon,
  TrashIcon,
  KeyIcon,
  EyeIcon
} from '@heroicons/vue/24/outline'

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
  <div class="space-y-6 sm:space-y-8">
    <!-- Header -->
    <div>
      <h2 class="text-lg sm:text-xl font-semibold text-gray-900">Usuarios del Sistema</h2>
      <p class="mt-1 text-sm text-gray-500">
        Gestiona los usuarios y sus permisos por sucursal
      </p>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-2 overflow-x-auto pb-2 -mb-2">
      <span class="text-sm text-gray-500 flex-shrink-0">Filtrar:</span>
      <button
        @click="cambiarFiltro(undefined)"
        :class="[
          'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex-shrink-0',
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
          'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex-shrink-0',
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
          'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex-shrink-0',
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

    <!-- Users list -->
    <div v-else class="pt-2">
      <!-- Mobile: Card layout -->
      <div class="space-y-3 md:hidden">
        <div
          v-for="usuario in usuariosFiltrados"
          :key="usuario.id"
          class="bg-white rounded-xl border border-gray-200 p-4"
        >
          <!-- User header -->
          <div class="flex items-start gap-3">
            <div class="flex-shrink-0">
              <img
                v-if="usuario.imagen"
                :src="usuario.imagen"
                :alt="usuario.nombreCompleto"
                class="h-12 w-12 rounded-full object-cover"
              />
              <UserCircleIcon v-else class="h-12 w-12 text-gray-300" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-sm font-medium text-gray-900 truncate">{{ usuario.nombreCompleto }}</p>
                  <p class="text-sm text-gray-500 truncate">{{ usuario.email }}</p>
                  <p class="text-xs text-gray-400">@{{ usuario.nombreUsuario }}</p>
                </div>
                <span
                  :class="[
                    'inline-flex px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0',
                    usuario.activo
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  ]"
                >
                  {{ usuario.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </div>
            </div>
          </div>

          <!-- User details -->
          <div class="mt-3 pt-3 border-t border-gray-100 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500">Nivel</span>
              <span
                :class="[
                  'inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium',
                  nivelColors[usuario.nivel]
                ]"
              >
                {{ nivelLabels[usuario.nivel] }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500">Acceso App</span>
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
            </div>
            <div class="flex items-start justify-between gap-2">
              <span class="text-xs text-gray-500 flex-shrink-0 pt-0.5">Sucursales</span>
              <div class="flex flex-wrap gap-1 justify-end">
                <span
                  v-for="permiso in usuario.permisosPorSucursal"
                  :key="permiso.sucursalId"
                  class="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
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
            </div>
          </div>

          <!-- Actions -->
          <div class="mt-3 pt-3 border-t border-gray-100 flex items-center justify-end gap-1">
            <button class="group relative p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              <EyeIcon class="w-5 h-5" />
              <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Ver detalles
              </span>
            </button>
            <button class="group relative p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
              <PencilSquareIcon class="w-5 h-5" />
              <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Editar
              </span>
            </button>
            <button class="group relative p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
              <KeyIcon class="w-5 h-5" />
              <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Contraseña
              </span>
            </button>
            <button class="group relative p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <TrashIcon class="w-5 h-5" />
              <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Eliminar
              </span>
            </button>
          </div>
        </div>

        <!-- Empty state mobile -->
        <div v-if="usuariosFiltrados.length === 0" class="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          No se encontraron usuarios
        </div>
      </div>

      <!-- Desktop: Table layout -->
      <div class="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
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
                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
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
                <td class="px-6 py-4 whitespace-nowrap text-right">
                  <div class="flex items-center justify-end gap-1">
                    <button class="group relative p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <EyeIcon class="w-4 h-4" />
                      <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Ver detalles
                      </span>
                    </button>
                    <button class="group relative p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                      <PencilSquareIcon class="w-4 h-4" />
                      <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Editar
                      </span>
                    </button>
                    <button class="group relative p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                      <KeyIcon class="w-4 h-4" />
                      <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Contraseña
                      </span>
                    </button>
                    <button class="group relative p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <TrashIcon class="w-4 h-4" />
                      <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Eliminar
                      </span>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="usuariosFiltrados.length === 0">
                <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                  No se encontraron usuarios
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
