<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import moment from 'moment'
// @ts-ignore
import 'moment/dist/locale/es-mx.js'
import Swal from 'sweetalert2'

import * as productosApi from '@/api/productos'
import { obtenerMensajeError } from '@/api/errorUtils'
import type { Producto, ProductoDetalle } from '@/types'
import { useSucursalStore } from '@/stores/sucursal'
import { useAuthStore } from '@/stores/auth'
import ProductoFormModal from '@/components/ProductoFormModal.vue'
import ProductoBulkUploadModal from '@/components/ProductoBulkUploadModal.vue'
import {
  CubeIcon,
  WrenchScrewdriverIcon
} from '@heroicons/vue/24/solid'
import {
  EyeIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon,
  TagIcon,
  CurrencyDollarIcon,
  QrCodeIcon,
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
  NoSymbolIcon,
  CheckCircleIcon,
  ArrowUpTrayIcon
} from '@heroicons/vue/24/outline'

const sucursalStore = useSucursalStore()
const authStore = useAuthStore()

// Permission checks
const esAdmin = computed(() => authStore.usuario?.nivel === 'admin')
const esGerente = computed(() => authStore.usuario?.nivel === 'gerente')
const puedeEditar = computed(() => esAdmin.value || esGerente.value)

const productos = ref<Producto[]>([])
const cargando = ref(true)
const error = ref<string | null>(null)
const filtroActivo = ref<boolean | undefined>(undefined)
const filtroTipo = ref<'todos' | 'productos' | 'servicios'>('todos')
const busqueda = ref('')

// Modal state
const modalDetallesAbierto = ref(false)
const productoSeleccionado = ref<ProductoDetalle | null>(null)
const cargandoDetalles = ref(false)

// Toggle status modal state
const modalEstadoAbierto = ref(false)
const productoParaCambiarEstado = ref<Producto | null>(null)
const cambiandoEstado = ref(false)

// Delete modal state
const modalEliminarAbierto = ref(false)
const productoParaEliminar = ref<Producto | null>(null)
const eliminando = ref(false)

// Create/Edit modal state
const modalFormAbierto = ref(false)
const productoParaEditar = ref<Producto | null>(null)

// Bulk upload modal state
const modalCargaMasivaAbierto = ref(false)

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

function productoMatchesBusqueda(producto: Producto, query: string): boolean {
  if (!query.trim()) return true

  return (
    fuzzyMatch(producto.nombre, query) ||
    (producto.descripcion ? fuzzyMatch(producto.descripcion, query) : false) ||
    (producto.sku ? fuzzyMatch(producto.sku, query) : false) ||
    (producto.marca ? fuzzyMatch(producto.marca, query) : false) ||
    (producto.modelo ? fuzzyMatch(producto.modelo, query) : false) ||
    (producto.codigoBarras ? fuzzyMatch(producto.codigoBarras, query) : false)
  )
}

const sinSucursal = computed(() => !sucursalStore.sucursalActual)

async function cargarProductos() {
  if (sinSucursal.value) {
    cargando.value = false
    error.value = null
    productos.value = []
    return
  }

  cargando.value = true
  error.value = null
  try {
    const params: { activo?: boolean; esServicio?: boolean } = {}
    if (filtroActivo.value !== undefined) {
      params.activo = filtroActivo.value
    }
    if (filtroTipo.value === 'productos') {
      params.esServicio = false
    } else if (filtroTipo.value === 'servicios') {
      params.esServicio = true
    }
    productos.value = await productosApi.listar(params)
  } catch (err) {
    error.value = obtenerMensajeError(err, 'Error al cargar productos')
  } finally {
    cargando.value = false
  }
}

function cambiarFiltroActivo(valor: boolean | undefined) {
  filtroActivo.value = valor
  cargarProductos()
}

function cambiarFiltroTipo(valor: 'todos' | 'productos' | 'servicios') {
  filtroTipo.value = valor
  cargarProductos()
}

async function verDetalles(id: string) {
  modalDetallesAbierto.value = true
  cargandoDetalles.value = true
  productoSeleccionado.value = null
  try {
    productoSeleccionado.value = await productosApi.obtener(id)
  } catch (err) {
    console.error('Error al cargar detalles del producto:', err)
    mostrarToast('Error al cargar detalles del producto', 'error')
  } finally {
    cargandoDetalles.value = false
  }
}

function cerrarModalDetalles() {
  modalDetallesAbierto.value = false
  productoSeleccionado.value = null
}

function abrirModalCambiarEstado(producto: Producto) {
  productoParaCambiarEstado.value = producto
  modalEstadoAbierto.value = true
}

function cerrarModalEstado() {
  modalEstadoAbierto.value = false
  productoParaCambiarEstado.value = null
}

async function confirmarCambioEstado() {
  if (!productoParaCambiarEstado.value) return

  cambiandoEstado.value = true
  try {
    const nuevoEstado = !productoParaCambiarEstado.value.activo
    await productosApi.actualizar(productoParaCambiarEstado.value.id, { activo: nuevoEstado })

    // Update the product in the local list
    const index = productos.value.findIndex(p => p.id === productoParaCambiarEstado.value!.id)
    const producto = productos.value[index]
    if (producto) {
      producto.activo = nuevoEstado
    }

    cerrarModalEstado()
    mostrarToast(nuevoEstado ? 'Producto activado correctamente' : 'Producto desactivado correctamente')
  } catch (err) {
    console.error('Error al cambiar estado del producto:', err)
    mostrarToast('Error al cambiar estado del producto', 'error')
  } finally {
    cambiandoEstado.value = false
  }
}

function abrirModalEliminar(producto: Producto) {
  productoParaEliminar.value = producto
  modalEliminarAbierto.value = true
}

function cerrarModalEliminar() {
  modalEliminarAbierto.value = false
  productoParaEliminar.value = null
}

async function confirmarEliminar() {
  if (!productoParaEliminar.value) return

  eliminando.value = true
  try {
    await productosApi.eliminar(productoParaEliminar.value.id)

    // Remove the product from the local list
    const index = productos.value.findIndex(p => p.id === productoParaEliminar.value!.id)
    if (index !== -1) {
      productos.value.splice(index, 1)
    }

    cerrarModalEliminar()
    mostrarToast('Producto eliminado correctamente')
  } catch (err) {
    console.error('Error al eliminar producto:', err)
    mostrarToast('Error al eliminar producto', 'error')
  } finally {
    eliminando.value = false
  }
}

function abrirModalCrear() {
  productoParaEditar.value = null
  modalFormAbierto.value = true
}

function abrirModalEditar(producto: Producto) {
  productoParaEditar.value = producto
  modalFormAbierto.value = true
}

function cerrarModalForm() {
  modalFormAbierto.value = false
  productoParaEditar.value = null
}

function abrirModalCargaMasiva() {
  modalCargaMasivaAbierto.value = true
}

function cerrarModalCargaMasiva() {
  modalCargaMasivaAbierto.value = false
}

function manejarCargaMasivaCompletada() {
  // Reload products after bulk upload
  cargarProductos()
  mostrarToast('Importacion completada')
}

function manejarProductoGuardado(producto: Producto) {
  if (productoParaEditar.value) {
    // Update existing product in list
    const index = productos.value.findIndex(p => p.id === producto.id)
    if (index !== -1) {
      productos.value[index] = producto
    }
    mostrarToast('Producto actualizado correctamente')
  } else {
    // Add new product to list
    productos.value.unshift(producto)
    mostrarToast('Producto creado correctamente')
  }
  cerrarModalForm()
}

function formatearFecha(timestamp: number): string {
  return moment.unix(timestamp).locale('es-mx').format('D [de] MMMM [de] YYYY, HH:mm')
}

function formatearPrecio(precio: string | null, moneda: string = 'MXN'): string {
  if (!precio) return '-'
  const num = parseFloat(precio)
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: moneda
  }).format(num)
}

function formatearPorcentaje(valor: string | null): string {
  if (!valor) return '-'
  const num = parseFloat(valor) * 100
  return `${num.toFixed(0)}%`
}

const productosFiltrados = computed(() =>
  productos.value.filter((producto) => productoMatchesBusqueda(producto, busqueda.value))
)

onMounted(() => {
  cargarProductos()
})

// Reload products when sucursal changes
watch(() => sucursalStore.sucursalActual, () => {
  cargarProductos()
})

// ESC key handler for modal
function handleEscKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (modalDetallesAbierto.value) cerrarModalDetalles()
    if (modalEstadoAbierto.value) cerrarModalEstado()
    if (modalEliminarAbierto.value) cerrarModalEliminar()
    if (modalFormAbierto.value) cerrarModalForm()
    if (modalCargaMasivaAbierto.value) cerrarModalCargaMasiva()
  }
}

watch([modalDetallesAbierto, modalEstadoAbierto, modalEliminarAbierto, modalFormAbierto, modalCargaMasivaAbierto], ([detalles, estado, eliminar, form, cargaMasiva]) => {
  if (detalles || estado || eliminar || form || cargaMasiva) {
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
      <h2 class="text-lg sm:text-xl font-semibold text-gray-900">Productos</h2>
      <p class="mt-1 text-sm text-gray-500">
        Catalogo de productos y servicios de la sucursal
      </p>
    </div>

    <!-- Search, Filters and Actions -->
    <div class="flex flex-col gap-3 sm:gap-4">
      <!-- Search and Actions row -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <!-- Search input -->
        <div class="relative flex-1 max-w-md">
          <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            v-model="busqueda"
            type="text"
            placeholder="Buscar por nombre, SKU, marca, modelo..."
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

        <!-- Actions -->
        <div class="flex items-center gap-2 sm:ml-auto">
          <button
            v-if="esAdmin"
            @click="abrirModalCargaMasiva"
            class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors cursor-pointer"
          >
            <ArrowUpTrayIcon class="h-5 w-5" />
            <span class="hidden sm:inline">Importar</span>
          </button>
          <button
            v-if="puedeEditar"
            @click="abrirModalCrear"
            class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors cursor-pointer"
          >
            <PlusIcon class="h-5 w-5" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      <!-- Filters row -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
        <!-- Status filters -->
        <div class="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 -mb-2 sm:mb-0">
          <span class="text-sm text-gray-500 flex-shrink-0">Estado:</span>
          <button
            @click="cambiarFiltroActivo(undefined)"
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
            @click="cambiarFiltroActivo(true)"
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
            @click="cambiarFiltroActivo(false)"
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

        <!-- Type filters -->
        <div class="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 -mb-2 sm:mb-0">
          <span class="text-sm text-gray-500 flex-shrink-0">Tipo:</span>
          <button
            @click="cambiarFiltroTipo('todos')"
            :class="[
              'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex-shrink-0 cursor-pointer',
              filtroTipo === 'todos'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            ]"
          >
            Todos
          </button>
          <button
            @click="cambiarFiltroTipo('productos')"
            :class="[
              'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex-shrink-0 cursor-pointer',
              filtroTipo === 'productos'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            ]"
          >
            Productos
          </button>
          <button
            @click="cambiarFiltroTipo('servicios')"
            :class="[
              'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex-shrink-0 cursor-pointer',
              filtroTipo === 'servicios'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            ]"
          >
            Servicios
          </button>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="cargando" class="flex items-center justify-center h-64">
      <div class="flex items-center gap-3 text-gray-500">
        <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Cargando productos...</span>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="flex items-center justify-center h-64">
      <div class="text-center">
        <p class="text-red-600 mb-4">{{ error }}</p>
        <button
          @click="cargarProductos"
          class="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>

    <!-- No sucursal selected -->
    <div v-else-if="sinSucursal" class="flex items-center justify-center h-64">
      <div class="text-center">
        <CubeIcon class="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p class="text-gray-500 mb-2">Selecciona una sucursal</p>
        <p class="text-sm text-gray-400">Debes seleccionar una sucursal para ver los productos</p>
      </div>
    </div>

    <!-- Products list -->
    <div v-else class="pt-2">
      <!-- Mobile: Card layout -->
      <div class="space-y-3 md:hidden">
        <div
          v-for="producto in productosFiltrados"
          :key="producto.id"
          class="bg-white rounded-xl border border-gray-200 p-4"
        >
          <!-- Product header -->
          <div class="flex items-start gap-3">
            <div class="flex-shrink-0">
              <div
                v-if="producto.imagenPrincipal"
                class="h-12 w-12 rounded-lg overflow-hidden bg-gray-100"
              >
                <img
                  :src="producto.imagenPrincipal"
                  :alt="producto.nombre"
                  class="h-full w-full object-cover"
                />
              </div>
              <div
                v-else
                :class="[
                  'h-12 w-12 rounded-lg flex items-center justify-center',
                  producto.esServicio ? 'bg-purple-100' : 'bg-blue-100'
                ]"
              >
                <WrenchScrewdriverIcon v-if="producto.esServicio" class="h-6 w-6 text-purple-600" />
                <CubeIcon v-else class="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-sm font-medium text-gray-900 truncate">{{ producto.nombre }}</p>
                  <p v-if="producto.marca" class="text-sm text-gray-500 truncate">{{ producto.marca }} {{ producto.modelo ? `- ${producto.modelo}` : '' }}</p>
                  <p v-if="producto.sku" class="text-xs text-gray-400 font-mono">SKU: {{ producto.sku }}</p>
                </div>
                <span
                  :class="[
                    'inline-flex px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0',
                    producto.activo
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  ]"
                >
                  {{ producto.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Product details -->
          <div class="mt-3 pt-3 border-t border-gray-100 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500">Tipo</span>
              <span
                :class="[
                  'inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium',
                  producto.esServicio ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                ]"
              >
                {{ producto.esServicio ? 'Servicio' : 'Producto' }}
              </span>
            </div>
            <div v-if="producto.precioBase" class="flex items-center gap-2 text-sm text-gray-600">
              <CurrencyDollarIcon class="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span class="font-medium">{{ formatearPrecio(producto.precioBase, producto.moneda) }}</span>
            </div>
            <div v-if="producto.codigoBarras" class="flex items-center gap-2 text-sm text-gray-600">
              <QrCodeIcon class="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span class="truncate font-mono text-xs">{{ producto.codigoBarras }}</span>
            </div>
            <div v-if="producto.etiquetas && producto.etiquetas.length > 0" class="flex items-center gap-2">
              <TagIcon class="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="etiqueta in producto.etiquetas.slice(0, 3)"
                  :key="etiqueta"
                  class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600"
                >
                  {{ etiqueta }}
                </span>
                <span v-if="producto.etiquetas.length > 3" class="text-xs text-gray-400">
                  +{{ producto.etiquetas.length - 3 }}
                </span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="mt-3 pt-3 border-t border-gray-100 flex items-center justify-end gap-1">
            <button @click="verDetalles(producto.id)" class="group relative p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer">
              <EyeIcon class="w-5 h-5" />
              <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Ver detalles
              </span>
            </button>
            <button v-if="puedeEditar" @click="abrirModalEditar(producto)" class="group relative p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors cursor-pointer">
              <PencilSquareIcon class="w-5 h-5" />
              <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Editar
              </span>
            </button>
            <button
              v-if="puedeEditar"
              @click="abrirModalCambiarEstado(producto)"
              :class="[
                'group relative p-2 rounded-lg transition-colors cursor-pointer',
                producto.activo
                  ? 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'
                  : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
              ]"
            >
              <NoSymbolIcon v-if="producto.activo" class="w-5 h-5" />
              <CheckCircleIcon v-else class="w-5 h-5" />
              <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {{ producto.activo ? 'Desactivar' : 'Activar' }}
              </span>
            </button>
            <button v-if="esAdmin" @click="abrirModalEliminar(producto)" class="group relative p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
              <TrashIcon class="w-5 h-5" />
              <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Eliminar
              </span>
            </button>
          </div>
        </div>

        <!-- Empty state mobile -->
        <div v-if="productosFiltrados.length === 0" class="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          No se encontraron productos
        </div>
      </div>

      <!-- Desktop: Table layout -->
      <div class="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU / Codigo
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
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
              <tr v-for="producto in productosFiltrados" :key="producto.id" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                      <div
                        v-if="producto.imagenPrincipal"
                        class="h-10 w-10 rounded-lg overflow-hidden bg-gray-100"
                      >
                        <img
                          :src="producto.imagenPrincipal"
                          :alt="producto.nombre"
                          class="h-full w-full object-cover"
                        />
                      </div>
                      <div
                        v-else
                        :class="[
                          'h-10 w-10 rounded-lg flex items-center justify-center',
                          producto.esServicio ? 'bg-purple-100' : 'bg-blue-100'
                        ]"
                      >
                        <WrenchScrewdriverIcon v-if="producto.esServicio" class="h-5 w-5 text-purple-600" />
                        <CubeIcon v-else class="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">{{ producto.nombre }}</div>
                      <div v-if="producto.marca" class="text-sm text-gray-500">{{ producto.marca }} {{ producto.modelo ? `- ${producto.modelo}` : '' }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div v-if="producto.sku" class="text-sm font-mono text-gray-900">{{ producto.sku }}</div>
                  <div v-if="producto.codigoBarras" class="text-xs font-mono text-gray-500 mt-0.5">{{ producto.codigoBarras }}</div>
                  <span v-if="!producto.sku && !producto.codigoBarras" class="text-sm text-gray-400">-</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div v-if="producto.precioBase" class="text-sm font-medium text-gray-900">
                    {{ formatearPrecio(producto.precioBase, producto.moneda) }}
                  </div>
                  <div v-if="producto.costo" class="text-xs text-gray-500 mt-0.5">
                    Costo: {{ formatearPrecio(producto.costo, producto.moneda) }}
                  </div>
                  <span v-if="!producto.precioBase" class="text-sm text-gray-400">-</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    :class="[
                      'inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium',
                      producto.esServicio ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    ]"
                  >
                    {{ producto.esServicio ? 'Servicio' : 'Producto' }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    :class="[
                      'inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium',
                      producto.activo
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    ]"
                  >
                    {{ producto.activo ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right">
                  <div class="flex items-center justify-end gap-1">
                    <button @click="verDetalles(producto.id)" class="group relative p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer">
                      <EyeIcon class="w-4 h-4" />
                      <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Ver detalles
                      </span>
                    </button>
                    <button v-if="puedeEditar" @click="abrirModalEditar(producto)" class="group relative p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors cursor-pointer">
                      <PencilSquareIcon class="w-4 h-4" />
                      <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Editar
                      </span>
                    </button>
                    <button
                      v-if="puedeEditar"
                      @click="abrirModalCambiarEstado(producto)"
                      :class="[
                        'group relative p-1.5 rounded-lg transition-colors cursor-pointer',
                        producto.activo
                          ? 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'
                          : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                      ]"
                    >
                      <NoSymbolIcon v-if="producto.activo" class="w-4 h-4" />
                      <CheckCircleIcon v-else class="w-4 h-4" />
                      <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        {{ producto.activo ? 'Desactivar' : 'Activar' }}
                      </span>
                    </button>
                    <button v-if="esAdmin" @click="abrirModalEliminar(producto)" class="group relative p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
                      <TrashIcon class="w-4 h-4" />
                      <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Eliminar
                      </span>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="productosFiltrados.length === 0">
                <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                  No se encontraron productos
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
            <div class="relative bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
              <!-- Header -->
              <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h3 class="text-lg font-semibold text-gray-900">Detalles del Producto</h3>
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

                <!-- Product details -->
                <div v-else-if="productoSeleccionado" class="space-y-6">
                  <!-- Product header -->
                  <div class="flex items-start gap-4">
                    <div class="flex-shrink-0">
                      <div
                        v-if="productoSeleccionado.imagenPrincipal"
                        class="h-24 w-24 rounded-xl overflow-hidden bg-gray-100"
                      >
                        <img
                          :src="productoSeleccionado.imagenPrincipal"
                          :alt="productoSeleccionado.nombre"
                          class="h-full w-full object-cover"
                        />
                      </div>
                      <div
                        v-else
                        :class="[
                          'h-24 w-24 rounded-xl flex items-center justify-center',
                          productoSeleccionado.esServicio ? 'bg-purple-100' : 'bg-blue-100'
                        ]"
                      >
                        <WrenchScrewdriverIcon v-if="productoSeleccionado.esServicio" class="h-12 w-12 text-purple-600" />
                        <CubeIcon v-else class="h-12 w-12 text-blue-600" />
                      </div>
                    </div>
                    <div class="flex-1">
                      <h4 class="text-xl font-semibold text-gray-900">{{ productoSeleccionado.nombre }}</h4>
                      <p v-if="productoSeleccionado.descripcion" class="text-gray-500 mt-1">{{ productoSeleccionado.descripcion }}</p>
                      <div class="flex flex-wrap items-center gap-2 mt-2">
                        <span
                          :class="[
                            'inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium',
                            productoSeleccionado.esServicio ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          ]"
                        >
                          {{ productoSeleccionado.esServicio ? 'Servicio' : 'Producto' }}
                        </span>
                        <span
                          :class="[
                            'inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium',
                            productoSeleccionado.activo
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          ]"
                        >
                          {{ productoSeleccionado.activo ? 'Activo' : 'Inactivo' }}
                        </span>
                        <span v-if="productoSeleccionado.categoria" class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {{ productoSeleccionado.categoria.nombre }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Identification codes -->
                  <div>
                    <h5 class="text-sm font-medium text-gray-900 mb-3">Identificadores</h5>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div class="bg-gray-50 rounded-lg p-4">
                        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">SKU</p>
                        <p class="text-sm font-medium text-gray-900 font-mono">{{ productoSeleccionado.sku || 'No registrado' }}</p>
                      </div>
                      <div class="bg-gray-50 rounded-lg p-4">
                        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Codigo de Barras</p>
                        <p class="text-sm font-medium text-gray-900 font-mono">{{ productoSeleccionado.codigoBarras || 'No registrado' }}</p>
                      </div>
                      <div class="bg-gray-50 rounded-lg p-4">
                        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Codigo Fabricante</p>
                        <p class="text-sm font-medium text-gray-900 font-mono">{{ productoSeleccionado.codigoFabricante || 'No registrado' }}</p>
                      </div>
                    </div>
                  </div>

                  <!-- Brand and model -->
                  <div v-if="productoSeleccionado.marca || productoSeleccionado.modelo">
                    <h5 class="text-sm font-medium text-gray-900 mb-3">Marca y Modelo</h5>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div class="bg-gray-50 rounded-lg p-4">
                        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Marca</p>
                        <p class="text-sm font-medium text-gray-900">{{ productoSeleccionado.marca || 'No registrada' }}</p>
                      </div>
                      <div class="bg-gray-50 rounded-lg p-4">
                        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Modelo</p>
                        <p class="text-sm font-medium text-gray-900">{{ productoSeleccionado.modelo || 'No registrado' }}</p>
                      </div>
                    </div>
                  </div>

                  <!-- Pricing -->
                  <div>
                    <h5 class="text-sm font-medium text-gray-900 mb-3">Precios</h5>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div class="bg-gray-50 rounded-lg p-4">
                        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Precio Base</p>
                        <p class="text-lg font-semibold text-gray-900">{{ formatearPrecio(productoSeleccionado.precioBase, productoSeleccionado.moneda) }}</p>
                      </div>
                      <div class="bg-gray-50 rounded-lg p-4">
                        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Precio Minimo</p>
                        <p class="text-sm font-medium text-gray-900">{{ formatearPrecio(productoSeleccionado.precioMinimo, productoSeleccionado.moneda) }}</p>
                      </div>
                      <div class="bg-gray-50 rounded-lg p-4">
                        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Costo</p>
                        <p class="text-sm font-medium text-gray-900">{{ formatearPrecio(productoSeleccionado.costo, productoSeleccionado.moneda) }}</p>
                      </div>
                    </div>
                  </div>

                  <!-- Tax info -->
                  <div>
                    <h5 class="text-sm font-medium text-gray-900 mb-3">Impuestos</h5>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div class="bg-gray-50 rounded-lg p-4">
                        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">IVA</p>
                        <p class="text-sm font-medium text-gray-900">
                          {{ productoSeleccionado.exentoIva ? 'Exento' : formatearPorcentaje(productoSeleccionado.tasaIva) }}
                        </p>
                      </div>
                      <div v-if="productoSeleccionado.tasaIeps" class="bg-gray-50 rounded-lg p-4">
                        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">IEPS</p>
                        <p class="text-sm font-medium text-gray-900">{{ formatearPorcentaje(productoSeleccionado.tasaIeps) }}</p>
                      </div>
                      <div class="bg-gray-50 rounded-lg p-4">
                        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Objeto de Impuesto</p>
                        <p class="text-sm font-medium text-gray-900">{{ productoSeleccionado.objetoImp }}</p>
                      </div>
                    </div>
                  </div>

                  <!-- SAT info (if available) -->
                  <div v-if="productoSeleccionado.claveProdServ || productoSeleccionado.claveUnidad">
                    <h5 class="text-sm font-medium text-gray-900 mb-3">Datos SAT</h5>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div class="bg-gray-50 rounded-lg p-4">
                        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Clave Prod/Serv</p>
                        <p class="text-sm font-medium text-gray-900 font-mono">{{ productoSeleccionado.claveProdServ || '-' }}</p>
                      </div>
                      <div class="bg-gray-50 rounded-lg p-4">
                        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Clave Unidad</p>
                        <p class="text-sm font-medium text-gray-900 font-mono">{{ productoSeleccionado.claveUnidad || '-' }}</p>
                      </div>
                      <div class="bg-gray-50 rounded-lg p-4">
                        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">No. Identificacion</p>
                        <p class="text-sm font-medium text-gray-900 font-mono">{{ productoSeleccionado.noIdentificacion || '-' }}</p>
                      </div>
                    </div>
                  </div>

                  <!-- Unit info -->
                  <div v-if="productoSeleccionado.unidad || productoSeleccionado.unidadNombre">
                    <h5 class="text-sm font-medium text-gray-900 mb-3">Unidad de Medida</h5>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div class="bg-gray-50 rounded-lg p-4">
                        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Unidad</p>
                        <p class="text-sm font-medium text-gray-900">
                          {{ productoSeleccionado.unidad?.nombre || productoSeleccionado.unidadNombre || 'No registrada' }}
                          <span v-if="productoSeleccionado.unidad?.codigo" class="text-gray-500">({{ productoSeleccionado.unidad.codigo }})</span>
                        </p>
                      </div>
                      <div v-if="productoSeleccionado.contenidoUnidad" class="bg-gray-50 rounded-lg p-4">
                        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Contenido</p>
                        <p class="text-sm font-medium text-gray-900">{{ productoSeleccionado.contenidoUnidad }}</p>
                      </div>
                    </div>
                  </div>

                  <!-- Inventory info -->
                  <div v-if="productoSeleccionado.inventario">
                    <h5 class="text-sm font-medium text-gray-900 mb-3">Inventario</h5>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div class="bg-gray-50 rounded-lg p-4">
                        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Existencia Actual</p>
                        <p class="text-lg font-semibold text-gray-900">{{ productoSeleccionado.inventario.existenciaActual }}</p>
                      </div>
                      <div class="bg-gray-50 rounded-lg p-4">
                        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Reservado</p>
                        <p class="text-sm font-medium text-gray-900">{{ productoSeleccionado.inventario.existenciaReservada }}</p>
                      </div>
                      <div v-if="productoSeleccionado.inventario.ubicacion" class="bg-gray-50 rounded-lg p-4">
                        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Ubicacion</p>
                        <p class="text-sm font-medium text-gray-900 font-mono">{{ productoSeleccionado.inventario.ubicacion }}</p>
                      </div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                      <div v-if="productoSeleccionado.inventario.existenciaMinima" class="bg-gray-50 rounded-lg p-4">
                        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Stock Minimo</p>
                        <p class="text-sm font-medium text-gray-900">{{ productoSeleccionado.inventario.existenciaMinima }}</p>
                      </div>
                      <div v-if="productoSeleccionado.inventario.existenciaMaxima" class="bg-gray-50 rounded-lg p-4">
                        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Stock Maximo</p>
                        <p class="text-sm font-medium text-gray-900">{{ productoSeleccionado.inventario.existenciaMaxima }}</p>
                      </div>
                      <div v-if="productoSeleccionado.inventario.costoPromedio" class="bg-gray-50 rounded-lg p-4">
                        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Costo Promedio</p>
                        <p class="text-sm font-medium text-gray-900">{{ formatearPrecio(productoSeleccionado.inventario.costoPromedio, productoSeleccionado.moneda) }}</p>
                      </div>
                    </div>
                  </div>

                  <!-- Physical attributes -->
                  <div v-if="productoSeleccionado.peso || productoSeleccionado.largo || productoSeleccionado.ancho || productoSeleccionado.alto">
                    <h5 class="text-sm font-medium text-gray-900 mb-3">Dimensiones</h5>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div v-if="productoSeleccionado.peso" class="bg-gray-50 rounded-lg p-4">
                        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Peso</p>
                        <p class="text-sm font-medium text-gray-900">{{ productoSeleccionado.peso }} kg</p>
                      </div>
                      <div v-if="productoSeleccionado.largo" class="bg-gray-50 rounded-lg p-4">
                        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Largo</p>
                        <p class="text-sm font-medium text-gray-900">{{ productoSeleccionado.largo }} cm</p>
                      </div>
                      <div v-if="productoSeleccionado.ancho" class="bg-gray-50 rounded-lg p-4">
                        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Ancho</p>
                        <p class="text-sm font-medium text-gray-900">{{ productoSeleccionado.ancho }} cm</p>
                      </div>
                      <div v-if="productoSeleccionado.alto" class="bg-gray-50 rounded-lg p-4">
                        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Alto</p>
                        <p class="text-sm font-medium text-gray-900">{{ productoSeleccionado.alto }} cm</p>
                      </div>
                    </div>
                  </div>

                  <!-- Technical specs -->
                  <div v-if="productoSeleccionado.especificaciones && Object.keys(productoSeleccionado.especificaciones).length > 0">
                    <h5 class="text-sm font-medium text-gray-900 mb-3">Especificaciones Tecnicas</h5>
                    <div class="bg-gray-50 rounded-lg p-4">
                      <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                        <div v-for="(valor, clave) in productoSeleccionado.especificaciones" :key="clave" class="flex justify-between sm:block">
                          <dt class="text-xs text-gray-500">{{ clave }}</dt>
                          <dd class="text-sm font-medium text-gray-900">{{ valor }}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  <!-- Tags -->
                  <div v-if="productoSeleccionado.etiquetas && productoSeleccionado.etiquetas.length > 0">
                    <h5 class="text-sm font-medium text-gray-900 mb-3">Etiquetas</h5>
                    <div class="flex flex-wrap gap-2">
                      <span
                        v-for="etiqueta in productoSeleccionado.etiquetas"
                        :key="etiqueta"
                        class="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                      >
                        {{ etiqueta }}
                      </span>
                    </div>
                  </div>

                  <!-- Sales config -->
                  <div>
                    <h5 class="text-sm font-medium text-gray-900 mb-3">Configuracion de Venta</h5>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div class="bg-gray-50 rounded-lg p-4">
                        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Venta al Publico</p>
                        <span
                          :class="[
                            'inline-flex px-2 py-0.5 rounded text-xs font-medium',
                            productoSeleccionado.paraVentaPublico ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
                          ]"
                        >
                          {{ productoSeleccionado.paraVentaPublico ? 'Si' : 'No' }}
                        </span>
                      </div>
                      <div class="bg-gray-50 rounded-lg p-4">
                        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Aplicar Descuento</p>
                        <span
                          :class="[
                            'inline-flex px-2 py-0.5 rounded text-xs font-medium',
                            productoSeleccionado.aplicarDescuento ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
                          ]"
                        >
                          {{ productoSeleccionado.aplicarDescuento ? 'Si' : 'No' }}
                        </span>
                      </div>
                      <div class="bg-gray-50 rounded-lg p-4">
                        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Moneda</p>
                        <p class="text-sm font-medium text-gray-900">{{ productoSeleccionado.moneda }}</p>
                      </div>
                    </div>
                  </div>

                  <!-- ID and timestamps -->
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                    <div>
                      <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">ID</p>
                      <div class="flex items-center gap-2">
                        <p
                          class="text-sm font-medium text-gray-900 font-mono"
                          :title="productoSeleccionado.id"
                        >
                          {{ truncarId(productoSeleccionado.id) }}
                        </p>
                        <button
                          @click="copiarId(productoSeleccionado.id)"
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
                      <p class="text-sm text-gray-700">{{ formatearFecha(productoSeleccionado.creadoEn) }}</p>
                    </div>
                    <div>
                      <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Actualizado</p>
                      <p class="text-sm text-gray-700">{{ formatearFecha(productoSeleccionado.actualizadoEn) }}</p>
                    </div>
                  </div>
                </div>

                <!-- Error state -->
                <div v-else class="text-center py-12 text-gray-500">
                  No se pudieron cargar los detalles del producto
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
                  v-if="productoSeleccionado && puedeEditar"
                  @click="cerrarModalDetalles(); abrirModalEditar(productoSeleccionado)"
                  class="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <PencilSquareIcon class="w-4 h-4" />
                  Editar Producto
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
                  {{ productoParaCambiarEstado?.activo ? 'Desactivar Producto' : 'Activar Producto' }}
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
                      productoParaCambiarEstado?.activo ? 'bg-orange-100' : 'bg-green-100'
                    ]"
                  >
                    <NoSymbolIcon v-if="productoParaCambiarEstado?.activo" class="w-5 h-5 text-orange-600" />
                    <CheckCircleIcon v-else class="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p class="text-sm text-gray-700">
                      <template v-if="productoParaCambiarEstado?.activo">
                        ¿Estas seguro de que deseas desactivar el producto
                        <span class="font-semibold">{{ productoParaCambiarEstado?.nombre }}</span>?
                        El producto no aparecera en las busquedas mientras este desactivado.
                      </template>
                      <template v-else>
                        ¿Estas seguro de que deseas activar el producto
                        <span class="font-semibold">{{ productoParaCambiarEstado?.nombre }}</span>?
                        El producto volvera a estar disponible en el sistema.
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
                    productoParaCambiarEstado?.activo
                      ? 'bg-orange-600 hover:bg-orange-700'
                      : 'bg-green-600 hover:bg-green-700'
                  ]"
                >
                  <svg v-if="cambiandoEstado" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {{ productoParaCambiarEstado?.activo ? 'Desactivar' : 'Activar' }}
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
                <h3 class="text-lg font-semibold text-gray-900">Eliminar Producto</h3>
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
                      ¿Estas seguro de que deseas eliminar el producto
                      <span class="font-semibold">{{ productoParaEliminar?.nombre }}</span>?
                      Esta accion no se puede deshacer y se eliminaran tambien los registros de inventario asociados.
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

    <!-- Modal Crear/Editar Producto -->
    <ProductoFormModal
      :abierto="modalFormAbierto"
      :producto="productoParaEditar"
      @cerrar="cerrarModalForm"
      @guardado="manejarProductoGuardado"
    />

    <!-- Modal Carga Masiva -->
    <ProductoBulkUploadModal
      :abierto="modalCargaMasivaAbierto"
      @cerrar="cerrarModalCargaMasiva"
      @carga-completada="manejarCargaMasivaCompletada"
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
