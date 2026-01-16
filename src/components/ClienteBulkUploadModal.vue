<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Papa from 'papaparse'
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
import * as clientesApi from '@/api/clientes'
import { obtenerMensajeError } from '@/api/errorUtils'
import { useSucursalStore } from '@/stores/sucursal'
import type { BulkUploadResponse } from '@/api/clientes'

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

// Error message for inline display
const errorMensaje = ref<string | null>(null)

// Country from sucursal
const paisSucursal = computed(() => sucursalStore.sucursalActual?.pais ?? 'MX')

// MX columns
const columnasMX = ['nombre', 'razonSocial', 'tipoPersona', 'rfc', 'regimenFiscal', 'usoCfdi', 'codigoPostal', 'email', 'telefono', 'calle', 'ciudad', 'estado', 'descuento', 'observaciones']

// EC columns
const columnasEC = ['nombre', 'razonSocial', 'tipoPersona', 'tipoIdentificacion', 'numeroIdentificacion', 'regimenFiscal', 'codigoPostal', 'email', 'telefono', 'calle', 'ciudad', 'estado', 'descuento', 'observaciones']

// Detect country from columns
function detectarPais(columnas: string[]): 'MX' | 'EC' | null {
  const columnasLower = columnas.map(c => c.toLowerCase().trim())

  // Check for MX-specific columns
  if (columnasLower.includes('rfc') || columnasLower.includes('usocfdi')) {
    return 'MX'
  }

  // Check for EC-specific columns
  if (columnasLower.includes('tipoidentificacion') || columnasLower.includes('numeroidentificacion')) {
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

  // Email validation
  if (fila.email && fila.email.trim() && !fila.email.includes('@')) {
    errores.push('El email no es valido')
  }

  // Country-specific validation
  if (paisDetectado.value === 'MX') {
    // RFC validation
    if (fila.rfc && fila.rfc.trim()) {
      const rfcLen = fila.rfc.trim().length
      if (rfcLen !== 12 && rfcLen !== 13) {
        errores.push('El RFC debe tener 12 o 13 caracteres')
      }
    }
  } else if (paisDetectado.value === 'EC') {
    // Ecuador identification validation
    if (fila.numeroIdentificacion && fila.numeroIdentificacion.trim()) {
      const numLen = fila.numeroIdentificacion.trim().length
      if (numLen !== 10 && numLen !== 13) {
        errores.push('La identificacion debe tener 10 (cedula) o 13 (RUC) digitos')
      }
    }
  }

  // Discount validation
  if (fila.descuento && fila.descuento.trim()) {
    const desc = parseFloat(fila.descuento)
    if (isNaN(desc) || desc < 0 || desc > 100) {
      errores.push('El descuento debe ser un numero entre 0 y 100')
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
        errorMensaje.value = 'Error al leer el archivo CSV'
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
      errorMensaje.value = 'Error al procesar el archivo'
    }
  })
}

// Handle file selection
function manejarArchivo(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    if (!file.name.endsWith('.csv')) {
      errorMensaje.value = 'Solo se permiten archivos CSV'
      return
    }
    errorMensaje.value = null
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
      errorMensaje.value = 'Solo se permiten archivos CSV'
      return
    }
    errorMensaje.value = null
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
  const sampleRow1 = 'Juan Perez,Juan Perez SA de CV,fisica,XAXX010101000,601,G03,06600,juan@empresa.com,5551234567,Av. Reforma 123,Ciudad de Mexico,CDMX,10,Cliente frecuente'
  const sampleRow2 = 'Empresa ABC,Empresa ABC SA de CV,moral,EMP900101AB1,601,G01,01234,contacto@abc.com,5559876543,Calle Principal 456,Monterrey,NL,5,Mayorista'
  const csvContent = `${headers}\n${sampleRow1}\n${sampleRow2}`

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'template_clientes_mx.csv'
  link.click()
  URL.revokeObjectURL(link.href)
}

function descargarTemplateEC() {
  // Generate CSV content for Ecuador template
  const headers = columnasEC.join(',')
  const sampleRow1 = 'Maria Garcia,Maria Garcia CIA LTDA,fisica,04,1712345678,01,170150,maria@empresa.ec,0991234567,Av. Amazonas 123,Quito,Pichincha,10,Cliente frecuente'
  const sampleRow2 = 'Comercial XYZ,Comercial XYZ SA,moral,04,1791234567001,01,090150,ventas@xyz.ec,0421234567,Malecon 456,Guayaquil,Guayas,5,Distribuidor'
  const csvContent = `${headers}\n${sampleRow1}\n${sampleRow2}`

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'template_clientes_ec.csv'
  link.click()
  URL.revokeObjectURL(link.href)
}

// Download guides
async function descargarGuia() {
  const country = paisSucursal.value === 'MX' ? 'mx' : 'ec'
  try {
    const response = await apiClient.get(`/clientes/guide/${country}`, {
      responseType: 'blob'
    })
    const blob = new Blob([response.data], { type: 'text/markdown' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `guia-carga-masiva-${country}.md`
    link.click()
    URL.revokeObjectURL(link.href)
  } catch (err) {
    errorMensaje.value = 'Error al descargar la guia'
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
    const resultado = await clientesApi.cargaMasiva(archivo.value)
    resultadoCarga.value = resultado
    paso.value = 'result'
    emit('cargaCompletada', resultado)
  } catch (err) {
    errorMensaje.value = obtenerMensajeError(err, 'Error al cargar clientes')
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
  errorMensaje.value = null
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
              <h3 class="text-lg font-semibold text-gray-900">Importar Clientes</h3>
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

                <!-- Error message -->
                <div v-if="errorMensaje" class="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div class="flex items-center gap-3">
                    <ExclamationCircleIcon class="w-5 h-5 text-red-500 flex-shrink-0" />
                    <p class="text-sm font-medium text-red-800">{{ errorMensaje }}</p>
                  </div>
                </div>

                <!-- Instructions -->
                <div class="bg-gray-50 rounded-lg p-4">
                  <h4 class="text-sm font-medium text-gray-900 mb-2">Instrucciones</h4>
                  <ul class="text-sm text-gray-600 space-y-1 list-disc list-inside">
                    <li>El archivo debe estar en formato CSV con codificacion UTF-8</li>
                    <li>La primera fila debe contener los nombres de las columnas</li>
                    <li>El campo "nombre" es obligatorio para cada cliente</li>
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
                        Las filas con errores seran ignoradas durante la carga. Solo se importaran las {{ filasValidas.length }} filas validas.
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
                    Se importaron {{ resultadoCarga.summary.imported }} de {{ resultadoCarga.summary.total }} clientes
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
                  Importar {{ filasValidas.length }} clientes
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
