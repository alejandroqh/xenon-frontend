<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { XMarkIcon, ChevronDownIcon, PlusIcon, TrashIcon } from '@heroicons/vue/24/outline'
import * as productosApi from '@/api/productos'
import { obtenerMensajeError } from '@/api/errorUtils'
import { useSucursalStore } from '@/stores/sucursal'
import type { Producto, CrearProductoRequest, ObjetoImpuesto } from '@/types'

const props = defineProps<{
  abierto: boolean
  producto?: Producto | null
}>()

const emit = defineEmits<{
  cerrar: []
  guardado: [producto: Producto]
}>()

const sucursalStore = useSucursalStore()

// Form state
const guardando = ref(false)
const errorForm = ref<string | null>(null)

// Country derived from sucursal
const paisActual = computed(() => sucursalStore.sucursalActual?.pais ?? 'MX')
const esMexico = computed(() => paisActual.value === 'MX')

// Collapsible sections
const seccionesExpandidas = ref({
  identificacion: true,
  precios: false,
  impuestos: false,
  sat: false,
  dimensiones: false,
  especificaciones: false,
  configuracion: false
})

// Form fields - Basic
const nombre = ref('')
const descripcion = ref('')
const marca = ref('')
const modelo = ref('')
const esServicio = ref(false)

// Form fields - Identifiers
const sku = ref('')
const codigoBarras = ref('')
const codigoFabricante = ref('')

// Form fields - SAT Mexico
const claveProdServ = ref('')
const claveUnidad = ref('')
const noIdentificacion = ref('')

// Form fields - Ecuador SRI
const codigoPrincipal = ref('')
const codigoAuxiliar = ref('')

// Form fields - Pricing
const precioBase = ref('')
const precioMinimo = ref('')
const costo = ref('')
const moneda = ref('MXN')

// Form fields - Tax
const tasaIva = ref('0.16')
const exentoIva = ref(false)
const tasaIeps = ref('')
const objetoImp = ref<ObjetoImpuesto>('02')

// Form fields - Unit
const unidadNombre = ref('')
const contenidoUnidad = ref('')

// Form fields - Categorization
const etiquetas = ref<string[]>([])
const etiquetaInput = ref('')

// Form fields - Physical
const peso = ref('')
const largo = ref('')
const ancho = ref('')
const alto = ref('')

// Form fields - Specs
const especificaciones = ref<{ clave: string; valor: string }[]>([])

// Form fields - Config
const paraVentaPublico = ref(true)
const aplicarDescuento = ref(true)

const esEdicion = computed(() => !!props.producto)
const titulo = computed(() => esEdicion.value ? 'Editar Producto' : 'Nuevo Producto')

const objetoImpOptions: { value: ObjetoImpuesto; label: string }[] = [
  { value: '01', label: '01 - No objeto de impuesto' },
  { value: '02', label: '02 - Si objeto de impuesto' },
  { value: '03', label: '03 - Si objeto de impuesto y no obligado al desglose' },
  { value: '04', label: '04 - Si objeto de impuesto y no causa impuesto' }
]

const monedaOptions = [
  { value: 'MXN', label: 'MXN - Peso Mexicano' },
  { value: 'USD', label: 'USD - Dolar Estadounidense' },
  { value: 'EUR', label: 'EUR - Euro' }
]

const tasaIvaOptions = [
  { value: '0.16', label: '16%' },
  { value: '0.08', label: '8%' },
  { value: '0', label: '0%' }
]

// Reset form when modal opens/closes or producto changes
watch(
  () => [props.abierto, props.producto],
  () => {
    if (props.abierto) {
      resetForm()
    }
  },
  { immediate: true }
)

function toggleSeccion(seccion: keyof typeof seccionesExpandidas.value) {
  seccionesExpandidas.value[seccion] = !seccionesExpandidas.value[seccion]
}

function resetForm() {
  errorForm.value = null

  if (props.producto) {
    // Edit mode: populate from existing producto
    nombre.value = props.producto.nombre
    descripcion.value = props.producto.descripcion || ''
    marca.value = props.producto.marca || ''
    modelo.value = props.producto.modelo || ''
    esServicio.value = props.producto.esServicio

    // Identifiers
    sku.value = props.producto.sku || ''
    codigoBarras.value = props.producto.codigoBarras || ''
    codigoFabricante.value = props.producto.codigoFabricante || ''

    // SAT
    claveProdServ.value = props.producto.claveProdServ || ''
    claveUnidad.value = props.producto.claveUnidad || ''
    noIdentificacion.value = props.producto.noIdentificacion || ''

    // Ecuador
    codigoPrincipal.value = props.producto.codigoPrincipal || ''
    codigoAuxiliar.value = props.producto.codigoAuxiliar || ''

    // Pricing
    precioBase.value = props.producto.precioBase || ''
    precioMinimo.value = props.producto.precioMinimo || ''
    costo.value = props.producto.costo || ''
    moneda.value = props.producto.moneda || 'MXN'

    // Tax
    tasaIva.value = props.producto.tasaIva || '0.16'
    exentoIva.value = props.producto.exentoIva
    tasaIeps.value = props.producto.tasaIeps || ''
    objetoImp.value = props.producto.objetoImp || '02'

    // Unit
    unidadNombre.value = props.producto.unidadNombre || ''
    contenidoUnidad.value = props.producto.contenidoUnidad || ''

    // Tags
    etiquetas.value = props.producto.etiquetas ? [...props.producto.etiquetas] : []
    etiquetaInput.value = ''

    // Physical
    peso.value = props.producto.peso || ''
    largo.value = props.producto.largo || ''
    ancho.value = props.producto.ancho || ''
    alto.value = props.producto.alto || ''

    // Specs
    if (props.producto.especificaciones) {
      especificaciones.value = Object.entries(props.producto.especificaciones).map(([clave, valor]) => ({
        clave,
        valor
      }))
    } else {
      especificaciones.value = []
    }

    // Config
    paraVentaPublico.value = props.producto.paraVentaPublico
    aplicarDescuento.value = props.producto.aplicarDescuento

    // Collapse all sections when editing
    seccionesExpandidas.value = {
      identificacion: false,
      precios: false,
      impuestos: false,
      sat: false,
      dimensiones: false,
      especificaciones: false,
      configuracion: false
    }
  } else {
    // Create mode: reset to defaults
    nombre.value = ''
    descripcion.value = ''
    marca.value = ''
    modelo.value = ''
    esServicio.value = false

    sku.value = ''
    codigoBarras.value = ''
    codigoFabricante.value = ''

    claveProdServ.value = ''
    claveUnidad.value = ''
    noIdentificacion.value = ''

    codigoPrincipal.value = ''
    codigoAuxiliar.value = ''

    precioBase.value = ''
    precioMinimo.value = ''
    costo.value = ''
    moneda.value = esMexico.value ? 'MXN' : 'USD'

    tasaIva.value = '0.16'
    exentoIva.value = false
    tasaIeps.value = ''
    objetoImp.value = '02'

    unidadNombre.value = ''
    contenidoUnidad.value = ''

    etiquetas.value = []
    etiquetaInput.value = ''

    peso.value = ''
    largo.value = ''
    ancho.value = ''
    alto.value = ''

    especificaciones.value = []

    paraVentaPublico.value = true
    aplicarDescuento.value = true

    seccionesExpandidas.value = {
      identificacion: true,
      precios: false,
      impuestos: false,
      sat: false,
      dimensiones: false,
      especificaciones: false,
      configuracion: false
    }
  }
}

function cerrar() {
  emit('cerrar')
}

// Tags management
function agregarEtiqueta() {
  const tag = etiquetaInput.value.trim()
  if (tag && !etiquetas.value.includes(tag)) {
    etiquetas.value.push(tag)
  }
  etiquetaInput.value = ''
}

function eliminarEtiqueta(index: number) {
  etiquetas.value.splice(index, 1)
}

function manejarEtiquetaKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault()
    agregarEtiqueta()
  }
}

// Specs management
function agregarEspecificacion() {
  especificaciones.value.push({ clave: '', valor: '' })
}

function eliminarEspecificacion(index: number) {
  especificaciones.value.splice(index, 1)
}

function validarForm(): string | null {
  if (!nombre.value.trim()) {
    return 'El nombre del producto es requerido'
  }

  // Validate prices are valid numbers if provided
  if (precioBase.value && isNaN(parseFloat(precioBase.value))) {
    return 'El precio base debe ser un numero valido'
  }
  if (precioMinimo.value && isNaN(parseFloat(precioMinimo.value))) {
    return 'El precio minimo debe ser un numero valido'
  }
  if (costo.value && isNaN(parseFloat(costo.value))) {
    return 'El costo debe ser un numero valido'
  }

  // Mexico SAT validation
  if (esMexico.value && claveProdServ.value) {
    if (!/^\d{8}$/.test(claveProdServ.value)) {
      return 'La clave de producto/servicio SAT debe tener 8 digitos'
    }
  }

  return null
}

async function guardar() {
  const error = validarForm()
  if (error) {
    errorForm.value = error
    return
  }

  guardando.value = true
  errorForm.value = null

  try {
    let resultado: Producto

    // Build especificaciones object
    const especificacionesObj: Record<string, string> = {}
    for (const spec of especificaciones.value) {
      if (spec.clave.trim() && spec.valor.trim()) {
        especificacionesObj[spec.clave.trim()] = spec.valor.trim()
      }
    }

    const datos: CrearProductoRequest = {
      nombre: nombre.value.trim(),
      descripcion: descripcion.value.trim() || null,
      marca: marca.value.trim() || null,
      modelo: modelo.value.trim() || null,
      esServicio: esServicio.value,

      // Identifiers
      sku: sku.value.trim() || null,
      codigoBarras: codigoBarras.value.trim() || null,
      codigoFabricante: codigoFabricante.value.trim() || null,

      // SAT (Mexico)
      claveProdServ: claveProdServ.value.trim() || null,
      claveUnidad: claveUnidad.value.trim() || null,
      noIdentificacion: noIdentificacion.value.trim() || null,

      // SRI (Ecuador)
      codigoPrincipal: codigoPrincipal.value.trim() || null,
      codigoAuxiliar: codigoAuxiliar.value.trim() || null,

      // Pricing
      precioBase: precioBase.value.trim() || null,
      precioMinimo: precioMinimo.value.trim() || null,
      costo: costo.value.trim() || null,
      moneda: moneda.value,

      // Tax
      tasaIva: tasaIva.value,
      exentoIva: exentoIva.value,
      tasaIeps: tasaIeps.value.trim() || null,
      objetoImp: objetoImp.value,

      // Unit
      unidadNombre: unidadNombre.value.trim() || null,
      contenidoUnidad: contenidoUnidad.value.trim() || null,

      // Tags
      etiquetas: etiquetas.value.length > 0 ? etiquetas.value : null,

      // Physical
      peso: peso.value.trim() || null,
      largo: largo.value.trim() || null,
      ancho: ancho.value.trim() || null,
      alto: alto.value.trim() || null,

      // Specs
      especificaciones: Object.keys(especificacionesObj).length > 0 ? especificacionesObj : null,

      // Config
      paraVentaPublico: paraVentaPublico.value,
      aplicarDescuento: aplicarDescuento.value
    }

    if (esEdicion.value && props.producto) {
      resultado = await productosApi.actualizar(props.producto.id, datos)
    } else {
      resultado = await productosApi.crear(datos)
    }

    emit('guardado', resultado)
  } catch (err: unknown) {
    errorForm.value = obtenerMensajeError(err, 'Error al guardar producto')
  } finally {
    guardando.value = false
  }
}
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
          <div class="relative bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 class="text-lg font-semibold text-gray-900">{{ titulo }}</h3>
              <button
                @click="cerrar"
                class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <XMarkIcon class="w-5 h-5" />
              </button>
            </div>

            <!-- Content -->
            <form @submit.prevent="guardar" class="px-6 py-5 overflow-y-auto max-h-[calc(90vh-130px)]">
              <!-- Error message -->
              <div
                v-if="errorForm"
                class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
              >
                {{ errorForm }}
              </div>

              <div class="space-y-6">
                <!-- Basic Info Section -->
                <div>
                  <h4 class="text-sm font-medium text-gray-900 mb-4">Informacion Basica</h4>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <!-- Nombre -->
                    <div class="sm:col-span-2">
                      <label for="nombre" class="block text-sm font-medium text-gray-700 mb-1">
                        Nombre <span class="text-red-500">*</span>
                      </label>
                      <input
                        id="nombre"
                        v-model="nombre"
                        type="text"
                        class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Ej: Laptop HP ProBook"
                      />
                    </div>

                    <!-- Descripcion -->
                    <div class="sm:col-span-2">
                      <label for="descripcion" class="block text-sm font-medium text-gray-700 mb-1">
                        Descripcion
                      </label>
                      <textarea
                        id="descripcion"
                        v-model="descripcion"
                        rows="2"
                        class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                        placeholder="Descripcion del producto..."
                      ></textarea>
                    </div>

                    <!-- Marca -->
                    <div>
                      <label for="marca" class="block text-sm font-medium text-gray-700 mb-1">
                        Marca
                      </label>
                      <input
                        id="marca"
                        v-model="marca"
                        type="text"
                        class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Ej: HP"
                      />
                    </div>

                    <!-- Modelo -->
                    <div>
                      <label for="modelo" class="block text-sm font-medium text-gray-700 mb-1">
                        Modelo
                      </label>
                      <input
                        id="modelo"
                        v-model="modelo"
                        type="text"
                        class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Ej: ProBook 450 G8"
                      />
                    </div>

                    <!-- Es Servicio -->
                    <div class="sm:col-span-2">
                      <label class="flex items-center gap-3 cursor-pointer">
                        <input
                          v-model="esServicio"
                          type="checkbox"
                          class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span class="text-sm font-medium text-gray-700">Es un servicio (no un producto fisico)</span>
                      </label>
                    </div>
                  </div>
                </div>

                <!-- Identification Section (Collapsible) -->
                <div class="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    @click="toggleSeccion('identificacion')"
                    class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <span class="text-sm font-medium text-gray-900">Identificadores</span>
                    <ChevronDownIcon
                      :class="[
                        'w-4 h-4 text-gray-400 transition-transform duration-200',
                        seccionesExpandidas.identificacion ? 'rotate-180' : ''
                      ]"
                    />
                  </button>
                  <Transition name="accordion">
                    <div v-if="seccionesExpandidas.identificacion" class="p-4 border-t border-gray-200">
                      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label for="sku" class="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                          <input
                            id="sku"
                            v-model="sku"
                            type="text"
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Ej: PROD-001"
                          />
                        </div>
                        <div>
                          <label for="codigoBarras" class="block text-sm font-medium text-gray-700 mb-1">Codigo de Barras</label>
                          <input
                            id="codigoBarras"
                            v-model="codigoBarras"
                            type="text"
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Ej: 7501234567890"
                          />
                        </div>
                        <div>
                          <label for="codigoFabricante" class="block text-sm font-medium text-gray-700 mb-1">Codigo Fabricante</label>
                          <input
                            id="codigoFabricante"
                            v-model="codigoFabricante"
                            type="text"
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Ej: MFG-12345"
                          />
                        </div>
                      </div>
                    </div>
                  </Transition>
                </div>

                <!-- Pricing Section (Collapsible) -->
                <div class="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    @click="toggleSeccion('precios')"
                    class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <span class="text-sm font-medium text-gray-900">Precios</span>
                    <ChevronDownIcon
                      :class="[
                        'w-4 h-4 text-gray-400 transition-transform duration-200',
                        seccionesExpandidas.precios ? 'rotate-180' : ''
                      ]"
                    />
                  </button>
                  <Transition name="accordion">
                    <div v-if="seccionesExpandidas.precios" class="p-4 border-t border-gray-200">
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label for="precioBase" class="block text-sm font-medium text-gray-700 mb-1">Precio Base</label>
                          <input
                            id="precioBase"
                            v-model="precioBase"
                            type="text"
                            inputmode="decimal"
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Ej: 1500.00"
                          />
                        </div>
                        <div>
                          <label for="precioMinimo" class="block text-sm font-medium text-gray-700 mb-1">Precio Minimo</label>
                          <input
                            id="precioMinimo"
                            v-model="precioMinimo"
                            type="text"
                            inputmode="decimal"
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Ej: 1200.00"
                          />
                        </div>
                        <div>
                          <label for="costo" class="block text-sm font-medium text-gray-700 mb-1">Costo</label>
                          <input
                            id="costo"
                            v-model="costo"
                            type="text"
                            inputmode="decimal"
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Ej: 1000.00"
                          />
                        </div>
                        <div>
                          <label for="moneda" class="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                          <select
                            id="moneda"
                            v-model="moneda"
                            class="w-full h-[38px] px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                          >
                            <option v-for="opt in monedaOptions" :key="opt.value" :value="opt.value">
                              {{ opt.label }}
                            </option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </Transition>
                </div>

                <!-- Tax Section (Collapsible) -->
                <div class="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    @click="toggleSeccion('impuestos')"
                    class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <span class="text-sm font-medium text-gray-900">Impuestos</span>
                    <ChevronDownIcon
                      :class="[
                        'w-4 h-4 text-gray-400 transition-transform duration-200',
                        seccionesExpandidas.impuestos ? 'rotate-180' : ''
                      ]"
                    />
                  </button>
                  <Transition name="accordion">
                    <div v-if="seccionesExpandidas.impuestos" class="p-4 border-t border-gray-200">
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label for="tasaIva" class="block text-sm font-medium text-gray-700 mb-1">Tasa IVA</label>
                          <select
                            id="tasaIva"
                            v-model="tasaIva"
                            :disabled="exentoIva"
                            class="w-full h-[38px] px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white disabled:bg-gray-100"
                          >
                            <option v-for="opt in tasaIvaOptions" :key="opt.value" :value="opt.value">
                              {{ opt.label }}
                            </option>
                          </select>
                        </div>
                        <div class="flex items-end">
                          <label class="flex items-center gap-3 cursor-pointer pb-2">
                            <input
                              v-model="exentoIva"
                              type="checkbox"
                              class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                            />
                            <span class="text-sm font-medium text-gray-700">Exento de IVA</span>
                          </label>
                        </div>
                        <div>
                          <label for="tasaIeps" class="block text-sm font-medium text-gray-700 mb-1">Tasa IEPS</label>
                          <input
                            id="tasaIeps"
                            v-model="tasaIeps"
                            type="text"
                            inputmode="decimal"
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Ej: 0.08"
                          />
                        </div>
                        <div>
                          <label for="objetoImp" class="block text-sm font-medium text-gray-700 mb-1">Objeto de Impuesto</label>
                          <select
                            id="objetoImp"
                            v-model="objetoImp"
                            class="w-full h-[38px] px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                          >
                            <option v-for="opt in objetoImpOptions" :key="opt.value" :value="opt.value">
                              {{ opt.label }}
                            </option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </Transition>
                </div>

                <!-- SAT Section (Mexico only, Collapsible) -->
                <div v-if="esMexico" class="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    @click="toggleSeccion('sat')"
                    class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <span class="text-sm font-medium text-gray-900">Datos SAT</span>
                    <ChevronDownIcon
                      :class="[
                        'w-4 h-4 text-gray-400 transition-transform duration-200',
                        seccionesExpandidas.sat ? 'rotate-180' : ''
                      ]"
                    />
                  </button>
                  <Transition name="accordion">
                    <div v-if="seccionesExpandidas.sat" class="p-4 border-t border-gray-200">
                      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label for="claveProdServ" class="block text-sm font-medium text-gray-700 mb-1">Clave Prod/Serv</label>
                          <input
                            id="claveProdServ"
                            v-model="claveProdServ"
                            type="text"
                            maxlength="8"
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Ej: 43211500"
                          />
                          <p class="mt-1 text-xs text-gray-500">8 digitos</p>
                        </div>
                        <div>
                          <label for="claveUnidad" class="block text-sm font-medium text-gray-700 mb-1">Clave Unidad</label>
                          <input
                            id="claveUnidad"
                            v-model="claveUnidad"
                            type="text"
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Ej: H87"
                          />
                        </div>
                        <div>
                          <label for="noIdentificacion" class="block text-sm font-medium text-gray-700 mb-1">No. Identificacion</label>
                          <input
                            id="noIdentificacion"
                            v-model="noIdentificacion"
                            type="text"
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Identificador interno"
                          />
                        </div>
                      </div>
                    </div>
                  </Transition>
                </div>

                <!-- Ecuador Section (Ecuador only, Collapsible) -->
                <div v-if="!esMexico" class="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    @click="toggleSeccion('sat')"
                    class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <span class="text-sm font-medium text-gray-900">Datos SRI Ecuador</span>
                    <ChevronDownIcon
                      :class="[
                        'w-4 h-4 text-gray-400 transition-transform duration-200',
                        seccionesExpandidas.sat ? 'rotate-180' : ''
                      ]"
                    />
                  </button>
                  <Transition name="accordion">
                    <div v-if="seccionesExpandidas.sat" class="p-4 border-t border-gray-200">
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label for="codigoPrincipal" class="block text-sm font-medium text-gray-700 mb-1">Codigo Principal</label>
                          <input
                            id="codigoPrincipal"
                            v-model="codigoPrincipal"
                            type="text"
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Codigo principal SRI"
                          />
                        </div>
                        <div>
                          <label for="codigoAuxiliar" class="block text-sm font-medium text-gray-700 mb-1">Codigo Auxiliar</label>
                          <input
                            id="codigoAuxiliar"
                            v-model="codigoAuxiliar"
                            type="text"
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Codigo auxiliar SRI"
                          />
                        </div>
                      </div>
                    </div>
                  </Transition>
                </div>

                <!-- Unit Section -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label for="unidadNombre" class="block text-sm font-medium text-gray-700 mb-1">Unidad de Medida</label>
                    <input
                      id="unidadNombre"
                      v-model="unidadNombre"
                      type="text"
                      class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Ej: Pieza, Litro, Kilo"
                    />
                  </div>
                  <div>
                    <label for="contenidoUnidad" class="block text-sm font-medium text-gray-700 mb-1">Contenido por Unidad</label>
                    <input
                      id="contenidoUnidad"
                      v-model="contenidoUnidad"
                      type="text"
                      class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Ej: 1, 500ml, 1kg"
                    />
                  </div>
                </div>

                <!-- Tags -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Etiquetas</label>
                  <div class="flex flex-wrap gap-2 mb-2">
                    <span
                      v-for="(tag, index) in etiquetas"
                      :key="index"
                      class="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {{ tag }}
                      <button
                        type="button"
                        @click="eliminarEtiqueta(index)"
                        class="text-gray-400 hover:text-gray-600"
                      >
                        <XMarkIcon class="w-3.5 h-3.5" />
                      </button>
                    </span>
                  </div>
                  <div class="flex gap-2">
                    <input
                      v-model="etiquetaInput"
                      type="text"
                      @keydown="manejarEtiquetaKeydown"
                      class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Escribe una etiqueta y presiona Enter"
                    />
                    <button
                      type="button"
                      @click="agregarEtiqueta"
                      class="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                    >
                      Agregar
                    </button>
                  </div>
                </div>

                <!-- Dimensions Section (Collapsible) -->
                <div v-if="!esServicio" class="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    @click="toggleSeccion('dimensiones')"
                    class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <span class="text-sm font-medium text-gray-900">Dimensiones</span>
                    <ChevronDownIcon
                      :class="[
                        'w-4 h-4 text-gray-400 transition-transform duration-200',
                        seccionesExpandidas.dimensiones ? 'rotate-180' : ''
                      ]"
                    />
                  </button>
                  <Transition name="accordion">
                    <div v-if="seccionesExpandidas.dimensiones" class="p-4 border-t border-gray-200">
                      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <label for="peso" class="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
                          <input
                            id="peso"
                            v-model="peso"
                            type="text"
                            inputmode="decimal"
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label for="largo" class="block text-sm font-medium text-gray-700 mb-1">Largo (cm)</label>
                          <input
                            id="largo"
                            v-model="largo"
                            type="text"
                            inputmode="decimal"
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label for="ancho" class="block text-sm font-medium text-gray-700 mb-1">Ancho (cm)</label>
                          <input
                            id="ancho"
                            v-model="ancho"
                            type="text"
                            inputmode="decimal"
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label for="alto" class="block text-sm font-medium text-gray-700 mb-1">Alto (cm)</label>
                          <input
                            id="alto"
                            v-model="alto"
                            type="text"
                            inputmode="decimal"
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>
                  </Transition>
                </div>

                <!-- Specifications Section (Collapsible) -->
                <div class="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    @click="toggleSeccion('especificaciones')"
                    class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <span class="text-sm font-medium text-gray-900">Especificaciones Tecnicas</span>
                    <ChevronDownIcon
                      :class="[
                        'w-4 h-4 text-gray-400 transition-transform duration-200',
                        seccionesExpandidas.especificaciones ? 'rotate-180' : ''
                      ]"
                    />
                  </button>
                  <Transition name="accordion">
                    <div v-if="seccionesExpandidas.especificaciones" class="p-4 border-t border-gray-200">
                      <div class="space-y-3">
                        <div
                          v-for="(spec, index) in especificaciones"
                          :key="index"
                          class="flex items-center gap-2"
                        >
                          <input
                            v-model="spec.clave"
                            type="text"
                            class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Nombre (ej: Color)"
                          />
                          <input
                            v-model="spec.valor"
                            type="text"
                            class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Valor (ej: Azul)"
                          />
                          <button
                            type="button"
                            @click="eliminarEspecificacion(index)"
                            class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <TrashIcon class="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          type="button"
                          @click="agregarEspecificacion"
                          class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                        >
                          <PlusIcon class="w-4 h-4" />
                          Agregar Especificacion
                        </button>
                      </div>
                    </div>
                  </Transition>
                </div>

                <!-- Config Section (Collapsible) -->
                <div class="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    @click="toggleSeccion('configuracion')"
                    class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <span class="text-sm font-medium text-gray-900">Configuracion de Venta</span>
                    <ChevronDownIcon
                      :class="[
                        'w-4 h-4 text-gray-400 transition-transform duration-200',
                        seccionesExpandidas.configuracion ? 'rotate-180' : ''
                      ]"
                    />
                  </button>
                  <Transition name="accordion">
                    <div v-if="seccionesExpandidas.configuracion" class="p-4 border-t border-gray-200">
                      <div class="space-y-3">
                        <label class="flex items-center gap-3 cursor-pointer">
                          <input
                            v-model="paraVentaPublico"
                            type="checkbox"
                            class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          />
                          <span class="text-sm font-medium text-gray-700">Disponible para venta al publico</span>
                        </label>
                        <label class="flex items-center gap-3 cursor-pointer">
                          <input
                            v-model="aplicarDescuento"
                            type="checkbox"
                            class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          />
                          <span class="text-sm font-medium text-gray-700">Permite aplicar descuentos</span>
                        </label>
                      </div>
                    </div>
                  </Transition>
                </div>
              </div>
            </form>

            <!-- Footer -->
            <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                type="button"
                @click="cerrar"
                :disabled="guardando"
                class="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                @click="guardar"
                :disabled="guardando"
                class="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg v-if="guardando" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ esEdicion ? 'Guardar Cambios' : 'Crear Producto' }}
              </button>
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
  max-height: 500px;
}
</style>
