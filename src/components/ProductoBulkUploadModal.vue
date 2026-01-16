<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Papa from 'papaparse'
import Swal from 'sweetalert2'
import {
  XMarkIcon,
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  TrashIcon
} from '@heroicons/vue/24/outline'
import apiClient from '@/api/client'
import * as productosApi from '@/api/productos'
import { obtenerMensajeError } from '@/api/errorUtils'
import { useSucursalStore } from '@/stores/sucursal'
import type { BulkUploadResponse } from '@/api/productos'

const props = defineProps<{
  abierto: boolean
}>()

const emit = defineEmits<{
  cerrar: []
  cargaCompletada: [resultado: BulkUploadResponse]
}>()

const sucursalStore = useSucursalStore()

// Current step: 'upload' | 'preview' | 'result'
const paso = ref<'upload' | 'preview' | 'result'>('upload')

// File state
const archivo = ref<File | null>(null)
const arrastrando = ref(false)

// Parsed data
const filasParseadas = ref<Record<string, string>[]>([])
const erroresValidacion = ref<{ fila: number; errores: string[] }[]>([])
const paisDetectado = ref<'MX' | 'EC' | null>(null)

// Upload state
const subiendo = ref(false)
const resultadoCarga = ref<BulkUploadResponse | null>(null)

// Toast configuration
const Toast = Swal.mixin({
  toast: true,
  position: 'center',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true
})

// Country from sucursal
const paisSucursal = computed(() => sucursalStore.sucursalActual?.pais ?? 'MX')

// MX columns
const columnasMX = ['nombre', 'descripcion', 'sku', 'codigoBarras', 'marca', 'modelo', 'claveProdServ', 'claveUnidad', 'precioBase', 'costo', 'tasaIva', 'unidadNombre', 'esServicio']

// EC columns
const columnasEC = ['nombre', 'descripcion', 'sku', 'codigoBarras', 'marca', 'modelo', 'codigoPrincipal', 'codigoAuxiliar', 'precioBase', 'costo', 'tasaIva', 'unidadNombre', 'esServicio']

// Detect country from columns
function detectarPais(columnas: string[]): 'MX' | 'EC' | null {
  const columnasLower = columnas.map(c => c.toLowerCase().trim())

  // Check for MX-specific columns
  if (columnasLower.includes('claveprodserv') || columnasLower.includes('claveunidad')) {
    return 'MX'
  }

  // Check for EC-specific columns
  if (columnasLower.includes('codigoprincipal') || columnasLower.includes('codigoauxiliar')) {
    return 'EC'
  }

  // Default to sucursal country
  return paisSucursal.value as 'MX' | 'EC'
}

// Validate a single row
function validarFila(fila: Record<string, string>, _indice: number): string[] {
  const errores: string[] = []

  // Required field: nombre
  if (!fila.nombre || !fila.nombre.trim()) {
    errores.push('El nombre es requerido')
  }

  // Price validation
  if (fila.precioBase && fila.precioBase.trim()) {
    const precio = parseFloat(fila.precioBase)
    if (isNaN(precio) || precio < 0) {
      errores.push('El precio base debe ser un numero valido')
    }
  }

  if (fila.costo && fila.costo.trim()) {
    const costo = parseFloat(fila.costo)
    if (isNaN(costo) || costo < 0) {
      errores.push('El costo debe ser un numero valido')
    }
  }

  // Country-specific validation
  if (paisDetectado.value === 'MX') {
    // SAT claveProdServ validation
    if (fila.claveProdServ && fila.claveProdServ.trim()) {
      if (!/^\d{8}$/.test(fila.claveProdServ.trim())) {
        errores.push('La clave de producto/servicio SAT debe tener 8 digitos')
      }
    }
  }

  // Tax rate validation
  if (fila.tasaIva && fila.tasaIva.trim()) {
    const iva = parseFloat(fila.tasaIva)
    if (isNaN(iva) || iva < 0 || iva > 1) {
      errores.push('La tasa de IVA debe ser un numero entre 0 y 1 (ej: 0.16 para 16%)')
    }
  }

  return errores
}

// Parse the CSV file
function parsearArchivo(file: File) {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      if (results.errors.length > 0) {
        Toast.fire({
          icon: 'error',
          title: 'Error al leer el archivo CSV'
        })
        return
      }

      const columnas = results.meta.fields || []
      paisDetectado.value = detectarPais(columnas)

      // Normalize column names (remove whitespace, convert to camelCase)
      const filasNormalizadas = results.data.map((row: unknown) => {
        const normalizedRow: Record<string, string> = {}
        const rowData = row as Record<string, string>
        for (const [key, value] of Object.entries(rowData)) {
          const normalizedKey = key.trim()
            .replace(/\s+/g, '')
            .replace(/^(.)/, (_, c) => c.toLowerCase())
          normalizedRow[normalizedKey] = (value || '').toString().trim()
        }
        return normalizedRow
      })

      filasParseadas.value = filasNormalizadas

      // Validate all rows
      erroresValidacion.value = filasNormalizadas.map((fila, index) => ({
        fila: index + 2, // +2 because row 1 is header, and we're 0-indexed
        errores: validarFila(fila, index)
      })).filter(e => e.errores.length > 0)

      paso.value = 'preview'
    },
    error: () => {
      Toast.fire({
        icon: 'error',
        title: 'Error al procesar el archivo'
      })
    }
  })
}

// Handle file selection
function manejarArchivo(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    if (!file.name.endsWith('.csv')) {
      Toast.fire({
        icon: 'error',
        title: 'Solo se permiten archivos CSV'
      })
      return
    }
    archivo.value = file
    parsearArchivo(file)
  }
}

// Handle drag and drop
function manejarDrop(event: DragEvent) {
  event.preventDefault()
  arrastrando.value = false

  const file = event.dataTransfer?.files[0]
  if (file) {
    if (!file.name.endsWith('.csv')) {
      Toast.fire({
        icon: 'error',
        title: 'Solo se permiten archivos CSV'
      })
      return
    }
    archivo.value = file
    parsearArchivo(file)
  }
}

function manejarDragOver(event: DragEvent) {
  event.preventDefault()
  arrastrando.value = true
}

function manejarDragLeave() {
  arrastrando.value = false
}

// Download templates
function descargarTemplateMX() {
  // Generate CSV content for Mexico template
  const headers = columnasMX.join(',')
  const sampleRow1 = 'Laptop HP ProBook,Laptop profesional 15.6 pulgadas,PROD-001,7501234567890,HP,ProBook 450 G8,43211500,H87,15999.00,12000.00,0.16,Pieza,false'
  const sampleRow2 = 'Servicio de Mantenimiento,Mantenimiento preventivo de equipos,SERV-001,,,,80141600,E48,500.00,300.00,0.16,Servicio,true'
  const csvContent = `${headers}\n${sampleRow1}\n${sampleRow2}`

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'template_productos_mx.csv'
  link.click()
  URL.revokeObjectURL(link.href)
}

function descargarTemplateEC() {
  // Generate CSV content for Ecuador template
  const headers = columnasEC.join(',')
  const sampleRow1 = 'Laptop HP ProBook,Laptop profesional 15.6 pulgadas,PROD-001,7501234567890,HP,ProBook 450 G8,PROD001,AUX001,1599.00,1200.00,0.12,Unidad,false'
  const sampleRow2 = 'Servicio de Mantenimiento,Mantenimiento preventivo de equipos,SERV-001,,,,SERV001,AUX002,50.00,30.00,0.12,Servicio,true'
  const csvContent = `${headers}\n${sampleRow1}\n${sampleRow2}`

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'template_productos_ec.csv'
  link.click()
  URL.revokeObjectURL(link.href)
}

// Download guides
async function descargarGuia() {
  const country = paisSucursal.value === 'MX' ? 'mx' : 'ec'
  try {
    const response = await apiClient.get(`/productos/guide/${country}`, {
      responseType: 'blob'
    })
    const blob = new Blob([response.data], { type: 'text/markdown' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `guia-carga-masiva-productos-${country}.md`
    link.click()
    URL.revokeObjectURL(link.href)
  } catch (err) {
    Toast.fire({
      icon: 'error',
      title: 'Error al descargar la guia'
    })
  }
}

// Check if row has errors
function tieneErrores(indice: number): boolean {
  return erroresValidacion.value.some(e => e.fila === indice + 2)
}

function obtenerErrores(indice: number): string[] {
  const error = erroresValidacion.value.find(e => e.fila === indice + 2)
  return error?.errores || []
}

// Computed properties
const filasValidas = computed(() =>
  filasParseadas.value.filter((_, i) => !tieneErrores(i))
)

const filasConErrores = computed(() =>
  filasParseadas.value.filter((_, i) => tieneErrores(i))
)

const puedeSubir = computed(() =>
  filasParseadas.value.length > 0 && filasValidas.value.length > 0
)

const columnasVisibles = computed(() => {
  if (paisDetectado.value === 'EC') {
    return columnasEC
  }
  return columnasMX
})

// Upload to backend
async function subirArchivo() {
  if (!archivo.value) return

  subiendo.value = true

  try {
    const resultado = await productosApi.cargaMasiva(archivo.value)
    resultadoCarga.value = resultado
    paso.value = 'result'
    emit('cargaCompletada', resultado)
  } catch (err) {
    Toast.fire({
      icon: 'error',
      title: obtenerMensajeError(err, 'Error al cargar productos')
    })
  } finally {
    subiendo.value = false
  }
}

// Reset state
function reiniciar() {
  archivo.value = null
  filasParseadas.value = []
  erroresValidacion.value = []
  paisDetectado.value = null
  resultadoCarga.value = null
  paso.value = 'upload'
}

// Close modal
function cerrar() {
  reiniciar()
  emit('cerrar')
}

// Go back to upload step
function volverASubir() {
  reiniciar()
}

// Watch for modal open/close
watch(() => props.abierto, (newVal) => {
  if (!newVal) {
    reiniciar()
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="abierto"
        class="fixed inset-0 z-50 overflow-y-auto"
        @click.self="cerrar"
      >
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-black/50 transition-opacity" @click="cerrar"></div>

        <!-- Modal panel -->
        <div class="relative min-h-screen flex items-center justify-center p-4">
          <div class="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 class="text-lg font-semibold text-gray-900">Importar Productos</h3>
              <button
                @click="cerrar"
                class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <XMarkIcon class="w-5 h-5" />
              </button>
            </div>

            <!-- Content -->
            <div class="px-6 py-5 overflow-y-auto max-h-[calc(90vh-130px)]">
              <!-- Step 1: Upload -->
              <div v-if="paso === 'upload'" class="space-y-6">
                <!-- Download templates section -->
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 class="text-sm font-medium text-blue-900 mb-2">Descargar Plantilla y Guia</h4>
                  <p class="text-sm text-blue-700 mb-3">
                    Descarga la plantilla CSV y la guia con los codigos validos para cada campo.
                  </p>
                  <div class="flex flex-wrap gap-3">
                    <button
                      v-if="paisSucursal === 'MX'"
                      @click="descargarTemplateMX"
                      class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      <DocumentArrowDownIcon class="w-4 h-4" />
                      Plantilla CSV
                    </button>
                    <button
                      v-else
                      @click="descargarTemplateEC"
                      class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      <DocumentArrowDownIcon class="w-4 h-4" />
                      Plantilla CSV
                    </button>
                    <button
                      @click="descargarGuia"
                      class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      <DocumentTextIcon class="w-4 h-4" />
                      Guia de Campos
                    </button>
                  </div>
                </div>

                <!-- File upload area -->
                <div
                  @drop="manejarDrop"
                  @dragover="manejarDragOver"
                  @dragleave="manejarDragLeave"
                  :class="[
                    'relative border-2 border-dashed rounded-xl p-8 text-center transition-colors',
                    arrastrando
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-300 hover:border-gray-400'
                  ]"
                >
                  <input
                    type="file"
                    accept=".csv"
                    @change="manejarArchivo"
                    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <ArrowUpTrayIcon class="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p class="text-base font-medium text-gray-700 mb-1">
                    Arrastra tu archivo CSV aqui
                  </p>
                  <p class="text-sm text-gray-500">
                    o haz clic para seleccionar un archivo
                  </p>
                </div>

                <!-- Instructions -->
                <div class="bg-gray-50 rounded-lg p-4">
                  <h4 class="text-sm font-medium text-gray-900 mb-2">Instrucciones</h4>
                  <ul class="text-sm text-gray-600 space-y-1 list-disc list-inside">
                    <li>El archivo debe estar en formato CSV con codificacion UTF-8</li>
                    <li>La primera fila debe contener los nombres de las columnas</li>
                    <li>El campo "nombre" es obligatorio para cada producto</li>
                    <li>El SKU debe ser unico por sucursal</li>
                    <li>Los precios deben ser numeros decimales (ej: 1500.00)</li>
                  </ul>
                </div>
              </div>

              <!-- Step 2: Preview -->
              <div v-else-if="paso === 'preview'" class="space-y-4">
                <!-- Summary -->
                <div class="flex flex-wrap gap-4">
                  <div class="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                    <span class="text-sm text-gray-600">Archivo:</span>
                    <span class="text-sm font-medium text-gray-900">{{ archivo?.name }}</span>
                  </div>
                  <div class="flex items-center gap-2 px-3 py-2 bg-blue-100 rounded-lg">
                    <span class="text-sm text-blue-600">Pais detectado:</span>
                    <span class="text-sm font-medium text-blue-900">{{ paisDetectado === 'MX' ? 'Mexico' : 'Ecuador' }}</span>
                  </div>
                  <div class="flex items-center gap-2 px-3 py-2 bg-green-100 rounded-lg">
                    <CheckCircleIcon class="w-4 h-4 text-green-600" />
                    <span class="text-sm font-medium text-green-900">{{ filasValidas.length }} validas</span>
                  </div>
                  <div v-if="filasConErrores.length > 0" class="flex items-center gap-2 px-3 py-2 bg-red-100 rounded-lg">
                    <ExclamationCircleIcon class="w-4 h-4 text-red-600" />
                    <span class="text-sm font-medium text-red-900">{{ filasConErrores.length }} con errores</span>
                  </div>
                </div>

                <!-- Preview table -->
                <div class="border border-gray-200 rounded-lg overflow-hidden">
                  <div class="overflow-scroll max-h-[400px] scrollbar-visible">
                    <table class="min-w-max divide-y divide-gray-200">
                      <thead class="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12 bg-gray-50">
                            #
                          </th>
                          <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16 bg-gray-50">
                            Estado
                          </th>
                          <th
                            v-for="col in columnasVisibles"
                            :key="col"
                            scope="col"
                            class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50"
                          >
                            {{ col }}
                          </th>
                        </tr>
                      </thead>
                      <tbody class="bg-white divide-y divide-gray-200">
                        <tr
                          v-for="(fila, index) in filasParseadas.slice(0, 100)"
                          :key="index"
                          :class="tieneErrores(index) ? 'bg-red-50' : ''"
                        >
                          <td class="px-3 py-2 text-sm text-gray-500">
                            {{ index + 2 }}
                          </td>
                          <td class="px-3 py-2">
                            <div v-if="tieneErrores(index)" class="group relative">
                              <ExclamationCircleIcon class="w-5 h-5 text-red-500" />
                              <div class="absolute left-0 top-full mt-1 z-10 hidden group-hover:block bg-red-900 text-white text-xs rounded py-2 px-3 min-w-[200px] max-w-[300px]">
                                <ul class="list-disc list-inside space-y-1">
                                  <li v-for="(error, i) in obtenerErrores(index)" :key="i">{{ error }}</li>
                                </ul>
                              </div>
                            </div>
                            <CheckCircleIcon v-else class="w-5 h-5 text-green-500" />
                          </td>
                          <td
                            v-for="col in columnasVisibles"
                            :key="col"
                            class="px-3 py-2 text-sm text-gray-900 whitespace-nowrap"
                          >
                            {{ fila[col] || '-' }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div v-if="filasParseadas.length > 100" class="px-4 py-2 bg-gray-50 text-sm text-gray-500 text-center">
                    Mostrando 100 de {{ filasParseadas.length }} filas
                  </div>
                </div>

                <!-- Warnings -->
                <div v-if="filasConErrores.length > 0" class="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div class="flex items-start gap-3">
                    <ExclamationCircleIcon class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p class="text-sm font-medium text-amber-800">
                        {{ filasConErrores.length }} fila(s) tienen errores de validacion
                      </p>
                      <p class="text-sm text-amber-700 mt-1">
                        Las filas con errores seran ignoradas durante la carga. Solo se importaran los {{ filasValidas.length }} productos validos.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Step 3: Result -->
              <div v-else-if="paso === 'result' && resultadoCarga" class="space-y-6">
                <!-- Success banner -->
                <div
                  :class="[
                    'rounded-lg p-6 text-center',
                    resultadoCarga.summary.imported > 0
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  ]"
                >
                  <CheckCircleIcon
                    v-if="resultadoCarga.summary.imported > 0"
                    class="w-12 h-12 text-green-500 mx-auto mb-3"
                  />
                  <ExclamationCircleIcon
                    v-else
                    class="w-12 h-12 text-red-500 mx-auto mb-3"
                  />
                  <h4
                    :class="[
                      'text-lg font-semibold mb-2',
                      resultadoCarga.summary.imported > 0 ? 'text-green-900' : 'text-red-900'
                    ]"
                  >
                    {{ resultadoCarga.summary.imported > 0 ? 'Carga completada' : 'Error en la carga' }}
                  </h4>
                  <p
                    :class="[
                      'text-sm',
                      resultadoCarga.summary.imported > 0 ? 'text-green-700' : 'text-red-700'
                    ]"
                  >
                    Se importaron {{ resultadoCarga.summary.imported }} de {{ resultadoCarga.summary.total }} productos
                  </p>
                </div>

                <!-- Statistics -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div class="bg-gray-50 rounded-lg p-4 text-center">
                    <p class="text-2xl font-bold text-gray-900">{{ resultadoCarga.summary.total }}</p>
                    <p class="text-sm text-gray-500">Total</p>
                  </div>
                  <div class="bg-green-50 rounded-lg p-4 text-center">
                    <p class="text-2xl font-bold text-green-600">{{ resultadoCarga.summary.imported }}</p>
                    <p class="text-sm text-green-700">Importados</p>
                  </div>
                  <div class="bg-amber-50 rounded-lg p-4 text-center">
                    <p class="text-2xl font-bold text-amber-600">{{ resultadoCarga.summary.skipped }}</p>
                    <p class="text-sm text-amber-700">Omitidos</p>
                  </div>
                  <div class="bg-red-50 rounded-lg p-4 text-center">
                    <p class="text-2xl font-bold text-red-600">{{ resultadoCarga.summary.failed }}</p>
                    <p class="text-sm text-red-700">Fallidos</p>
                  </div>
                </div>

                <!-- Errors list -->
                <div v-if="resultadoCarga.errors.length > 0" class="border border-gray-200 rounded-lg overflow-hidden">
                  <div class="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h4 class="text-sm font-medium text-gray-900">Errores ({{ resultadoCarga.errors.length }})</h4>
                  </div>
                  <div class="max-h-48 overflow-y-auto">
                    <div
                      v-for="error in resultadoCarga.errors"
                      :key="error.row"
                      class="px-4 py-3 border-b border-gray-100 last:border-b-0"
                    >
                      <div class="flex items-start gap-2">
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          Fila {{ error.row }}
                        </span>
                        <div class="text-sm text-red-600">
                          {{ error.errors.join(', ') }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
              <div>
                <button
                  v-if="paso === 'preview'"
                  type="button"
                  @click="volverASubir"
                  class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <TrashIcon class="w-4 h-4" />
                  Cambiar archivo
                </button>
              </div>
              <div class="flex flex-col-reverse sm:flex-row gap-3">
                <button
                  type="button"
                  @click="cerrar"
                  class="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  {{ paso === 'result' ? 'Cerrar' : 'Cancelar' }}
                </button>
                <button
                  v-if="paso === 'preview'"
                  type="button"
                  @click="subirArchivo"
                  :disabled="!puedeSubir || subiendo"
                  class="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg v-if="subiendo" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <ArrowUpTrayIcon v-else class="w-4 h-4" />
                  Importar {{ filasValidas.length }} productos
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
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

/* Force scrollbar to always be visible */
.scrollbar-visible {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #f1f5f9;
}

.scrollbar-visible::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.scrollbar-visible::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.scrollbar-visible::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.scrollbar-visible::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
