<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import moment from 'moment'
// @ts-ignore
import 'moment/dist/locale/es-mx.js'
import flatpickr from 'flatpickr'
import 'flatpickr/dist/flatpickr.min.css'
import { Spanish } from 'flatpickr/dist/l10n/es.js'

import * as auditoriaApi from '@/api/auditoria'
import type { AuditoriaEntrada, AccionAuditoria, ListarAuditoriaParams } from '@/types'
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon,
  UserIcon,
  BuildingStorefrontIcon,
  CalendarIcon,
  DocumentTextIcon,
  ArrowPathIcon
} from '@heroicons/vue/24/outline'
import {
  ShieldCheckIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowRightStartOnRectangleIcon,
  ArrowLeftStartOnRectangleIcon,
  PlusCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/vue/24/solid'

// State
const entradas = ref<AuditoriaEntrada[]>([])
const cargando = ref(true)
const error = ref<string | null>(null)
const busqueda = ref('')

// Pagination
const paginaActual = ref(1)
const totalPaginas = ref(1)
const totalRegistros = ref(0)
const limitePorPagina = ref(20)

// Filters
const filtroAccion = ref<AccionAuditoria | undefined>(undefined)
const filtroEntidad = ref<string | undefined>(undefined)
const filtrosVisibles = ref(false)
const filtroDesde = ref<string>('')
const filtroHasta = ref<string>('')

// Flatpickr refs
const filtroDesdeInput = ref<HTMLInputElement | null>(null)
const filtroHastaInput = ref<HTMLInputElement | null>(null)
let flatpickrDesde: flatpickr.Instance | null = null
let flatpickrHasta: flatpickr.Instance | null = null

// Modal state
const modalDetallesAbierto = ref(false)
const entradaSeleccionada = ref<AuditoriaEntrada | null>(null)
const cargandoDetalles = ref(false)

// ID copy functionality
const idCopiado = ref(false)

// Action types for filter (matching API spec)
const accionesDisponibles: { valor: AccionAuditoria; etiqueta: string }[] = [
  { valor: 'CREATE', etiqueta: 'Crear' },
  { valor: 'UPDATE', etiqueta: 'Actualizar' },
  { valor: 'DELETE', etiqueta: 'Eliminar' },
  { valor: 'LOGIN', etiqueta: 'Inicio Sesion' },
  { valor: 'LOGOUT', etiqueta: 'Cierre Sesion' },
  { valor: 'LOGIN_FAILED', etiqueta: 'Login Fallido' },
  { valor: 'REFRESH_FAILED', etiqueta: 'Refresh Fallido' }
]

// Entity types for filter (singular form as per API)
const entidadesDisponibles = [
  { valor: 'usuario', etiqueta: 'Usuarios' },
  { valor: 'sucursal', etiqueta: 'Sucursales' },
  { valor: 'cliente', etiqueta: 'Clientes' },
  { valor: 'permiso', etiqueta: 'Permisos' },
  { valor: 'auth', etiqueta: 'Autenticacion' }
]

// Action icons and colors
const accionConfig: Record<string, { icono: typeof ShieldCheckIcon; color: string; bgColor: string }> = {
  CREATE: { icono: PlusCircleIcon, color: 'text-green-600', bgColor: 'bg-green-100' },
  UPDATE: { icono: PencilSquareIcon, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  DELETE: { icono: TrashIcon, color: 'text-red-600', bgColor: 'bg-red-100' },
  LOGIN: { icono: ArrowRightStartOnRectangleIcon, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  LOGOUT: { icono: ArrowLeftStartOnRectangleIcon, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  LOGIN_FAILED: { icono: ExclamationTriangleIcon, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  REFRESH_FAILED: { icono: ExclamationTriangleIcon, color: 'text-orange-600', bgColor: 'bg-orange-100' }
}

const accionLabels: Record<string, string> = {
  CREATE: 'Crear',
  UPDATE: 'Actualizar',
  DELETE: 'Eliminar',
  LOGIN: 'Inicio Sesion',
  LOGOUT: 'Cierre Sesion',
  LOGIN_FAILED: 'Login Fallido',
  REFRESH_FAILED: 'Refresh Fallido'
}

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

function entradaMatchesBusqueda(entrada: AuditoriaEntrada, query: string): boolean {
  if (!query.trim()) return true

  const nombreEntidad = obtenerNombreEntidad(entrada)
  return Boolean(
    fuzzyMatch(generarDescripcion(entrada), query) ||
    (entrada.usuarioNombre && fuzzyMatch(entrada.usuarioNombre, query)) ||
    fuzzyMatch(entrada.entidad, query) ||
    fuzzyMatch(entrada.entidadId, query) ||
    (entrada.sucursalNombre && fuzzyMatch(entrada.sucursalNombre, query)) ||
    (nombreEntidad?.nombre && fuzzyMatch(nombreEntidad.nombre, query)) ||
    (nombreEntidad?.usuario && fuzzyMatch(nombreEntidad.usuario, query))
  )
}

const entradasFiltradas = computed(() =>
  entradas.value.filter((entrada) => entradaMatchesBusqueda(entrada, busqueda.value))
)

async function cargarAuditoria() {
  cargando.value = true
  error.value = null
  try {
    // Calculate offset from page: offset = (page - 1) * limit
    const offset = (paginaActual.value - 1) * limitePorPagina.value

    const params: ListarAuditoriaParams = {
      limit: limitePorPagina.value,
      offset
    }

    if (filtroAccion.value) {
      params.accion = filtroAccion.value
    }
    if (filtroEntidad.value) {
      params.entidad = filtroEntidad.value
    }
    if (filtroDesde.value) {
      params.desde = moment(filtroDesde.value).unix()
    }
    if (filtroHasta.value) {
      params.hasta = moment(filtroHasta.value).unix()
    }

    const resultado = await auditoriaApi.listar(params)
    entradas.value = resultado.data
    totalRegistros.value = resultado.pagination.total
    // Calculate total pages from total and limit
    totalPaginas.value = Math.ceil(resultado.pagination.total / limitePorPagina.value) || 1
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error al cargar auditoria'
  } finally {
    cargando.value = false
  }
}

function cambiarPagina(pagina: number) {
  if (pagina >= 1 && pagina <= totalPaginas.value) {
    paginaActual.value = pagina
    cargarAuditoria()
  }
}

function limpiarFiltros() {
  filtroAccion.value = undefined
  filtroEntidad.value = undefined
  filtroDesde.value = ''
  filtroHasta.value = ''
  // Clear flatpickr instances
  if (flatpickrDesde) flatpickrDesde.clear()
  if (flatpickrHasta) flatpickrHasta.clear()
  paginaActual.value = 1
  cargarAuditoria()
}

function aplicarFiltros() {
  paginaActual.value = 1
  cargarAuditoria()
}

const hayFiltrosActivos = computed(() => {
  return filtroAccion.value || filtroEntidad.value || filtroDesde.value || filtroHasta.value
})

async function verDetalles(id: string) {
  modalDetallesAbierto.value = true
  cargandoDetalles.value = true
  entradaSeleccionada.value = null
  try {
    entradaSeleccionada.value = await auditoriaApi.obtener(id)
  } catch (err) {
    console.error('Error al cargar detalles de auditoria:', err)
  } finally {
    cargandoDetalles.value = false
  }
}

function cerrarModalDetalles() {
  modalDetallesAbierto.value = false
  entradaSeleccionada.value = null
}

function formatearFecha(timestamp: number): string {
  return moment.unix(timestamp).locale('es-mx').format('D [de] MMMM [de] YYYY, HH:mm:ss')
}

function formatearFechaCorta(timestamp: number): string {
  return moment.unix(timestamp).locale('es-mx').format('DD/MM/YY HH:mm')
}

function formatearFechaRelativa(timestamp: number): string {
  return moment.unix(timestamp).locale('es-mx').fromNow()
}

function getAccionIcon(accion: string) {
  return accionConfig[accion]?.icono || DocumentTextIcon
}

function getAccionColor(accion: string) {
  return accionConfig[accion]?.color || 'text-gray-600'
}

function getAccionBgColor(accion: string) {
  return accionConfig[accion]?.bgColor || 'bg-gray-100'
}

function getAccionLabel(accion: string) {
  return accionLabels[accion] || accion
}

// Entity labels for descriptions
const entidadLabels: Record<string, string> = {
  usuario: 'usuario',
  sucursal: 'sucursal',
  cliente: 'cliente',
  permiso: 'permiso',
  auth: 'sesion'
}

function getEntidadLabel(entidad: string) {
  return entidadLabels[entidad] || entidad
}

// Generate description from action and entity
function generarDescripcion(entrada: AuditoriaEntrada): string {
  const accion = getAccionLabel(entrada.accion).toLowerCase()
  const entidad = getEntidadLabel(entrada.entidad)
  const nombre = obtenerNombreEntidad(entrada)

  if (nombre) {
    return `${accion} ${entidad}: ${nombre.nombre}`
  }
  return `${accion} ${entidad}`
}

function formatearValor(valor: unknown): string {
  if (valor === null) return 'null'
  if (valor === undefined) return '-'
  if (typeof valor === 'string') return valor || '-'
  if (typeof valor === 'boolean') return valor ? 'Si' : 'No'
  if (typeof valor === 'object') return JSON.stringify(valor)
  return String(valor)
}

// Fields to ignore when computing differences
const camposIgnorados = ['id', 'creadoEn', 'actualizadoEn']

function computarDiferencias(valorAnterior: Record<string, unknown> | null, valorNuevo: Record<string, unknown> | null): Array<{ campo: string; antes: string; despues: string }> {
  const diferencias: Array<{ campo: string; antes: string; despues: string }> = []

  if (!valorAnterior && !valorNuevo) return diferencias

  // For CREATE actions (no valorAnterior)
  if (!valorAnterior && valorNuevo) {
    return Object.entries(valorNuevo)
      .filter(([campo]) => !camposIgnorados.includes(campo))
      .slice(0, 5)
      .map(([campo, valor]) => ({
        campo,
        antes: '-',
        despues: formatearValor(valor)
      }))
  }

  // For DELETE actions (no valorNuevo)
  if (valorAnterior && !valorNuevo) {
    return Object.entries(valorAnterior)
      .filter(([campo]) => !camposIgnorados.includes(campo))
      .slice(0, 5)
      .map(([campo, valor]) => ({
        campo,
        antes: formatearValor(valor),
        despues: '-'
      }))
  }

  // For UPDATE actions - find differences
  if (valorAnterior && valorNuevo) {
    for (const campo of Object.keys(valorNuevo)) {
      if (camposIgnorados.includes(campo)) continue

      const antes = valorAnterior[campo]
      const despues = valorNuevo[campo]

      // Compare values (handle objects by stringifying)
      const antesStr = JSON.stringify(antes)
      const despuesStr = JSON.stringify(despues)

      if (antesStr !== despuesStr) {
        diferencias.push({
          campo,
          antes: formatearValor(antes),
          despues: formatearValor(despues)
        })
      }
    }
  }

  return diferencias
}

function obtenerCambiosPrincipales(entrada: AuditoriaEntrada): Array<{ campo: string; antes: string; despues: string }> {
  const diferencias = computarDiferencias(entrada.valorAnterior, entrada.valorNuevo)
  return diferencias.slice(0, 3)
}

function contarCambios(entrada: AuditoriaEntrada): number {
  return computarDiferencias(entrada.valorAnterior, entrada.valorNuevo).length
}

function obtenerNombreEntidad(entrada: AuditoriaEntrada): { nombre: string; usuario?: string } | null {
  const data = entrada.valorNuevo || entrada.valorAnterior
  if (!data) return null

  // Try common name fields based on entity type
  const nombre = data.nombreCompleto || data.nombre || data.razonSocial || data.titulo || data.email
  if (!nombre) return null

  return {
    nombre: String(nombre),
    usuario: data.nombreUsuario ? String(data.nombreUsuario) : undefined
  }
}

// Flatpickr config
const flatpickrConfig: flatpickr.Options.Options = {
  enableTime: true,
  time_24hr: true,
  dateFormat: 'Y-m-d H:i',
  locale: Spanish,
  allowInput: true
}

function initFlatpickr() {
  if (filtroDesdeInput.value && !flatpickrDesde) {
    flatpickrDesde = flatpickr(filtroDesdeInput.value, {
      ...flatpickrConfig,
      onChange: (dates) => {
        filtroDesde.value = dates[0] ? moment(dates[0]).format('YYYY-MM-DDTHH:mm') : ''
      }
    })
    // Set initial value if exists
    if (filtroDesde.value) {
      flatpickrDesde.setDate(filtroDesde.value)
    }
  }
  if (filtroHastaInput.value && !flatpickrHasta) {
    flatpickrHasta = flatpickr(filtroHastaInput.value, {
      ...flatpickrConfig,
      onChange: (dates) => {
        filtroHasta.value = dates[0] ? moment(dates[0]).format('YYYY-MM-DDTHH:mm') : ''
      }
    })
    // Set initial value if exists
    if (filtroHasta.value) {
      flatpickrHasta.setDate(filtroHasta.value)
    }
  }
}

function destroyFlatpickr() {
  if (flatpickrDesde) {
    flatpickrDesde.destroy()
    flatpickrDesde = null
  }
  if (flatpickrHasta) {
    flatpickrHasta.destroy()
    flatpickrHasta = null
  }
}

// Initialize flatpickr when filters become visible
watch(filtrosVisibles, (visible) => {
  if (visible) {
    nextTick(() => initFlatpickr())
  }
})

onMounted(() => {
  cargarAuditoria()
})

// ESC key handler for modal
function handleEscKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && modalDetallesAbierto.value) {
    cerrarModalDetalles()
  }
}

watch(modalDetallesAbierto, (isOpen) => {
  if (isOpen) {
    document.addEventListener('keydown', handleEscKey)
  } else {
    document.removeEventListener('keydown', handleEscKey)
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscKey)
  destroyFlatpickr()
})
</script>

<template>
  <div class="space-y-6 sm:space-y-8">
    <!-- Header -->
    <div>
      <h2 class="text-lg sm:text-xl font-semibold text-gray-900">Registro de Auditoria</h2>
      <p class="mt-1 text-sm text-gray-500">
        Historial de cambios y actividades del sistema
      </p>
    </div>

    <!-- Search, Filters and Actions -->
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <!-- Search input -->
        <div class="relative flex-1 max-w-md">
          <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            v-model="busqueda"
            type="text"
            placeholder="Buscar por descripcion, usuario, entidad..."
            class="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          />
          <button
            v-if="busqueda"
            @click="busqueda = ''"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <XMarkIcon class="h-5 w-5" />
          </button>
        </div>

        <!-- Toggle filters button -->
        <button
          @click="filtrosVisibles = !filtrosVisibles"
          :class="[
            'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer',
            hayFiltrosActivos
              ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          ]"
        >
          <FunnelIcon class="h-5 w-5" />
          <span>Filtros</span>
          <span
            v-if="hayFiltrosActivos"
            class="inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-primary-600 text-white rounded-full"
          >
            !
          </span>
        </button>

        <!-- Refresh button -->
        <button
          @click="cargarAuditoria"
          :disabled="cargando"
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50"
        >
          <ArrowPathIcon :class="['h-5 w-5', cargando ? 'animate-spin' : '']" />
          <span class="hidden sm:inline">Actualizar</span>
        </button>
      </div>

      <!-- Expanded filters -->
      <Transition name="slide">
        <div v-if="filtrosVisibles" class="bg-gray-50 rounded-xl p-4 space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Action filter -->
            <div>
              <label class="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Accion
              </label>
              <select
                v-model="filtroAccion"
                class="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option :value="undefined">Todas las acciones</option>
                <option v-for="accion in accionesDisponibles" :key="accion.valor" :value="accion.valor">
                  {{ accion.etiqueta }}
                </option>
              </select>
            </div>

            <!-- Entity filter -->
            <div>
              <label class="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Entidad
              </label>
              <select
                v-model="filtroEntidad"
                class="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option :value="undefined">Todas las entidades</option>
                <option v-for="entidad in entidadesDisponibles" :key="entidad.valor" :value="entidad.valor">
                  {{ entidad.etiqueta }}
                </option>
              </select>
            </div>

            <!-- Date from filter -->
            <div>
              <label class="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Desde
              </label>
              <input
                ref="filtroDesdeInput"
                type="text"
                placeholder="Seleccionar fecha y hora"
                class="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <!-- Date to filter -->
            <div>
              <label class="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Hasta
              </label>
              <input
                ref="filtroHastaInput"
                type="text"
                placeholder="Seleccionar fecha y hora"
                class="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <!-- Filter actions -->
          <div class="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
            <button
              v-if="hayFiltrosActivos"
              @click="limpiarFiltros"
              class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
            >
              Limpiar filtros
            </button>
            <button
              @click="aplicarFiltros"
              class="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors cursor-pointer"
            >
              Aplicar
            </button>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Loading state -->
    <div v-if="cargando" class="flex items-center justify-center h-64">
      <div class="flex items-center gap-3 text-gray-500">
        <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Cargando registros de auditoria...</span>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="flex items-center justify-center h-64">
      <div class="text-center">
        <p class="text-red-600 mb-4">{{ error }}</p>
        <button
          @click="cargarAuditoria"
          class="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    </div>

    <!-- Audit entries list -->
    <div v-else class="pt-2">
      <!-- Results count -->
      <div class="flex items-center justify-between mb-4">
        <p class="text-sm text-gray-500">
          Mostrando {{ entradasFiltradas.length }} de {{ totalRegistros }} registros
        </p>
      </div>

      <!-- Mobile: Card layout -->
      <div class="space-y-3 md:hidden">
        <div
          v-for="entrada in entradasFiltradas"
          :key="entrada.id"
          class="bg-white rounded-xl border border-gray-200 p-4"
        >
          <!-- Entry header -->
          <div class="flex items-start gap-3">
            <div
              :class="[
                'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
                getAccionBgColor(entrada.accion)
              ]"
            >
              <component :is="getAccionIcon(entrada.accion)" :class="['w-5 h-5', getAccionColor(entrada.accion)]" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-sm font-medium text-gray-900 line-clamp-2">{{ generarDescripcion(entrada) }}</p>
                  <div class="flex items-center gap-2 mt-1 flex-wrap">
                    <span
                      :class="[
                        'inline-flex px-2 py-0.5 rounded text-xs font-medium',
                        getAccionBgColor(entrada.accion),
                        getAccionColor(entrada.accion)
                      ]"
                    >
                      {{ getAccionLabel(entrada.accion) }}
                    </span>
                    <span class="text-xs text-gray-500">
                      <span class="capitalize">{{ entrada.entidad }}</span>
                      <template v-if="obtenerNombreEntidad(entrada)">
                        <span class="text-gray-400"> · {{ obtenerNombreEntidad(entrada)?.nombre }}</span>
                        <span v-if="obtenerNombreEntidad(entrada)?.usuario" class="text-gray-400"> @{{ obtenerNombreEntidad(entrada)?.usuario }}</span>
                      </template>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Entry details -->
          <div class="mt-3 pt-3 border-t border-gray-100 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500 flex items-center gap-1">
                <UserIcon class="w-3.5 h-3.5" />
                Realizado por
              </span>
              <span class="text-xs font-medium text-gray-700">
                {{ entrada.usuarioNombre || 'Sistema' }}
              </span>
            </div>
            <div v-if="entrada.sucursalNombre" class="flex items-center justify-between">
              <span class="text-xs text-gray-500 flex items-center gap-1">
                <BuildingStorefrontIcon class="w-3.5 h-3.5" />
                Sucursal
              </span>
              <span class="text-xs font-medium text-gray-700">
                {{ entrada.sucursalNombre }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500 flex items-center gap-1">
                <CalendarIcon class="w-3.5 h-3.5" />
                Fecha
              </span>
              <span class="text-xs text-gray-700" :title="formatearFecha(entrada.creadoEn)">
                {{ formatearFechaRelativa(entrada.creadoEn) }}
              </span>
            </div>
          </div>

          <!-- Changes -->
          <div v-if="contarCambios(entrada) > 0" class="mt-3 pt-3 border-t border-gray-100">
            <p class="text-xs text-gray-500 mb-2">Cambios:</p>
            <div class="space-y-1.5">
              <div
                v-for="cambio in obtenerCambiosPrincipales(entrada)"
                :key="cambio.campo"
                class="flex items-center gap-2 text-xs"
              >
                <span class="text-gray-600 font-medium">{{ cambio.campo }}:</span>
                <span class="text-red-600 line-through truncate max-w-[80px]">{{ cambio.antes }}</span>
                <span class="text-gray-400">→</span>
                <span class="text-green-600 truncate max-w-[80px]">{{ cambio.despues }}</span>
              </div>
              <span
                v-if="contarCambios(entrada) > 3"
                class="text-[10px] text-gray-400"
              >
                +{{ contarCambios(entrada) - 3 }} mas...
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="mt-3 pt-3 border-t border-gray-100 flex items-center justify-end">
            <button
              @click="verDetalles(entrada.id)"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors cursor-pointer"
            >
              <EyeIcon class="w-4 h-4" />
              Ver detalles
            </button>
          </div>
        </div>

        <!-- Empty state mobile -->
        <div v-if="entradasFiltradas.length === 0" class="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          No se encontraron registros de auditoria
        </div>
      </div>

      <!-- Desktop: Table layout -->
      <div class="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table class="w-full divide-y divide-gray-200">
          <colgroup>
            <col class="w-[140px]" />
            <col class="w-[120px]" />
            <col class="w-[100px]" />
            <col />
            <col class="w-[130px]" />
            <col class="w-[50px]" />
          </colgroup>
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Accion
              </th>
              <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Realizado por
              </th>
              <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Entidad
              </th>
              <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cambios
              </th>
              <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th scope="col" class="px-4 py-3">
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="entrada in entradasFiltradas" :key="entrada.id" class="hover:bg-gray-50">
              <td class="px-4 py-3 whitespace-nowrap">
                <div class="flex items-center gap-2">
                  <div
                    :class="[
                      'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                      getAccionBgColor(entrada.accion)
                    ]"
                  >
                    <component :is="getAccionIcon(entrada.accion)" :class="['w-3.5 h-3.5', getAccionColor(entrada.accion)]" />
                  </div>
                  <span
                    :class="[
                      'inline-flex px-2 py-0.5 rounded text-xs font-medium',
                      getAccionBgColor(entrada.accion),
                      getAccionColor(entrada.accion)
                    ]"
                  >
                    {{ getAccionLabel(entrada.accion) }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="text-sm text-gray-700 truncate block">{{ entrada.usuarioNombre || 'Sistema' }}</span>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-col">
                  <span class="text-sm font-medium text-gray-900 capitalize">{{ entrada.entidad }}</span>
                  <template v-if="obtenerNombreEntidad(entrada)">
                    <span class="text-xs text-gray-500 truncate" :title="obtenerNombreEntidad(entrada)?.nombre">
                      {{ obtenerNombreEntidad(entrada)?.nombre }}
                    </span>
                    <span v-if="obtenerNombreEntidad(entrada)?.usuario" class="text-[10px] text-gray-400">
                      @{{ obtenerNombreEntidad(entrada)?.usuario }}
                    </span>
                  </template>
                  <span v-else-if="entrada.entidadId" class="text-[10px] text-gray-400 font-mono">
                    {{ truncarId(entrada.entidadId) }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-3">
                <!-- Show changes if available -->
                <div v-if="contarCambios(entrada) > 0" class="space-y-1">
                  <div
                    v-for="cambio in obtenerCambiosPrincipales(entrada)"
                    :key="cambio.campo"
                    class="flex items-center gap-2 text-xs flex-wrap"
                  >
                    <span class="text-gray-500 font-medium">{{ cambio.campo }}:</span>
                    <span class="text-red-600 line-through" :title="cambio.antes">{{ cambio.antes }}</span>
                    <span class="text-gray-400">→</span>
                    <span class="text-green-600" :title="cambio.despues">{{ cambio.despues }}</span>
                  </div>
                  <span
                    v-if="contarCambios(entrada) > 3"
                    class="text-[10px] text-gray-400"
                  >
                    +{{ contarCambios(entrada) - 3 }} mas...
                  </span>
                </div>
                <!-- Show description if no changes -->
                <p v-else class="text-sm text-gray-500">{{ generarDescripcion(entrada) }}</p>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <div class="flex flex-col">
                  <span class="text-sm text-gray-900">{{ formatearFechaCorta(entrada.creadoEn) }}</span>
                  <span class="text-[10px] text-gray-400">{{ formatearFechaRelativa(entrada.creadoEn) }}</span>
                </div>
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-right">
                <button
                  @click="verDetalles(entrada.id)"
                  class="group relative p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                >
                  <EyeIcon class="w-4 h-4" />
                  <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    Ver detalles
                  </span>
                </button>
              </td>
            </tr>
            <tr v-if="entradasFiltradas.length === 0">
              <td colspan="6" class="px-4 py-12 text-center text-gray-500">
                No se encontraron registros de auditoria
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPaginas > 1" class="flex items-center justify-between mt-4 px-2">
        <p class="text-sm text-gray-500">
          Pagina {{ paginaActual }} de {{ totalPaginas }}
        </p>
        <div class="flex items-center gap-2">
          <button
            @click="cambiarPagina(paginaActual - 1)"
            :disabled="paginaActual === 1"
            class="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ChevronLeftIcon class="w-4 h-4" />
            <span class="hidden sm:inline">Anterior</span>
          </button>
          <button
            @click="cambiarPagina(paginaActual + 1)"
            :disabled="paginaActual === totalPaginas"
            class="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <span class="hidden sm:inline">Siguiente</span>
            <ChevronRightIcon class="w-4 h-4" />
          </button>
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
                <h3 class="text-lg font-semibold text-gray-900">Detalles del Registro</h3>
                <button
                  @click="cerrarModalDetalles"
                  class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
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

                <!-- Entry details -->
                <div v-else-if="entradaSeleccionada" class="space-y-6">
                  <!-- Action header -->
                  <div class="flex items-center gap-4">
                    <div
                      :class="[
                        'flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center',
                        getAccionBgColor(entradaSeleccionada.accion)
                      ]"
                    >
                      <component
                        :is="getAccionIcon(entradaSeleccionada.accion)"
                        :class="['w-7 h-7', getAccionColor(entradaSeleccionada.accion)]"
                      />
                    </div>
                    <div>
                      <span
                        :class="[
                          'inline-flex px-3 py-1 rounded-lg text-sm font-medium',
                          getAccionBgColor(entradaSeleccionada.accion),
                          getAccionColor(entradaSeleccionada.accion)
                        ]"
                      >
                        {{ getAccionLabel(entradaSeleccionada.accion) }}
                      </span>
                      <p class="text-sm text-gray-500 mt-1 capitalize">{{ entradaSeleccionada.entidad }}</p>
                    </div>
                  </div>

                  <!-- Description -->
                  <div class="bg-gray-50 rounded-lg p-4">
                    <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Descripcion</p>
                    <p class="text-sm text-gray-900">{{ generarDescripcion(entradaSeleccionada) }}</p>
                  </div>

                  <!-- Actor section - Who performed the action -->
                  <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div class="flex items-center gap-2 mb-3">
                      <UserIcon class="w-4 h-4 text-blue-600" />
                      <p class="text-xs font-semibold text-blue-700 uppercase tracking-wide">Realizado por</p>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p class="text-[10px] text-blue-500 uppercase tracking-wide mb-0.5">Usuario</p>
                        <p class="text-sm font-medium text-gray-900">{{ entradaSeleccionada.usuarioNombre || 'Sistema' }}</p>
                      </div>
                      <div>
                        <p class="text-[10px] text-blue-500 uppercase tracking-wide mb-0.5">Sucursal</p>
                        <p class="text-sm font-medium text-gray-900">{{ entradaSeleccionada.sucursalNombre || 'N/A' }}</p>
                      </div>
                      <div class="sm:col-span-2">
                        <p class="text-[10px] text-blue-500 uppercase tracking-wide mb-0.5">Fecha y Hora</p>
                        <p class="text-sm font-medium text-gray-900">{{ formatearFecha(entradaSeleccionada.creadoEn) }}</p>
                      </div>
                    </div>
                  </div>

                  <!-- Target section - What was affected -->
                  <div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div class="flex items-center gap-2 mb-3">
                      <DocumentTextIcon class="w-4 h-4 text-amber-600" />
                      <p class="text-xs font-semibold text-amber-700 uppercase tracking-wide">Registro Afectado</p>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p class="text-[10px] text-amber-500 uppercase tracking-wide mb-0.5">Tipo de Entidad</p>
                        <p class="text-sm font-medium text-gray-900 capitalize">{{ entradaSeleccionada.entidad }}</p>
                      </div>
                      <div v-if="obtenerNombreEntidad(entradaSeleccionada)">
                        <p class="text-[10px] text-amber-500 uppercase tracking-wide mb-0.5">Nombre</p>
                        <p class="text-sm font-medium text-gray-900">
                          {{ obtenerNombreEntidad(entradaSeleccionada)?.nombre }}
                          <span v-if="obtenerNombreEntidad(entradaSeleccionada)?.usuario" class="text-xs text-gray-500">
                            (@{{ obtenerNombreEntidad(entradaSeleccionada)?.usuario }})
                          </span>
                        </p>
                      </div>
                      <div v-if="entradaSeleccionada.entidadId" class="sm:col-span-2">
                        <p class="text-[10px] text-amber-500 uppercase tracking-wide mb-0.5">ID del Registro</p>
                        <div class="flex items-center gap-2">
                          <p class="text-sm font-medium text-gray-900 font-mono" :title="entradaSeleccionada.entidadId">
                            {{ truncarId(entradaSeleccionada.entidadId) }}
                          </p>
                          <button
                            @click="copiarId(entradaSeleccionada.entidadId!)"
                            class="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors cursor-pointer"
                            :title="idCopiado ? 'Copiado!' : 'Copiar ID'"
                          >
                            <ClipboardDocumentCheckIcon v-if="idCopiado" class="w-4 h-4 text-green-600" />
                            <ClipboardDocumentIcon v-else class="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Changes (if any) -->
                  <div v-if="contarCambios(entradaSeleccionada) > 0">
                    <h5 class="text-sm font-medium text-gray-900 mb-3">Cambios Realizados</h5>
                    <div class="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-200">
                      <div
                        v-for="cambio in computarDiferencias(entradaSeleccionada.valorAnterior, entradaSeleccionada.valorNuevo)"
                        :key="cambio.campo"
                        class="px-4 py-3 bg-white"
                      >
                        <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{{ cambio.campo }}</p>
                        <div class="grid grid-cols-2 gap-4">
                          <div class="bg-red-50 rounded p-2">
                            <p class="text-[10px] text-red-500 uppercase tracking-wide mb-1">Antes</p>
                            <p class="text-xs text-red-700 font-mono break-all">
                              {{ cambio.antes }}
                            </p>
                          </div>
                          <div class="bg-green-50 rounded p-2">
                            <p class="text-[10px] text-green-500 uppercase tracking-wide mb-1">Despues</p>
                            <p class="text-xs text-green-700 font-mono break-all">
                              {{ cambio.despues }}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Technical info -->
                  <div class="pt-4 border-t border-gray-200">
                    <h5 class="text-sm font-medium text-gray-900 mb-3">Informacion Tecnica</h5>
                    <div class="space-y-3">
                      <div v-if="entradaSeleccionada.ipAddress" class="flex items-start justify-between">
                        <span class="text-xs text-gray-500">IP</span>
                        <span class="text-xs font-mono text-gray-700">{{ entradaSeleccionada.ipAddress }}</span>
                      </div>
                      <div v-if="entradaSeleccionada.userAgent" class="flex flex-col gap-1">
                        <span class="text-xs text-gray-500">User Agent</span>
                        <span class="text-xs font-mono text-gray-700 break-all">{{ entradaSeleccionada.userAgent }}</span>
                      </div>
                      <div v-if="entradaSeleccionada.pagina" class="flex items-start justify-between">
                        <span class="text-xs text-gray-500">Pagina</span>
                        <span class="text-xs text-gray-700">{{ entradaSeleccionada.pagina }}</span>
                      </div>
                      <div v-if="entradaSeleccionada.componente" class="flex items-start justify-between">
                        <span class="text-xs text-gray-500">Componente</span>
                        <span class="text-xs text-gray-700">{{ entradaSeleccionada.componente }}</span>
                      </div>
                      <div class="flex flex-col gap-1 pt-2 border-t border-gray-100">
                        <span class="text-xs text-gray-500">Hash de Integridad</span>
                        <div class="flex items-center gap-2">
                          <ShieldCheckIcon class="w-4 h-4 text-green-500" />
                          <span class="text-xs font-mono text-gray-600 break-all">{{ entradaSeleccionada.hashActual }}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- ID -->
                  <div class="pt-4 border-t border-gray-200">
                    <div class="flex items-center justify-between">
                      <span class="text-xs text-gray-500">ID del Registro</span>
                      <div class="flex items-center gap-2">
                        <span class="text-xs font-mono text-gray-600" :title="entradaSeleccionada.id">
                          {{ truncarId(entradaSeleccionada.id) }}
                        </span>
                        <button
                          @click="copiarId(entradaSeleccionada.id)"
                          class="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors cursor-pointer"
                          :title="idCopiado ? 'Copiado!' : 'Copiar ID'"
                        >
                          <ClipboardDocumentCheckIcon v-if="idCopiado" class="w-4 h-4 text-green-600" />
                          <ClipboardDocumentIcon v-else class="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Error state -->
                <div v-else class="text-center py-12 text-gray-500">
                  No se pudieron cargar los detalles del registro
                </div>
              </div>

              <!-- Footer -->
              <div class="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <button
                  @click="cerrarModalDetalles"
                  class="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
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

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
