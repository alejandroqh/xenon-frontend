<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import moment from 'moment'
// @ts-ignore
import 'moment/dist/locale/es-mx.js'

import * as usuariosApi from '@/api/usuarios'
import type { UsuarioResponse, NivelUsuario } from '@/types'
import { UserCircleIcon } from '@heroicons/vue/24/solid'
import {
  PencilSquareIcon,
  TrashIcon,
  KeyIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  PlusIcon,
  ChevronDownIcon,
  NoSymbolIcon,
  CheckCircleIcon
} from '@heroicons/vue/24/outline'
import UsuarioFormModal from '@/components/UsuarioFormModal.vue'

const usuarios = ref<UsuarioResponse[]>([])
const cargando = ref(true)
const error = ref<string | null>(null)
const filtroActivo = ref<boolean | undefined>(undefined)
const busqueda = ref('')

// Modal state
const modalDetallesAbierto = ref(false)
const usuarioSeleccionado = ref<UsuarioResponse | null>(null)
const cargandoDetalles = ref(false)
const permisosExpandidos = ref<Record<string, boolean>>({})

// Toggle status modal state
const modalEstadoAbierto = ref(false)
const usuarioParaCambiarEstado = ref<UsuarioResponse | null>(null)
const cambiandoEstado = ref(false)

// Create/Edit modal state
const modalFormAbierto = ref(false)
const usuarioParaEditar = ref<UsuarioResponse | null>(null)

// Toast notification state
const toastVisible = ref(false)
const toastMensaje = ref('')
let toastTimeout: ReturnType<typeof setTimeout> | null = null

function mostrarToast(mensaje: string) {
  toastMensaje.value = mensaje
  toastVisible.value = true
  if (toastTimeout) clearTimeout(toastTimeout)
  toastTimeout = setTimeout(() => {
    toastVisible.value = false
  }, 3000)
}

function togglePermiso(sucursalId: string) {
  permisosExpandidos.value[sucursalId] = !permisosExpandidos.value[sucursalId]
}

function contarPermisos(menus: Record<string, string[]>): { total: number; editar: number; ver: number } {
  const entries = Object.entries(menus)
  const total = entries.length
  const editar = entries.filter(([_, acciones]) => acciones?.includes('edit')).length
  const ver = total - editar
  return { total, editar, ver }
}

/**
 * Fuzzy search: checks if all characters in the query appear in the text in order
 */
function fuzzyMatch(text: string, query: string): boolean {
  const textLower = text.toLowerCase()
  const queryLower = query.toLowerCase()

  let textIndex = 0
  let queryIndex = 0

  while (textIndex < textLower.length && queryIndex < queryLower.length) {
    if (textLower[textIndex] === queryLower[queryIndex]) {
      queryIndex++
    }
    textIndex++
  }

  return queryIndex === queryLower.length
}

function usuarioMatchesBusqueda(usuario: UsuarioResponse, query: string): boolean {
  if (!query.trim()) return true

  return (
    fuzzyMatch(usuario.nombreCompleto, query) ||
    fuzzyMatch(usuario.nombreUsuario, query) ||
    fuzzyMatch(usuario.email, query)
  )
}

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

async function verDetalles(id: string) {
  modalDetallesAbierto.value = true
  cargandoDetalles.value = true
  usuarioSeleccionado.value = null
  try {
    usuarioSeleccionado.value = await usuariosApi.obtener(id)
  } catch (err) {
    console.error('Error al cargar detalles del usuario:', err)
  } finally {
    cargandoDetalles.value = false
  }
}

function cerrarModalDetalles() {
  modalDetallesAbierto.value = false
  usuarioSeleccionado.value = null
  permisosExpandidos.value = {}
}

function abrirModalCambiarEstado(usuario: UsuarioResponse) {
  usuarioParaCambiarEstado.value = usuario
  modalEstadoAbierto.value = true
}

function cerrarModalEstado() {
  modalEstadoAbierto.value = false
  usuarioParaCambiarEstado.value = null
}

async function confirmarCambioEstado() {
  if (!usuarioParaCambiarEstado.value) return

  cambiandoEstado.value = true
  try {
    const nuevoEstado = !usuarioParaCambiarEstado.value.activo
    await usuariosApi.actualizar(usuarioParaCambiarEstado.value.id, { activo: nuevoEstado })

    // Update the user in the local list
    const index = usuarios.value.findIndex(u => u.id === usuarioParaCambiarEstado.value!.id)
    const usuario = usuarios.value[index]
    if (usuario) {
      usuario.activo = nuevoEstado
    }

    cerrarModalEstado()
    mostrarToast(nuevoEstado ? 'Usuario activado correctamente' : 'Usuario desactivado correctamente')
  } catch (err) {
    console.error('Error al cambiar estado del usuario:', err)
  } finally {
    cambiandoEstado.value = false
  }
}

function abrirModalCrear() {
  usuarioParaEditar.value = null
  modalFormAbierto.value = true
}

function abrirModalEditar(usuario: UsuarioResponse) {
  usuarioParaEditar.value = usuario
  modalFormAbierto.value = true
}

function cerrarModalForm() {
  modalFormAbierto.value = false
  usuarioParaEditar.value = null
}

function onUsuarioGuardado(usuario: UsuarioResponse) {
  const esEdicion = !!usuarioParaEditar.value
  if (esEdicion) {
    // Update existing user in the list
    const index = usuarios.value.findIndex(u => u.id === usuario.id)
    if (index !== -1) {
      usuarios.value[index] = usuario
    }
  } else {
    // Add new user to the list
    usuarios.value.unshift(usuario)
  }
  cerrarModalForm()
  mostrarToast(esEdicion ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente')
}

function formatearFecha(timestamp: number): string {
  return moment.unix(timestamp).locale('es-mx').format('D [de] MMMM [de] YYYY, HH:mm')
}

const usuariosFiltrados = computed(() =>
  usuarios.value.filter((usuario) => usuarioMatchesBusqueda(usuario, busqueda.value))
)

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

    <!-- Search, Filters and Actions -->
    <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      <!-- Search input -->
      <div class="relative flex-1 max-w-md">
        <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          v-model="busqueda"
          type="text"
          placeholder="Buscar por nombre, usuario o email..."
          class="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
        />
        <button
          v-if="busqueda"
          @click="busqueda = ''"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <XMarkIcon class="h-5 w-5" />
        </button>
      </div>

      <!-- Status filters -->
      <div class="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 -mb-2 sm:mb-0">
        <span class="text-sm text-gray-500 flex-shrink-0">Estado:</span>
        <button
          @click="cambiarFiltro(undefined)"
          :class="[
            'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex-shrink-0 cursor-pointer',
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
            'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex-shrink-0 cursor-pointer',
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
            'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex-shrink-0 cursor-pointer',
            filtroActivo === false
              ? 'bg-red-100 text-red-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          ]"
        >
          Inactivos
        </button>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2 sm:ml-auto">
        <button
          @click="abrirModalCrear"
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors cursor-pointer"
        >
          <PlusIcon class="h-5 w-5" />
          <span>Crear Usuario</span>
        </button>
      </div>
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
            <button @click="verDetalles(usuario.id)" class="group relative p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer">
              <EyeIcon class="w-5 h-5" />
              <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Ver detalles
              </span>
            </button>
            <button @click="abrirModalEditar(usuario)" class="group relative p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors cursor-pointer">
              <PencilSquareIcon class="w-5 h-5" />
              <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Editar
              </span>
            </button>
            <button class="group relative p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer">
              <KeyIcon class="w-5 h-5" />
              <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Contraseña
              </span>
            </button>
            <button
              @click="abrirModalCambiarEstado(usuario)"
              :class="[
                'group relative p-2 rounded-lg transition-colors cursor-pointer',
                usuario.activo
                  ? 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'
                  : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
              ]"
            >
              <NoSymbolIcon v-if="usuario.activo" class="w-5 h-5" />
              <CheckCircleIcon v-else class="w-5 h-5" />
              <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {{ usuario.activo ? 'Desactivar' : 'Activar' }}
              </span>
            </button>
            <button class="group relative p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
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
                    <button @click="verDetalles(usuario.id)" class="group relative p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer">
                      <EyeIcon class="w-4 h-4" />
                      <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Ver detalles
                      </span>
                    </button>
                    <button @click="abrirModalEditar(usuario)" class="group relative p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors cursor-pointer">
                      <PencilSquareIcon class="w-4 h-4" />
                      <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Editar
                      </span>
                    </button>
                    <button class="group relative p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer">
                      <KeyIcon class="w-4 h-4" />
                      <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Contraseña
                      </span>
                    </button>
                    <button
                      @click="abrirModalCambiarEstado(usuario)"
                      :class="[
                        'group relative p-1.5 rounded-lg transition-colors cursor-pointer',
                        usuario.activo
                          ? 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'
                          : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                      ]"
                    >
                      <NoSymbolIcon v-if="usuario.activo" class="w-4 h-4" />
                      <CheckCircleIcon v-else class="w-4 h-4" />
                      <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        {{ usuario.activo ? 'Desactivar' : 'Activar' }}
                      </span>
                    </button>
                    <button class="group relative p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
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

    <!-- Modal Ver Detalles -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="modalDetallesAbierto"
          class="fixed inset-0 z-50 overflow-y-auto"
          @click.self="cerrarModalDetalles"
        >
          <!-- Backdrop -->
          <div class="fixed inset-0 bg-black/50 transition-opacity" @click="cerrarModalDetalles"></div>

          <!-- Modal panel -->
          <div class="relative min-h-screen flex items-center justify-center p-4">
            <div class="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              <!-- Header -->
              <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h3 class="text-lg font-semibold text-gray-900">Detalles del Usuario</h3>
                <button
                  @click="cerrarModalDetalles"
                  class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon class="w-5 h-5" />
                </button>
              </div>

              <!-- Content -->
              <div class="px-6 py-5 overflow-y-auto max-h-[calc(90vh-130px)]">
                <!-- Loading state -->
                <div v-if="cargandoDetalles" class="flex items-center justify-center py-12">
                  <div class="flex items-center gap-3 text-gray-500">
                    <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Cargando detalles...</span>
                  </div>
                </div>

                <!-- User details -->
                <div v-else-if="usuarioSeleccionado" class="space-y-6">
                  <!-- User header -->
                  <div class="flex items-center gap-4">
                    <div class="flex-shrink-0">
                      <img
                        v-if="usuarioSeleccionado.imagen"
                        :src="usuarioSeleccionado.imagen"
                        :alt="usuarioSeleccionado.nombreCompleto"
                        class="h-20 w-20 rounded-full object-cover"
                      />
                      <UserCircleIcon v-else class="h-20 w-20 text-gray-300" />
                    </div>
                    <div>
                      <h4 class="text-xl font-semibold text-gray-900">{{ usuarioSeleccionado.nombreCompleto }}</h4>
                      <p class="text-gray-500">@{{ usuarioSeleccionado.nombreUsuario }}</p>
                      <div class="flex items-center gap-2 mt-2">
                        <span
                          :class="[
                            'inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium',
                            nivelColors[usuarioSeleccionado.nivel]
                          ]"
                        >
                          {{ nivelLabels[usuarioSeleccionado.nivel] }}
                        </span>
                        <span
                          :class="[
                            'inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium',
                            usuarioSeleccionado.activo
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          ]"
                        >
                          {{ usuarioSeleccionado.activo ? 'Activo' : 'Inactivo' }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Contact info -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="bg-gray-50 rounded-lg p-4">
                      <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Email</p>
                      <p class="text-sm font-medium text-gray-900">{{ usuarioSeleccionado.email }}</p>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-4">
                      <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Teléfono</p>
                      <p class="text-sm font-medium text-gray-900">{{ usuarioSeleccionado.telefono || 'No registrado' }}</p>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-4">
                      <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Acceso App Móvil</p>
                      <span
                        :class="[
                          'inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium',
                          usuarioSeleccionado.accesoApp
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-500'
                        ]"
                      >
                        {{ usuarioSeleccionado.accesoApp ? 'Habilitado' : 'Deshabilitado' }}
                      </span>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-4">
                      <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">ID</p>
                      <p class="text-sm font-medium text-gray-900 font-mono">{{ usuarioSeleccionado.id }}</p>
                    </div>
                  </div>

                  <!-- Permissions by sucursal -->
                  <div>
                    <h5 class="text-sm font-medium text-gray-900 mb-3">Permisos por Sucursal</h5>
                    <div v-if="usuarioSeleccionado.permisosPorSucursal.length === 0" class="bg-gray-50 rounded-lg p-4 text-center text-gray-500 text-sm">
                      Sin permisos asignados
                    </div>
                    <div v-else class="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-200">
                      <div
                        v-for="permiso in usuarioSeleccionado.permisosPorSucursal"
                        :key="permiso.sucursalId"
                      >
                        <!-- Accordion header -->
                        <button
                          @click="togglePermiso(permiso.sucursalId)"
                          class="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left cursor-pointer"
                        >
                          <div class="flex items-center gap-3">
                            <span class="text-sm font-medium text-gray-900">{{ permiso.sucursalNombre }}</span>
                            <div class="flex items-center gap-1.5">
                              <span
                                v-if="contarPermisos(permiso.menus).editar > 0"
                                class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700"
                              >
                                {{ contarPermisos(permiso.menus).editar }} editar
                              </span>
                              <span
                                v-if="contarPermisos(permiso.menus).ver > 0"
                                class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700"
                              >
                                {{ contarPermisos(permiso.menus).ver }} ver
                              </span>
                            </div>
                          </div>
                          <ChevronDownIcon
                            :class="[
                              'w-4 h-4 text-gray-400 transition-transform duration-200',
                              permisosExpandidos[permiso.sucursalId] ? 'rotate-180' : ''
                            ]"
                          />
                        </button>
                        <!-- Accordion content -->
                        <Transition name="accordion">
                          <div
                            v-if="permisosExpandidos[permiso.sucursalId]"
                            class="px-4 py-3 bg-gray-50 border-t border-gray-100"
                          >
                            <div class="flex flex-wrap gap-1.5">
                              <span
                                v-for="(acciones, menu) in permiso.menus"
                                :key="menu"
                                :class="[
                                  'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
                                  acciones?.includes('edit')
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-blue-100 text-blue-700'
                                ]"
                              >
                                {{ menu }}
                                <span class="text-[10px] opacity-75">({{ acciones?.includes('edit') ? 'editar' : 'ver' }})</span>
                              </span>
                            </div>
                          </div>
                        </Transition>
                      </div>
                    </div>
                  </div>

                  <!-- Timestamps -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                    <div>
                      <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Creado</p>
                      <p class="text-sm text-gray-700">{{ formatearFecha(usuarioSeleccionado.creadoEn) }}</p>
                    </div>
                    <div>
                      <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Última actualización</p>
                      <p class="text-sm text-gray-700">{{ formatearFecha(usuarioSeleccionado.actualizadoEn) }}</p>
                    </div>
                  </div>
                </div>

                <!-- Error state -->
                <div v-else class="text-center py-12 text-gray-500">
                  No se pudieron cargar los detalles del usuario
                </div>
              </div>

              <!-- Footer -->
              <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
                <button
                  @click="cerrarModalDetalles"
                  class="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  v-if="usuarioSeleccionado"
                  @click="cerrarModalDetalles(); abrirModalEditar(usuarioSeleccionado)"
                  class="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <PencilSquareIcon class="w-4 h-4" />
                  Editar Usuario
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Modal Cambiar Estado -->
      <Transition name="modal">
        <div
          v-if="modalEstadoAbierto"
          class="fixed inset-0 z-50 overflow-y-auto"
          @click.self="cerrarModalEstado"
        >
          <!-- Backdrop -->
          <div class="fixed inset-0 bg-black/50 transition-opacity" @click="cerrarModalEstado"></div>

          <!-- Modal panel -->
          <div class="relative min-h-screen flex items-center justify-center p-4">
            <div class="relative bg-white rounded-xl shadow-xl max-w-md w-full">
              <!-- Header -->
              <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h3 class="text-lg font-semibold text-gray-900">
                  {{ usuarioParaCambiarEstado?.activo ? 'Desactivar Usuario' : 'Activar Usuario' }}
                </h3>
                <button
                  @click="cerrarModalEstado"
                  class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon class="w-5 h-5" />
                </button>
              </div>

              <!-- Content -->
              <div class="px-6 py-5">
                <div class="flex items-start gap-4">
                  <div
                    :class="[
                      'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                      usuarioParaCambiarEstado?.activo ? 'bg-orange-100' : 'bg-green-100'
                    ]"
                  >
                    <NoSymbolIcon v-if="usuarioParaCambiarEstado?.activo" class="w-5 h-5 text-orange-600" />
                    <CheckCircleIcon v-else class="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p class="text-sm text-gray-700">
                      <template v-if="usuarioParaCambiarEstado?.activo">
                        ¿Estás seguro de que deseas desactivar al usuario
                        <span class="font-semibold">{{ usuarioParaCambiarEstado?.nombreCompleto }}</span>?
                        El usuario no podrá acceder al sistema mientras esté desactivado.
                      </template>
                      <template v-else>
                        ¿Estás seguro de que deseas activar al usuario
                        <span class="font-semibold">{{ usuarioParaCambiarEstado?.nombreCompleto }}</span>?
                        El usuario podrá acceder al sistema nuevamente.
                      </template>
                    </p>
                  </div>
                </div>
              </div>

              <!-- Footer -->
              <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <button
                  @click="cerrarModalEstado"
                  :disabled="cambiandoEstado"
                  class="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  @click="confirmarCambioEstado"
                  :disabled="cambiandoEstado"
                  :class="[
                    'w-full sm:w-auto px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2',
                    usuarioParaCambiarEstado?.activo
                      ? 'bg-orange-600 hover:bg-orange-700'
                      : 'bg-green-600 hover:bg-green-700'
                  ]"
                >
                  <svg v-if="cambiandoEstado" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {{ usuarioParaCambiarEstado?.activo ? 'Desactivar' : 'Activar' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Modal Crear/Editar Usuario -->
    <UsuarioFormModal
      :abierto="modalFormAbierto"
      :usuario="usuarioParaEditar"
      @cerrar="cerrarModalForm"
      @guardado="onUsuarioGuardado"
    />

    <!-- Toast Notification -->
    <Teleport to="body">
      <Transition name="toast">
        <div
          v-if="toastVisible"
          class="fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 bg-green-600 text-white rounded-lg shadow-lg"
        >
          <CheckCircleIcon class="w-5 h-5 flex-shrink-0" />
          <span class="text-sm font-medium">{{ toastMensaje }}</span>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.accordion-enter-active,
.accordion-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.accordion-enter-from,
.accordion-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.accordion-enter-to,
.accordion-leave-from {
  opacity: 1;
  max-height: 200px;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-1rem);
}
</style>
