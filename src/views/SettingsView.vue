<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import moment from 'moment'
// @ts-ignore
import 'moment/dist/locale/es-mx.js'
import Swal from 'sweetalert2'

import * as sucursalesApi from '@/api/sucursales'
import { useSucursalStore } from '@/stores/sucursal'
import type { Sucursal } from '@/types'
import {
  BuildingOffice2Icon,
  Cog6ToothIcon,
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  NoSymbolIcon,
  CheckCircleIcon,
  MapPinIcon,
  PhoneIcon,
  DocumentCheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/vue/24/outline'
import SucursalFormModal from '@/components/SucursalFormModal.vue'

// Tabs configuration
type TabId = 'sucursales' | 'general'

interface Tab {
  id: TabId
  nombre: string
  icono: typeof BuildingOffice2Icon
}

const tabs: Tab[] = [
  { id: 'sucursales', nombre: 'Sucursales', icono: BuildingOffice2Icon },
  { id: 'general', nombre: 'General', icono: Cog6ToothIcon }
]

const tabActivo = ref<TabId>('sucursales')

// Sucursales state
const sucursalStore = useSucursalStore()
const sucursales = ref<Sucursal[]>([])
const cargando = ref(true)
const error = ref<string | null>(null)
const filtroActivo = ref<boolean | undefined>(undefined)
const busqueda = ref('')

// Modal states
const modalFormAbierto = ref(false)
const sucursalParaEditar = ref<Sucursal | null>(null)

// Toggle status modal state
const modalEstadoAbierto = ref(false)
const sucursalParaCambiarEstado = ref<Sucursal | null>(null)
const cambiandoEstado = ref(false)

// Delete modal state
const modalEliminarAbierto = ref(false)
const sucursalParaEliminar = ref<Sucursal | null>(null)
const eliminando = ref(false)

// Field labels for missing fiscal fields
const fieldLabels: Record<string, string> = {
  rfc: 'RFC',
  regimenFiscal: 'Regimen Fiscal',
  codigoPostal: 'Codigo Postal',
  razonSocial: 'Razon Social',
  ruc: 'RUC',
  codigoEstablecimiento: 'Codigo Establecimiento',
  puntoEmision: 'Punto de Emision'
}

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

// Fuzzy search
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

function sucursalMatchesBusqueda(sucursal: Sucursal, query: string): boolean {
  if (!query.trim()) return true

  return (
    fuzzyMatch(sucursal.nombre, query) ||
    !!(sucursal.alias && fuzzyMatch(sucursal.alias, query)) ||
    !!(sucursal.ciudad && fuzzyMatch(sucursal.ciudad, query)) ||
    !!(sucursal.estado && fuzzyMatch(sucursal.estado, query)) ||
    !!(sucursal.razonSocial && fuzzyMatch(sucursal.razonSocial, query)) ||
    !!(sucursal.rfc && fuzzyMatch(sucursal.rfc, query)) ||
    !!(sucursal.telefono && fuzzyMatch(sucursal.telefono, query))
  )
}

const sucursalesFiltradas = computed(() =>
  sucursales.value.filter((sucursal) => sucursalMatchesBusqueda(sucursal, busqueda.value))
)

// Format address from structured fields
function formatearDireccion(sucursal: Sucursal): string {
  const parts: string[] = []

  if (sucursal.calle) {
    let direccion = sucursal.calle
    if (sucursal.numeroExterior) direccion += ` #${sucursal.numeroExterior}`
    if (sucursal.numeroInterior) direccion += ` Int. ${sucursal.numeroInterior}`
    parts.push(direccion)
  }

  if (sucursal.colonia) parts.push(sucursal.colonia)
  if (sucursal.ciudad) {
    let ubicacion = sucursal.ciudad
    if (sucursal.estado) ubicacion += `, ${sucursal.estado}`
    parts.push(ubicacion)
  }
  if (sucursal.codigoPostal) parts.push(`C.P. ${sucursal.codigoPostal}`)

  return parts.length > 0 ? parts.join(', ') : ''
}

// Format missing fields as human-readable list
function formatearCamposFaltantes(campos: string[]): string {
  return campos.map(c => fieldLabels[c] || c).join(', ')
}

async function cargarSucursales() {
  cargando.value = true
  error.value = null
  try {
    sucursales.value = await sucursalesApi.listar(
      filtroActivo.value !== undefined ? { activo: filtroActivo.value } : undefined
    )
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error al cargar sucursales'
  } finally {
    cargando.value = false
  }
}

function cambiarFiltro(valor: boolean | undefined) {
  filtroActivo.value = valor
  cargarSucursales()
}

// Form modal handlers
function abrirModalCrear() {
  sucursalParaEditar.value = null
  modalFormAbierto.value = true
}

function abrirModalEditar(sucursal: Sucursal) {
  sucursalParaEditar.value = sucursal
  modalFormAbierto.value = true
}

function cerrarModalForm() {
  modalFormAbierto.value = false
  sucursalParaEditar.value = null
}

function onSucursalGuardada(sucursal: Sucursal) {
  const esEdicion = !!sucursalParaEditar.value
  if (esEdicion) {
    // Update existing sucursal in the list
    const index = sucursales.value.findIndex(s => s.id === sucursal.id)
    if (index !== -1) {
      sucursales.value[index] = sucursal
    }
  } else {
    // Add new sucursal to the list
    sucursales.value.unshift(sucursal)
  }
  cerrarModalForm()
  mostrarToast(esEdicion ? 'Sucursal actualizada correctamente' : 'Sucursal creada correctamente')

  // Also refresh the store
  sucursalStore.cargarSucursales()
}

// Status change modal handlers
function abrirModalCambiarEstado(sucursal: Sucursal) {
  sucursalParaCambiarEstado.value = sucursal
  modalEstadoAbierto.value = true
}

function cerrarModalEstado() {
  modalEstadoAbierto.value = false
  sucursalParaCambiarEstado.value = null
}

async function confirmarCambioEstado() {
  if (!sucursalParaCambiarEstado.value) return

  cambiandoEstado.value = true
  try {
    const nuevoEstado = !sucursalParaCambiarEstado.value.activo
    const resultado = await sucursalesApi.actualizar(sucursalParaCambiarEstado.value.id, { activo: nuevoEstado })

    // Update in local list
    const index = sucursales.value.findIndex(s => s.id === sucursalParaCambiarEstado.value!.id)
    if (index !== -1) {
      sucursales.value[index] = resultado
    }

    cerrarModalEstado()
    mostrarToast(nuevoEstado ? 'Sucursal activada correctamente' : 'Sucursal desactivada correctamente')

    // Refresh the store
    sucursalStore.cargarSucursales()
  } catch (err) {
    console.error('Error al cambiar estado de la sucursal:', err)
    mostrarToast('Error al cambiar estado de la sucursal', 'error')
  } finally {
    cambiandoEstado.value = false
  }
}

// Delete modal handlers
function abrirModalEliminar(sucursal: Sucursal) {
  sucursalParaEliminar.value = sucursal
  modalEliminarAbierto.value = true
}

function cerrarModalEliminar() {
  modalEliminarAbierto.value = false
  sucursalParaEliminar.value = null
}

async function confirmarEliminar() {
  if (!sucursalParaEliminar.value) return

  eliminando.value = true
  try {
    await sucursalesApi.eliminar(sucursalParaEliminar.value.id)

    // Remove from local list
    sucursales.value = sucursales.value.filter(s => s.id !== sucursalParaEliminar.value!.id)

    cerrarModalEliminar()
    mostrarToast('Sucursal eliminada correctamente')

    // Refresh the store
    sucursalStore.cargarSucursales()
  } catch (err) {
    console.error('Error al eliminar la sucursal:', err)
    mostrarToast('Error al eliminar la sucursal', 'error')
  } finally {
    eliminando.value = false
  }
}

function formatearFecha(timestamp: number): string {
  return moment.unix(timestamp).locale('es-mx').format('D [de] MMMM [de] YYYY')
}

onMounted(() => {
  cargarSucursales()
})
</script>

<template>
  <div class="space-y-6 sm:space-y-8">
    <!-- Header -->
    <div>
      <h2 class="text-lg sm:text-xl font-semibold text-gray-900">Configuracion</h2>
      <p class="mt-1 text-sm text-gray-500">
        Administra las sucursales y configuraciones del sistema
      </p>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200">
      <nav class="-mb-px flex space-x-8" aria-label="Tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="tabActivo = tab.id"
          :class="[
            tabActivo === tab.id
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
            'group inline-flex items-center gap-2 border-b-2 py-4 px-1 text-sm font-medium transition-colors cursor-pointer'
          ]"
        >
          <component
            :is="tab.icono"
            :class="[
              tabActivo === tab.id ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500',
              'h-5 w-5'
            ]"
          />
          {{ tab.nombre }}
        </button>
      </nav>
    </div>

    <!-- Tab Content: Sucursales -->
    <div v-if="tabActivo === 'sucursales'" class="space-y-6">
      <!-- Search, Filters and Actions -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <!-- Search input -->
        <div class="relative flex-1 max-w-md">
          <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            v-model="busqueda"
            type="text"
            placeholder="Buscar por nombre, ciudad, RFC..."
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
            Activas
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
            Inactivas
          </button>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2 sm:ml-auto">
          <button
            @click="abrirModalCrear"
            class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors cursor-pointer"
          >
            <PlusIcon class="h-5 w-5" />
            <span>Crear Sucursal</span>
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
          <span>Cargando sucursales...</span>
        </div>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="flex items-center justify-center h-64">
        <div class="text-center">
          <p class="text-red-600 mb-4">{{ error }}</p>
          <button
            @click="cargarSucursales"
            class="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>

      <!-- Sucursales list -->
      <div v-else class="pt-2">
        <!-- Mobile: Card layout -->
        <div class="space-y-3 md:hidden">
          <div
            v-for="sucursal in sucursalesFiltradas"
            :key="sucursal.id"
            class="bg-white rounded-xl border border-gray-200 p-4"
          >
            <!-- Sucursal header -->
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <BuildingOffice2Icon class="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <p class="text-sm font-medium text-gray-900 truncate">{{ sucursal.nombre }}</p>
                  <span class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                    {{ sucursal.pais }}
                  </span>
                </div>
                <div v-if="formatearDireccion(sucursal)" class="flex items-start gap-2 mt-2">
                  <MapPinIcon class="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <p class="text-sm text-gray-500">{{ formatearDireccion(sucursal) }}</p>
                </div>
                <div v-if="sucursal.telefono" class="flex items-center gap-2 mt-1">
                  <PhoneIcon class="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <p class="text-sm text-gray-500">{{ sucursal.telefono }}</p>
                </div>
              </div>
              <div class="flex flex-col items-end gap-1">
                <span
                  :class="[
                    'inline-flex px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0',
                    sucursal.activo
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  ]"
                >
                  {{ sucursal.activo ? 'Activa' : 'Inactiva' }}
                </span>
              </div>
            </div>

            <!-- Fiscal info -->
            <div class="mt-3 pt-3 border-t border-gray-100">
              <div class="flex items-center gap-2">
                <template v-if="sucursal.facturaReady">
                  <DocumentCheckIcon class="h-4 w-4 text-green-500" />
                  <span class="text-xs text-green-700">Lista para facturar</span>
                </template>
                <template v-else>
                  <ExclamationTriangleIcon class="h-4 w-4 text-amber-500" />
                  <span class="text-xs text-amber-700">
                    Faltan datos fiscales
                    <span v-if="sucursal.facturaReadyMissing" class="text-gray-500">
                      ({{ formatearCamposFaltantes(sucursal.facturaReadyMissing) }})
                    </span>
                  </span>
                </template>
              </div>
              <p class="text-xs text-gray-400 mt-1">Creada el {{ formatearFecha(sucursal.creadoEn) }}</p>
            </div>

            <!-- Actions -->
            <div class="mt-3 pt-3 border-t border-gray-100 flex items-center justify-end gap-1">
              <button @click="abrirModalEditar(sucursal)" class="group relative p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors cursor-pointer">
                <PencilSquareIcon class="w-5 h-5" />
                <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Editar
                </span>
              </button>
              <button
                @click="abrirModalCambiarEstado(sucursal)"
                :class="[
                  'group relative p-2 rounded-lg transition-colors cursor-pointer',
                  sucursal.activo
                    ? 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'
                    : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                ]"
              >
                <NoSymbolIcon v-if="sucursal.activo" class="w-5 h-5" />
                <CheckCircleIcon v-else class="w-5 h-5" />
                <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {{ sucursal.activo ? 'Desactivar' : 'Activar' }}
                </span>
              </button>
              <button @click="abrirModalEliminar(sucursal)" class="group relative p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
                <TrashIcon class="w-5 h-5" />
                <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Eliminar
                </span>
              </button>
            </div>
          </div>

          <!-- Empty state mobile -->
          <div v-if="sucursalesFiltradas.length === 0" class="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
            No se encontraron sucursales
          </div>
        </div>

        <!-- Desktop: Table layout -->
        <div class="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sucursal
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ubicacion
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Facturacion
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
                <tr v-for="sucursal in sucursalesFiltradas" :key="sucursal.id" class="hover:bg-gray-50">
                  <td class="px-6 py-4">
                    <div class="flex items-start gap-3">
                      <BuildingOffice2Icon class="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <div class="flex items-center gap-2">
                          <span class="text-sm font-medium text-gray-900">{{ sucursal.nombre }}</span>
                          <span class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                            {{ sucursal.pais }}
                          </span>
                        </div>
                        <p v-if="sucursal.razonSocial" class="text-xs text-gray-500 mt-0.5">{{ sucursal.razonSocial }}</p>
                        <p v-if="sucursal.rfc" class="text-xs text-gray-400 font-mono">{{ sucursal.rfc }}</p>
                        <p v-else-if="sucursal.ruc" class="text-xs text-gray-400 font-mono">RUC: {{ sucursal.ruc }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <div class="max-w-xs">
                      <p v-if="formatearDireccion(sucursal)" class="text-sm text-gray-500 truncate" :title="formatearDireccion(sucursal)">
                        {{ formatearDireccion(sucursal) }}
                      </p>
                      <p v-else class="text-sm text-gray-400">-</p>
                      <p v-if="sucursal.telefono" class="text-xs text-gray-400 mt-0.5">{{ sucursal.telefono }}</p>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex items-start gap-2">
                      <template v-if="sucursal.facturaReady">
                        <DocumentCheckIcon class="h-4 w-4 text-green-500 mt-0.5" />
                        <span class="text-xs text-green-700">Lista</span>
                      </template>
                      <template v-else>
                        <ExclamationTriangleIcon class="h-4 w-4 text-amber-500 mt-0.5" />
                        <div>
                          <span class="text-xs text-amber-700">Incompleta</span>
                          <p v-if="sucursal.facturaReadyMissing" class="text-[10px] text-gray-500 mt-0.5 max-w-[120px]">
                            {{ formatearCamposFaltantes(sucursal.facturaReadyMissing) }}
                          </p>
                        </div>
                      </template>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span
                      :class="[
                        'inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium',
                        sucursal.activo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      ]"
                    >
                      {{ sucursal.activo ? 'Activa' : 'Inactiva' }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right">
                    <div class="flex items-center justify-end gap-1">
                      <button @click="abrirModalEditar(sucursal)" class="group relative p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors cursor-pointer">
                        <PencilSquareIcon class="w-4 h-4" />
                        <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          Editar
                        </span>
                      </button>
                      <button
                        @click="abrirModalCambiarEstado(sucursal)"
                        :class="[
                          'group relative p-1.5 rounded-lg transition-colors cursor-pointer',
                          sucursal.activo
                            ? 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'
                            : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                        ]"
                      >
                        <NoSymbolIcon v-if="sucursal.activo" class="w-4 h-4" />
                        <CheckCircleIcon v-else class="w-4 h-4" />
                        <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          {{ sucursal.activo ? 'Desactivar' : 'Activar' }}
                        </span>
                      </button>
                      <button @click="abrirModalEliminar(sucursal)" class="group relative p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
                        <TrashIcon class="w-4 h-4" />
                        <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          Eliminar
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="sucursalesFiltradas.length === 0">
                  <td colspan="5" class="px-6 py-12 text-center text-gray-500">
                    No se encontraron sucursales
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab Content: General -->
    <div v-if="tabActivo === 'general'" class="flex items-center justify-center h-64">
      <p class="text-gray-400">Configuracion general (proximamente)</p>
    </div>

    <!-- Modal Cambiar Estado -->
    <Teleport to="body">
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
                  {{ sucursalParaCambiarEstado?.activo ? 'Desactivar Sucursal' : 'Activar Sucursal' }}
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
                      sucursalParaCambiarEstado?.activo ? 'bg-orange-100' : 'bg-green-100'
                    ]"
                  >
                    <NoSymbolIcon v-if="sucursalParaCambiarEstado?.activo" class="w-5 h-5 text-orange-600" />
                    <CheckCircleIcon v-else class="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p class="text-sm text-gray-700">
                      <template v-if="sucursalParaCambiarEstado?.activo">
                        ¿Estas seguro de que deseas desactivar la sucursal
                        <span class="font-semibold">{{ sucursalParaCambiarEstado?.nombre }}</span>?
                        Los usuarios no podran seleccionar esta sucursal mientras este desactivada.
                      </template>
                      <template v-else>
                        ¿Estas seguro de que deseas activar la sucursal
                        <span class="font-semibold">{{ sucursalParaCambiarEstado?.nombre }}</span>?
                        Los usuarios podran seleccionar esta sucursal nuevamente.
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
                  class="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  @click="confirmarCambioEstado"
                  :disabled="cambiandoEstado"
                  :class="[
                    'w-full sm:w-auto px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer',
                    sucursalParaCambiarEstado?.activo
                      ? 'bg-orange-600 hover:bg-orange-700'
                      : 'bg-green-600 hover:bg-green-700'
                  ]"
                >
                  <svg v-if="cambiandoEstado" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {{ sucursalParaCambiarEstado?.activo ? 'Desactivar' : 'Activar' }}
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
                <h3 class="text-lg font-semibold text-gray-900">Eliminar Sucursal</h3>
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
                      ¿Estas seguro de que deseas eliminar la sucursal
                      <span class="font-semibold">{{ sucursalParaEliminar?.nombre }}</span>?
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
                  class="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  @click="confirmarEliminar"
                  :disabled="eliminando"
                  class="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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

    <!-- Modal Crear/Editar Sucursal -->
    <SucursalFormModal
      :abierto="modalFormAbierto"
      :sucursal="sucursalParaEditar"
      @cerrar="cerrarModalForm"
      @guardado="onSucursalGuardada"
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
