<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import moment from 'moment'
// @ts-ignore
import 'moment/dist/locale/es-mx.js'
import Swal from 'sweetalert2'

import * as clientesApi from '@/api/clientes'
import type { Cliente } from '@/types'
import { useSucursalStore } from '@/stores/sucursal'
import ClienteFormModal from '@/components/ClienteFormModal.vue'
import {
  UserGroupIcon,
  BuildingOfficeIcon
} from '@heroicons/vue/24/solid'
import {
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  PlusIcon,
  NoSymbolIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon
} from '@heroicons/vue/24/outline'

const sucursalStore = useSucursalStore()

const clientes = ref<Cliente[]>([])
const cargando = ref(true)
const error = ref<string | null>(null)
const filtroActivo = ref<boolean | undefined>(undefined)
const busqueda = ref('')

// Modal state
const modalDetallesAbierto = ref(false)
const clienteSeleccionado = ref<Cliente | null>(null)
const cargandoDetalles = ref(false)

// Toggle status modal state
const modalEstadoAbierto = ref(false)
const clienteParaCambiarEstado = ref<Cliente | null>(null)
const cambiandoEstado = ref(false)

// Delete modal state
const modalEliminarAbierto = ref(false)
const clienteParaEliminar = ref<Cliente | null>(null)
const eliminando = ref(false)

// Create/Edit modal state
const modalFormAbierto = ref(false)
const clienteParaEditar = ref<Cliente | null>(null)

// SweetAlert2 toast configuration
const Toast = Swal.mixin({
  toast: true,
  position: 'center',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer
    toast.onmouseleave = Swal.resumeTimer
  }
})

function mostrarToast(mensaje: string, icono: 'success' | 'error' | 'warning' | 'info' = 'success') {
  Toast.fire({
    icon: icono,
    title: mensaje
  })
}

// ID copy functionality
const idCopiado = ref(false)

function truncarId(id: string): string {
  if (id.length <= 13) return id
  return `${id.slice(0, 8)}...${id.slice(-4)}`
}

async function copiarId(id: string) {
  await navigator.clipboard.writeText(id)
  idCopiado.value = true
  setTimeout(() => {
    idCopiado.value = false
  }, 2000)
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

function clienteMatchesBusqueda(cliente: Cliente, query: string): boolean {
  if (!query.trim()) return true

  return (
    fuzzyMatch(cliente.nombre, query) ||
    (cliente.razonSocial ? fuzzyMatch(cliente.razonSocial, query) : false) ||
    (cliente.rfc ? fuzzyMatch(cliente.rfc, query) : false) ||
    (cliente.email ? fuzzyMatch(cliente.email, query) : false) ||
    (cliente.telefono ? fuzzyMatch(cliente.telefono, query) : false) ||
    (cliente.ciudad ? fuzzyMatch(cliente.ciudad, query) : false)
  )
}

const tipoPersonaLabels: Record<string, string> = {
  fisica: 'Persona Fisica',
  moral: 'Persona Moral'
}

const tipoPersonaColors: Record<string, string> = {
  fisica: 'bg-blue-100 text-blue-800',
  moral: 'bg-purple-100 text-purple-800'
}

const sinSucursal = computed(() => !sucursalStore.sucursalActual)

async function cargarClientes() {
  if (sinSucursal.value) {
    cargando.value = false
    error.value = null
    clientes.value = []
    return
  }

  cargando.value = true
  error.value = null
  try {
    clientes.value = await clientesApi.listar(
      filtroActivo.value !== undefined ? { activo: filtroActivo.value } : undefined
    )
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error al cargar clientes'
  } finally {
    cargando.value = false
  }
}

function cambiarFiltro(valor: boolean | undefined) {
  filtroActivo.value = valor
  cargarClientes()
}

async function verDetalles(id: string) {
  modalDetallesAbierto.value = true
  cargandoDetalles.value = true
  clienteSeleccionado.value = null
  try {
    clienteSeleccionado.value = await clientesApi.obtener(id)
  } catch (err) {
    console.error('Error al cargar detalles del cliente:', err)
  } finally {
    cargandoDetalles.value = false
  }
}

function cerrarModalDetalles() {
  modalDetallesAbierto.value = false
  clienteSeleccionado.value = null
}

function abrirModalCambiarEstado(cliente: Cliente) {
  clienteParaCambiarEstado.value = cliente
  modalEstadoAbierto.value = true
}

function cerrarModalEstado() {
  modalEstadoAbierto.value = false
  clienteParaCambiarEstado.value = null
}

async function confirmarCambioEstado() {
  if (!clienteParaCambiarEstado.value) return

  cambiandoEstado.value = true
  try {
    const nuevoEstado = !clienteParaCambiarEstado.value.activo
    await clientesApi.actualizar(clienteParaCambiarEstado.value.id, { activo: nuevoEstado })

    // Update the client in the local list
    const index = clientes.value.findIndex(c => c.id === clienteParaCambiarEstado.value!.id)
    const cliente = clientes.value[index]
    if (cliente) {
      cliente.activo = nuevoEstado
    }

    cerrarModalEstado()
    mostrarToast(nuevoEstado ? 'Cliente activado correctamente' : 'Cliente desactivado correctamente')
  } catch (err) {
    console.error('Error al cambiar estado del cliente:', err)
    mostrarToast('Error al cambiar estado del cliente', 'error')
  } finally {
    cambiandoEstado.value = false
  }
}

function abrirModalEliminar(cliente: Cliente) {
  clienteParaEliminar.value = cliente
  modalEliminarAbierto.value = true
}

function cerrarModalEliminar() {
  modalEliminarAbierto.value = false
  clienteParaEliminar.value = null
}

async function confirmarEliminar() {
  if (!clienteParaEliminar.value) return

  eliminando.value = true
  try {
    await clientesApi.eliminar(clienteParaEliminar.value.id)

    // Remove the client from the local list
    const index = clientes.value.findIndex(c => c.id === clienteParaEliminar.value!.id)
    if (index !== -1) {
      clientes.value.splice(index, 1)
    }

    cerrarModalEliminar()
    mostrarToast('Cliente eliminado correctamente')
  } catch (err) {
    console.error('Error al eliminar cliente:', err)
    mostrarToast('Error al eliminar cliente', 'error')
  } finally {
    eliminando.value = false
  }
}

function abrirModalCrear() {
  clienteParaEditar.value = null
  modalFormAbierto.value = true
}

function abrirModalEditar(cliente: Cliente) {
  clienteParaEditar.value = cliente
  modalFormAbierto.value = true
}

function cerrarModalForm() {
  modalFormAbierto.value = false
  clienteParaEditar.value = null
}

function manejarClienteGuardado(cliente: Cliente) {
  if (clienteParaEditar.value) {
    // Update existing client in list
    const index = clientes.value.findIndex(c => c.id === cliente.id)
    if (index !== -1) {
      clientes.value[index] = cliente
    }
    mostrarToast('Cliente actualizado correctamente')
  } else {
    // Add new client to list
    clientes.value.unshift(cliente)
    mostrarToast('Cliente creado correctamente')
  }
  cerrarModalForm()
}

function formatearFecha(timestamp: number): string {
  return moment.unix(timestamp).locale('es-mx').format('D [de] MMMM [de] YYYY, HH:mm')
}

function formatearUbicacion(cliente: Cliente): string {
  const parts = [cliente.ciudad, cliente.estado].filter(Boolean)
  return parts.join(', ') || 'Sin ubicacion'
}

const clientesFiltrados = computed(() =>
  clientes.value.filter((cliente) => clienteMatchesBusqueda(cliente, busqueda.value))
)

onMounted(() => {
  cargarClientes()
})

// Reload clients when sucursal changes
watch(() => sucursalStore.sucursalActual, () => {
  cargarClientes()
})

// ESC key handler for modal
function handleEscKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (modalDetallesAbierto.value) cerrarModalDetalles()
    if (modalEstadoAbierto.value) cerrarModalEstado()
    if (modalEliminarAbierto.value) cerrarModalEliminar()
    if (modalFormAbierto.value) cerrarModalForm()
  }
}

watch([modalDetallesAbierto, modalEstadoAbierto, modalEliminarAbierto, modalFormAbierto], ([detalles, estado, eliminar, form]) => {
  if (detalles || estado || eliminar || form) {
    document.addEventListener('keydown', handleEscKey)
  } else {
    document.removeEventListener('keydown', handleEscKey)
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscKey)
})
</script>

<template>
  <div class="space-y-6 sm:space-y-8">
    <!-- Header -->
    <div>
      <h2 class="text-lg sm:text-xl font-semibold text-gray-900">Clientes</h2>
      <p class="mt-1 text-sm text-gray-500">
        Gestiona la informacion de tus clientes para facturacion
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
          placeholder="Buscar por nombre, RFC, email, telefono..."
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
          <span>Nuevo Cliente</span>
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
        <span>Cargando clientes...</span>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="flex items-center justify-center h-64">
      <div class="text-center">
        <p class="text-red-600 mb-4">{{ error }}</p>
        <button
          @click="cargarClientes"
          class="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>

    <!-- No sucursal selected -->
    <div v-else-if="sinSucursal" class="flex items-center justify-center h-64">
      <div class="text-center">
        <UserGroupIcon class="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p class="text-gray-500 mb-2">Selecciona una sucursal</p>
        <p class="text-sm text-gray-400">Debes seleccionar una sucursal para ver los clientes</p>
      </div>
    </div>

    <!-- Clients list -->
    <div v-else class="pt-2">
      <!-- Mobile: Card layout -->
      <div class="space-y-3 md:hidden">
        <div
          v-for="cliente in clientesFiltrados"
          :key="cliente.id"
          class="bg-white rounded-xl border border-gray-200 p-4"
        >
          <!-- Client header -->
          <div class="flex items-start gap-3">
            <div class="flex-shrink-0">
              <div
                :class="[
                  'h-12 w-12 rounded-full flex items-center justify-center',
                  cliente.tipoPersona === 'moral' ? 'bg-purple-100' : 'bg-blue-100'
                ]"
              >
                <BuildingOfficeIcon v-if="cliente.tipoPersona === 'moral'" class="h-6 w-6 text-purple-600" />
                <UserGroupIcon v-else class="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-sm font-medium text-gray-900 truncate">{{ cliente.nombre }}</p>
                  <p v-if="cliente.razonSocial" class="text-sm text-gray-500 truncate">{{ cliente.razonSocial }}</p>
                  <p v-if="cliente.rfc" class="text-xs text-gray-400 font-mono">{{ cliente.rfc }}</p>
                </div>
                <span
                  :class="[
                    'inline-flex px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0',
                    cliente.activo
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  ]"
                >
                  {{ cliente.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Client details -->
          <div class="mt-3 pt-3 border-t border-gray-100 space-y-2">
            <div v-if="cliente.tipoPersona" class="flex items-center justify-between">
              <span class="text-xs text-gray-500">Tipo</span>
              <span
                :class="[
                  'inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium',
                  tipoPersonaColors[cliente.tipoPersona]
                ]"
              >
                {{ tipoPersonaLabels[cliente.tipoPersona] }}
              </span>
            </div>
            <div v-if="cliente.email" class="flex items-center gap-2 text-sm text-gray-600">
              <EnvelopeIcon class="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span class="truncate">{{ cliente.email }}</span>
            </div>
            <div v-if="cliente.telefono" class="flex items-center gap-2 text-sm text-gray-600">
              <PhoneIcon class="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span>{{ cliente.telefono }}</span>
            </div>
            <div v-if="cliente.ciudad || cliente.estado" class="flex items-center gap-2 text-sm text-gray-600">
              <MapPinIcon class="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span>{{ formatearUbicacion(cliente) }}</span>
            </div>
            <div v-if="cliente.descuento > 0" class="flex items-center justify-between">
              <span class="text-xs text-gray-500">Descuento</span>
              <span class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                {{ cliente.descuento }}%
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="mt-3 pt-3 border-t border-gray-100 flex items-center justify-end gap-1">
            <button @click="verDetalles(cliente.id)" class="group relative p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer">
              <EyeIcon class="w-5 h-5" />
              <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Ver detalles
              </span>
            </button>
            <button @click="abrirModalEditar(cliente)" class="group relative p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors cursor-pointer">
              <PencilSquareIcon class="w-5 h-5" />
              <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Editar
              </span>
            </button>
            <button
              @click="abrirModalCambiarEstado(cliente)"
              :class="[
                'group relative p-2 rounded-lg transition-colors cursor-pointer',
                cliente.activo
                  ? 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'
                  : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
              ]"
            >
              <NoSymbolIcon v-if="cliente.activo" class="w-5 h-5" />
              <CheckCircleIcon v-else class="w-5 h-5" />
              <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {{ cliente.activo ? 'Desactivar' : 'Activar' }}
              </span>
            </button>
            <button @click="abrirModalEliminar(cliente)" class="group relative p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
              <TrashIcon class="w-5 h-5" />
              <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Eliminar
              </span>
            </button>
          </div>
        </div>

        <!-- Empty state mobile -->
        <div v-if="clientesFiltrados.length === 0" class="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          No se encontraron clientes
        </div>
      </div>

      <!-- Desktop: Table layout -->
      <div class="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  RFC
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contacto
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ubicacion
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="cliente in clientesFiltrados" :key="cliente.id" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                      <div
                        :class="[
                          'h-10 w-10 rounded-full flex items-center justify-center',
                          cliente.tipoPersona === 'moral' ? 'bg-purple-100' : 'bg-blue-100'
                        ]"
                      >
                        <BuildingOfficeIcon v-if="cliente.tipoPersona === 'moral'" class="h-5 w-5 text-purple-600" />
                        <UserGroupIcon v-else class="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">{{ cliente.nombre }}</div>
                      <div v-if="cliente.razonSocial" class="text-sm text-gray-500">{{ cliente.razonSocial }}</div>
                      <span
                        v-if="cliente.tipoPersona"
                        :class="[
                          'inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium mt-0.5',
                          tipoPersonaColors[cliente.tipoPersona]
                        ]"
                      >
                        {{ cliente.tipoPersona === 'moral' ? 'Moral' : 'Fisica' }}
                      </span>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-mono text-gray-900">{{ cliente.rfc || '-' }}</div>
                  <div v-if="cliente.descuento > 0" class="mt-1">
                    <span class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
                      {{ cliente.descuento }}% desc.
                    </span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div v-if="cliente.email" class="flex items-center gap-1.5 text-sm text-gray-600">
                    <EnvelopeIcon class="h-3.5 w-3.5 text-gray-400" />
                    <span class="truncate max-w-[180px]">{{ cliente.email }}</span>
                  </div>
                  <div v-if="cliente.telefono" class="flex items-center gap-1.5 text-sm text-gray-600 mt-0.5">
                    <PhoneIcon class="h-3.5 w-3.5 text-gray-400" />
                    <span>{{ cliente.telefono }}</span>
                  </div>
                  <span v-if="!cliente.email && !cliente.telefono" class="text-sm text-gray-400">-</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div v-if="cliente.ciudad || cliente.estado" class="flex items-center gap-1.5 text-sm text-gray-600">
                    <MapPinIcon class="h-3.5 w-3.5 text-gray-400" />
                    <span>{{ formatearUbicacion(cliente) }}</span>
                  </div>
                  <span v-else class="text-sm text-gray-400">-</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    :class="[
                      'inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium',
                      cliente.activo
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    ]"
                  >
                    {{ cliente.activo ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right">
                  <div class="flex items-center justify-end gap-1">
                    <button @click="verDetalles(cliente.id)" class="group relative p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer">
                      <EyeIcon class="w-4 h-4" />
                      <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Ver detalles
                      </span>
                    </button>
                    <button @click="abrirModalEditar(cliente)" class="group relative p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors cursor-pointer">
                      <PencilSquareIcon class="w-4 h-4" />
                      <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Editar
                      </span>
                    </button>
                    <button
                      @click="abrirModalCambiarEstado(cliente)"
                      :class="[
                        'group relative p-1.5 rounded-lg transition-colors cursor-pointer',
                        cliente.activo
                          ? 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'
                          : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                      ]"
                    >
                      <NoSymbolIcon v-if="cliente.activo" class="w-4 h-4" />
                      <CheckCircleIcon v-else class="w-4 h-4" />
                      <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        {{ cliente.activo ? 'Desactivar' : 'Activar' }}
                      </span>
                    </button>
                    <button @click="abrirModalEliminar(cliente)" class="group relative p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
                      <TrashIcon class="w-4 h-4" />
                      <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Eliminar
                      </span>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="clientesFiltrados.length === 0">
                <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                  No se encontraron clientes
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
                <h3 class="text-lg font-semibold text-gray-900">Detalles del Cliente</h3>
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

                <!-- Client details -->
                <div v-else-if="clienteSeleccionado" class="space-y-6">
                  <!-- Client header -->
                  <div class="flex items-center gap-4">
                    <div class="flex-shrink-0">
                      <div
                        :class="[
                          'h-20 w-20 rounded-full flex items-center justify-center',
                          clienteSeleccionado.tipoPersona === 'moral' ? 'bg-purple-100' : 'bg-blue-100'
                        ]"
                      >
                        <BuildingOfficeIcon v-if="clienteSeleccionado.tipoPersona === 'moral'" class="h-10 w-10 text-purple-600" />
                        <UserGroupIcon v-else class="h-10 w-10 text-blue-600" />
                      </div>
                    </div>
                    <div>
                      <h4 class="text-xl font-semibold text-gray-900">{{ clienteSeleccionado.nombre }}</h4>
                      <p v-if="clienteSeleccionado.razonSocial" class="text-gray-500">{{ clienteSeleccionado.razonSocial }}</p>
                      <div class="flex items-center gap-2 mt-2">
                        <span
                          v-if="clienteSeleccionado.tipoPersona"
                          :class="[
                            'inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium',
                            tipoPersonaColors[clienteSeleccionado.tipoPersona]
                          ]"
                        >
                          {{ tipoPersonaLabels[clienteSeleccionado.tipoPersona] }}
                        </span>
                        <span
                          :class="[
                            'inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium',
                            clienteSeleccionado.activo
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          ]"
                        >
                          {{ clienteSeleccionado.activo ? 'Activo' : 'Inactivo' }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Fiscal info -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="bg-gray-50 rounded-lg p-4">
                      <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">RFC</p>
                      <p class="text-sm font-medium text-gray-900 font-mono">{{ clienteSeleccionado.rfc || 'No registrado' }}</p>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-4">
                      <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Regimen Fiscal</p>
                      <p class="text-sm font-medium text-gray-900">{{ clienteSeleccionado.regimenFiscal || 'No registrado' }}</p>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-4">
                      <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Uso CFDI</p>
                      <p class="text-sm font-medium text-gray-900">{{ clienteSeleccionado.usoCfdi || 'No registrado' }}</p>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-4">
                      <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Descuento</p>
                      <span
                        v-if="clienteSeleccionado.descuento > 0"
                        class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"
                      >
                        {{ clienteSeleccionado.descuento }}%
                      </span>
                      <p v-else class="text-sm font-medium text-gray-900">Sin descuento</p>
                    </div>
                  </div>

                  <!-- Contact info -->
                  <div>
                    <h5 class="text-sm font-medium text-gray-900 mb-3">Informacion de Contacto</h5>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div class="bg-gray-50 rounded-lg p-4">
                        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Email</p>
                        <p class="text-sm font-medium text-gray-900">{{ clienteSeleccionado.email || 'No registrado' }}</p>
                      </div>
                      <div class="bg-gray-50 rounded-lg p-4">
                        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Telefono</p>
                        <p class="text-sm font-medium text-gray-900">{{ clienteSeleccionado.telefono || 'No registrado' }}</p>
                      </div>
                    </div>
                  </div>

                  <!-- Address info -->
                  <div>
                    <h5 class="text-sm font-medium text-gray-900 mb-3">Direccion Fiscal</h5>
                    <div class="bg-gray-50 rounded-lg p-4">
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Calle</p>
                          <p class="text-sm font-medium text-gray-900">{{ clienteSeleccionado.calle || 'No registrada' }}</p>
                        </div>
                        <div>
                          <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Codigo Postal</p>
                          <p class="text-sm font-medium text-gray-900">{{ clienteSeleccionado.codigoPostal || 'No registrado' }}</p>
                        </div>
                        <div>
                          <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Ciudad</p>
                          <p class="text-sm font-medium text-gray-900">{{ clienteSeleccionado.ciudad || 'No registrada' }}</p>
                        </div>
                        <div>
                          <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Estado</p>
                          <p class="text-sm font-medium text-gray-900">{{ clienteSeleccionado.estado || 'No registrado' }}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Additional info -->
                  <div v-if="clienteSeleccionado.observaciones" class="bg-gray-50 rounded-lg p-4">
                    <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Observaciones</p>
                    <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ clienteSeleccionado.observaciones }}</p>
                  </div>

                  <!-- ID and timestamps -->
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                    <div>
                      <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">ID</p>
                      <div class="flex items-center gap-2">
                        <p
                          class="text-sm font-medium text-gray-900 font-mono"
                          :title="clienteSeleccionado.id"
                        >
                          {{ truncarId(clienteSeleccionado.id) }}
                        </p>
                        <button
                          @click="copiarId(clienteSeleccionado.id)"
                          class="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors cursor-pointer"
                          :title="idCopiado ? 'Copiado!' : 'Copiar ID'"
                        >
                          <ClipboardDocumentCheckIcon v-if="idCopiado" class="w-4 h-4 text-green-600" />
                          <ClipboardDocumentIcon v-else class="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Creado</p>
                      <p class="text-sm text-gray-700">{{ formatearFecha(clienteSeleccionado.creadoEn) }}</p>
                    </div>
                    <div>
                      <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Actualizado</p>
                      <p class="text-sm text-gray-700">{{ formatearFecha(clienteSeleccionado.actualizadoEn) }}</p>
                    </div>
                  </div>
                </div>

                <!-- Error state -->
                <div v-else class="text-center py-12 text-gray-500">
                  No se pudieron cargar los detalles del cliente
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
                  v-if="clienteSeleccionado"
                  @click="cerrarModalDetalles(); abrirModalEditar(clienteSeleccionado)"
                  class="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <PencilSquareIcon class="w-4 h-4" />
                  Editar Cliente
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
                  {{ clienteParaCambiarEstado?.activo ? 'Desactivar Cliente' : 'Activar Cliente' }}
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
                      clienteParaCambiarEstado?.activo ? 'bg-orange-100' : 'bg-green-100'
                    ]"
                  >
                    <NoSymbolIcon v-if="clienteParaCambiarEstado?.activo" class="w-5 h-5 text-orange-600" />
                    <CheckCircleIcon v-else class="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p class="text-sm text-gray-700">
                      <template v-if="clienteParaCambiarEstado?.activo">
                        ¿Estas seguro de que deseas desactivar al cliente
                        <span class="font-semibold">{{ clienteParaCambiarEstado?.nombre }}</span>?
                        El cliente no aparecera en las busquedas mientras este desactivado.
                      </template>
                      <template v-else>
                        ¿Estas seguro de que deseas activar al cliente
                        <span class="font-semibold">{{ clienteParaCambiarEstado?.nombre }}</span>?
                        El cliente volvera a estar disponible en el sistema.
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
                    clienteParaCambiarEstado?.activo
                      ? 'bg-orange-600 hover:bg-orange-700'
                      : 'bg-green-600 hover:bg-green-700'
                  ]"
                >
                  <svg v-if="cambiandoEstado" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {{ clienteParaCambiarEstado?.activo ? 'Desactivar' : 'Activar' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Modal Eliminar -->
      <Transition name="modal">
        <div
          v-if="modalEliminarAbierto"
          class="fixed inset-0 z-50 overflow-y-auto"
          @click.self="cerrarModalEliminar"
        >
          <!-- Backdrop -->
          <div class="fixed inset-0 bg-black/50 transition-opacity" @click="cerrarModalEliminar"></div>

          <!-- Modal panel -->
          <div class="relative min-h-screen flex items-center justify-center p-4">
            <div class="relative bg-white rounded-xl shadow-xl max-w-md w-full">
              <!-- Header -->
              <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h3 class="text-lg font-semibold text-gray-900">Eliminar Cliente</h3>
                <button
                  @click="cerrarModalEliminar"
                  class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon class="w-5 h-5" />
                </button>
              </div>

              <!-- Content -->
              <div class="px-6 py-5">
                <div class="flex items-start gap-4">
                  <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-red-100">
                    <TrashIcon class="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p class="text-sm text-gray-700">
                      ¿Estas seguro de que deseas eliminar al cliente
                      <span class="font-semibold">{{ clienteParaEliminar?.nombre }}</span>?
                      Esta accion no se puede deshacer.
                    </p>
                  </div>
                </div>
              </div>

              <!-- Footer -->
              <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <button
                  @click="cerrarModalEliminar"
                  :disabled="eliminando"
                  class="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  @click="confirmarEliminar"
                  :disabled="eliminando"
                  class="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <svg v-if="eliminando" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Modal Crear/Editar Cliente -->
    <ClienteFormModal
      :abierto="modalFormAbierto"
      :cliente="clienteParaEditar"
      @cerrar="cerrarModalForm"
      @guardado="manejarClienteGuardado"
    />
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
</style>
