<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { XMarkIcon, ChevronDownIcon } from '@heroicons/vue/24/outline'
import * as clientesApi from '@/api/clientes'
import * as catalogosApi from '@/api/catalogos'
import { obtenerMensajeError } from '@/api/errorUtils'
import { useSucursalStore } from '@/stores/sucursal'
import type { Cliente, TipoPersona, CrearClienteRequest, RegimenFiscal, TipoIdentificacion } from '@/types'

const props = defineProps<{
  abierto: boolean
  cliente?: Cliente | null
}>()

const emit = defineEmits<{
  cerrar: []
  guardado: [cliente: Cliente]
}>()

// Sucursal store for country detection
const sucursalStore = useSucursalStore()

// Form state
const guardando = ref(false)
const errorForm = ref<string | null>(null)
const cargandoCatalogos = ref(false)

// Dynamic catalog options
const regimenesFiscalesOptions = ref<RegimenFiscal[]>([])
const tiposIdentificacionOptions = ref<TipoIdentificacion[]>([])

// Country derived from sucursal
const paisActual = computed(() => sucursalStore.sucursalActual?.pais ?? 'MX')
const esMexico = computed(() => paisActual.value === 'MX')
const esEcuador = computed(() => paisActual.value === 'EC')

// Collapsible sections
const seccionesExpandidas = ref({
  fiscal: true,
  contacto: false,
  direccion: false,
  adicional: false
})

// Form fields - Basic
const nombre = ref('')
const razonSocial = ref('')
const tipoPersona = ref<TipoPersona | ''>('')

// Form fields - Fiscal/Identification
const rfc = ref('')  // Mexico: RFC, Ecuador: RUC/Cedula
const regimenFiscal = ref('')
const usoCfdi = ref('')
const tipoIdentificacion = ref('')
const numeroIdentificacion = ref('')

// Form fields - Contact
const email = ref('')
const telefono = ref('')

// Form fields - Address
const calle = ref('')
const ciudad = ref('')
const estado = ref('')
const codigoPostal = ref('')

// Form fields - Additional
const descuento = ref<number>(0)
const observaciones = ref('')

const esEdicion = computed(() => !!props.cliente)
const titulo = computed(() => esEdicion.value ? 'Editar Cliente' : 'Nuevo Cliente')

const tipoPersonaOptions: { value: TipoPersona; label: string }[] = [
  { value: 'fisica', label: 'Persona Fisica' },
  { value: 'moral', label: 'Persona Moral' }
]

// Catalog loading function
async function cargarCatalogos() {
  cargandoCatalogos.value = true
  try {
    const [regimenes, tiposId] = await Promise.all([
      catalogosApi.listarRegimenesFiscales({ pais: paisActual.value, activo: true }),
      catalogosApi.listarTiposIdentificacion({ pais: paisActual.value, activo: true })
    ])
    regimenesFiscalesOptions.value = regimenes
    tiposIdentificacionOptions.value = tiposId
  } catch (err) {
    console.error('Error loading catalogs:', err)
  } finally {
    cargandoCatalogos.value = false
  }
}

// Watch for country changes to reload catalogs
watch(paisActual, () => {
  cargarCatalogos()
  // Reset fiscal fields when country changes
  regimenFiscal.value = ''
  tipoIdentificacion.value = ''
})

// Load catalogs on mount
onMounted(() => {
  cargarCatalogos()
})

const usoCfdiOptions: { value: string; label: string }[] = [
  { value: 'G01', label: 'G01 - Adquisicion de mercancias' },
  { value: 'G02', label: 'G02 - Devoluciones, descuentos o bonificaciones' },
  { value: 'G03', label: 'G03 - Gastos en general' },
  { value: 'I01', label: 'I01 - Construcciones' },
  { value: 'I02', label: 'I02 - Mobiliario y equipo de oficina' },
  { value: 'I03', label: 'I03 - Equipo de transporte' },
  { value: 'I04', label: 'I04 - Equipo de computo y accesorios' },
  { value: 'I05', label: 'I05 - Dados, troqueles, moldes, matrices y herramental' },
  { value: 'I06', label: 'I06 - Comunicaciones telefonicas' },
  { value: 'I07', label: 'I07 - Comunicaciones satelitales' },
  { value: 'I08', label: 'I08 - Otra maquinaria y equipo' },
  { value: 'D01', label: 'D01 - Honorarios medicos, dentales y gastos hospitalarios' },
  { value: 'D02', label: 'D02 - Gastos medicos por incapacidad o discapacidad' },
  { value: 'D03', label: 'D03 - Gastos funerales' },
  { value: 'D04', label: 'D04 - Donativos' },
  { value: 'D05', label: 'D05 - Intereses reales efectivamente pagados por creditos hipotecarios' },
  { value: 'D06', label: 'D06 - Aportaciones voluntarias al SAR' },
  { value: 'D07', label: 'D07 - Primas por seguros de gastos medicos' },
  { value: 'D08', label: 'D08 - Gastos de transportacion escolar obligatoria' },
  { value: 'D09', label: 'D09 - Depositos en cuentas para el ahorro' },
  { value: 'D10', label: 'D10 - Pagos por servicios educativos (colegiaturas)' },
  { value: 'P01', label: 'P01 - Por definir' },
  { value: 'S01', label: 'S01 - Sin efectos fiscales' },
  { value: 'CP01', label: 'CP01 - Pagos' },
  { value: 'CN01', label: 'CN01 - Nomina' }
]

// Reset form when modal opens/closes or cliente changes
watch(
  () => [props.abierto, props.cliente],
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

  if (props.cliente) {
    // Edit mode: populate from existing cliente
    nombre.value = props.cliente.nombre
    razonSocial.value = props.cliente.razonSocial || ''
    tipoPersona.value = props.cliente.tipoPersona || ''

    // Fiscal/Identification
    rfc.value = props.cliente.rfc || ''
    regimenFiscal.value = props.cliente.regimenFiscal || ''
    usoCfdi.value = props.cliente.usoCfdi || ''
    tipoIdentificacion.value = props.cliente.tipoIdentificacion || ''
    numeroIdentificacion.value = props.cliente.numeroIdentificacion || ''

    // Contact
    email.value = props.cliente.email || ''
    telefono.value = props.cliente.telefono || ''

    // Address
    calle.value = props.cliente.calle || ''
    ciudad.value = props.cliente.ciudad || ''
    estado.value = props.cliente.estado || ''
    codigoPostal.value = props.cliente.codigoPostal || ''

    // Additional
    descuento.value = props.cliente.descuento || 0
    observaciones.value = props.cliente.observaciones || ''

    // Collapse all sections when editing
    seccionesExpandidas.value = {
      fiscal: false,
      contacto: false,
      direccion: false,
      adicional: false
    }
  } else {
    // Create mode: reset to defaults
    nombre.value = ''
    razonSocial.value = ''
    tipoPersona.value = ''

    rfc.value = ''
    regimenFiscal.value = ''
    usoCfdi.value = ''
    tipoIdentificacion.value = ''
    numeroIdentificacion.value = ''

    email.value = ''
    telefono.value = ''

    calle.value = ''
    ciudad.value = ''
    estado.value = ''
    codigoPostal.value = ''

    descuento.value = 0
    observaciones.value = ''

    seccionesExpandidas.value = {
      fiscal: true,
      contacto: false,
      direccion: false,
      adicional: false
    }
  }
}

function cerrar() {
  emit('cerrar')
}

function validarForm(): string | null {
  if (!nombre.value.trim()) {
    return 'El nombre del cliente es requerido'
  }
  if (email.value && !email.value.includes('@')) {
    return 'El email no es valido'
  }

  // Country-specific validation
  if (esMexico.value) {
    // Mexico: RFC validation
    if (rfc.value && rfc.value.length !== 12 && rfc.value.length !== 13) {
      return 'El RFC debe tener 12 caracteres (persona moral) o 13 caracteres (persona fisica)'
    }
  } else if (esEcuador.value) {
    // Ecuador: Identification validation based on type
    if (tipoIdentificacion.value && numeroIdentificacion.value) {
      const tipoSeleccionado = tiposIdentificacionOptions.value.find(t => t.codigo === tipoIdentificacion.value)
      if (tipoSeleccionado) {
        const len = numeroIdentificacion.value.length
        if (tipoSeleccionado.longitudMinima && len < tipoSeleccionado.longitudMinima) {
          return `El numero de identificacion debe tener al menos ${tipoSeleccionado.longitudMinima} caracteres`
        }
        if (tipoSeleccionado.longitudMaxima && len > tipoSeleccionado.longitudMaxima) {
          return `El numero de identificacion no puede exceder ${tipoSeleccionado.longitudMaxima} caracteres`
        }
      }
    }
  }

  if (descuento.value < 0 || descuento.value > 100) {
    return 'El descuento debe estar entre 0 y 100'
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
    let resultado: Cliente

    const datos: CrearClienteRequest = {
      nombre: nombre.value.trim(),
      razonSocial: razonSocial.value.trim() || null,
      tipoPersona: tipoPersona.value || null,
      pais: paisActual.value,

      // Fiscal/Identification
      rfc: rfc.value.trim().toUpperCase() || null,
      regimenFiscal: regimenFiscal.value || null,
      usoCfdi: esMexico.value ? (usoCfdi.value || null) : null,
      tipoIdentificacion: tipoIdentificacion.value || null,
      numeroIdentificacion: numeroIdentificacion.value.trim().toUpperCase() || null,

      // Contact
      email: email.value.trim() || null,
      telefono: telefono.value.trim() || null,

      // Address
      calle: calle.value.trim() || null,
      ciudad: ciudad.value.trim() || null,
      estado: estado.value.trim() || null,
      codigoPostal: codigoPostal.value.trim() || null,

      // Additional
      descuento: descuento.value,
      observaciones: observaciones.value.trim() || null
    }

    if (esEdicion.value && props.cliente) {
      resultado = await clientesApi.actualizar(props.cliente.id, datos)
    } else {
      resultado = await clientesApi.crear(datos)
    }

    emit('guardado', resultado)
  } catch (err: unknown) {
    errorForm.value = obtenerMensajeError(err, 'Error al guardar cliente')
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
          <div class="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
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
                        placeholder="Ej: Juan Perez"
                      />
                    </div>

                    <!-- Razon Social -->
                    <div class="sm:col-span-2">
                      <label for="razonSocial" class="block text-sm font-medium text-gray-700 mb-1">
                        Razon Social
                      </label>
                      <input
                        id="razonSocial"
                        v-model="razonSocial"
                        type="text"
                        class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Ej: Empresa SA de CV"
                      />
                    </div>

                    <!-- Tipo Persona -->
                    <div>
                      <label for="tipoPersona" class="block text-sm font-medium text-gray-700 mb-1">
                        Tipo de Persona
                      </label>
                      <select
                        id="tipoPersona"
                        v-model="tipoPersona"
                        class="w-full h-[38px] px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                      >
                        <option value="">Seleccionar...</option>
                        <option v-for="opt in tipoPersonaOptions" :key="opt.value" :value="opt.value">
                          {{ opt.label }}
                        </option>
                      </select>
                    </div>
                  </div>
                </div>

                <!-- Fiscal Section (Collapsible) -->
                <div class="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    @click="toggleSeccion('fiscal')"
                    class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <span class="text-sm font-medium text-gray-900">Datos Fiscales</span>
                    <ChevronDownIcon
                      :class="[
                        'w-4 h-4 text-gray-400 transition-transform duration-200',
                        seccionesExpandidas.fiscal ? 'rotate-180' : ''
                      ]"
                    />
                  </button>
                  <Transition name="accordion">
                    <div v-if="seccionesExpandidas.fiscal" class="p-4 border-t border-gray-200">
                      <!-- Loading indicator -->
                      <div v-if="cargandoCatalogos" class="text-center py-4">
                        <div class="inline-flex items-center gap-2 text-sm text-gray-500">
                          <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Cargando catalogos...
                        </div>
                      </div>

                      <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <!-- Country indicator -->
                        <div class="sm:col-span-2 mb-2">
                          <span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full" :class="esMexico ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'">
                            {{ esMexico ? 'Mexico (MX)' : 'Ecuador (EC)' }}
                          </span>
                        </div>

                        <!-- Mexico: RFC -->
                        <div v-if="esMexico">
                          <label for="rfc" class="block text-sm font-medium text-gray-700 mb-1">RFC</label>
                          <input
                            id="rfc"
                            v-model="rfc"
                            type="text"
                            maxlength="13"
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent uppercase"
                            placeholder="Ej: XAXX010101000"
                          />
                          <p class="mt-1 text-xs text-gray-500">12 caracteres (moral) o 13 (fisica)</p>
                        </div>

                        <!-- Ecuador: Tipo de Identificacion -->
                        <div v-if="esEcuador">
                          <label for="tipoIdentificacion" class="block text-sm font-medium text-gray-700 mb-1">Tipo de Identificacion</label>
                          <select
                            id="tipoIdentificacion"
                            v-model="tipoIdentificacion"
                            class="w-full h-[38px] px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                          >
                            <option value="">Seleccionar...</option>
                            <option v-for="tipo in tiposIdentificacionOptions" :key="tipo.codigo" :value="tipo.codigo">
                              {{ tipo.codigo }} - {{ tipo.descripcion }}
                            </option>
                          </select>
                        </div>

                        <!-- Ecuador: Numero de Identificacion -->
                        <div v-if="esEcuador">
                          <label for="numeroIdentificacion" class="block text-sm font-medium text-gray-700 mb-1">Numero de Identificacion</label>
                          <input
                            id="numeroIdentificacion"
                            v-model="numeroIdentificacion"
                            type="text"
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent uppercase"
                            placeholder="Ej: 1712345678001"
                          />
                          <p class="mt-1 text-xs text-gray-500">RUC (13 digitos) o Cedula (10 digitos)</p>
                        </div>

                        <!-- Regimen Fiscal (both countries) -->
                        <div :class="esMexico ? '' : 'sm:col-span-2'">
                          <label for="regimenFiscal" class="block text-sm font-medium text-gray-700 mb-1">Regimen Fiscal</label>
                          <select
                            id="regimenFiscal"
                            v-model="regimenFiscal"
                            class="w-full h-[38px] px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                          >
                            <option value="">Seleccionar...</option>
                            <option v-for="regimen in regimenesFiscalesOptions" :key="regimen.codigo" :value="regimen.codigo">
                              {{ regimen.codigo }} - {{ regimen.descripcion }}
                            </option>
                          </select>
                        </div>

                        <!-- Mexico: Uso de CFDI -->
                        <div v-if="esMexico" class="sm:col-span-2">
                          <label for="usoCfdi" class="block text-sm font-medium text-gray-700 mb-1">Uso de CFDI</label>
                          <select
                            id="usoCfdi"
                            v-model="usoCfdi"
                            class="w-full h-[38px] px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                          >
                            <option value="">Seleccionar...</option>
                            <option v-for="opt in usoCfdiOptions" :key="opt.value" :value="opt.value">
                              {{ opt.label }}
                            </option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </Transition>
                </div>

                <!-- Contact Section (Collapsible) -->
                <div class="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    @click="toggleSeccion('contacto')"
                    class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <span class="text-sm font-medium text-gray-900">Contacto</span>
                    <ChevronDownIcon
                      :class="[
                        'w-4 h-4 text-gray-400 transition-transform duration-200',
                        seccionesExpandidas.contacto ? 'rotate-180' : ''
                      ]"
                    />
                  </button>
                  <Transition name="accordion">
                    <div v-if="seccionesExpandidas.contacto" class="p-4 border-t border-gray-200">
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input
                            id="email"
                            v-model="email"
                            type="email"
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Ej: cliente@empresa.com"
                          />
                        </div>
                        <div>
                          <label for="telefono" class="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                          <input
                            id="telefono"
                            v-model="telefono"
                            type="tel"
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Ej: 555-123-4567"
                          />
                        </div>
                      </div>
                    </div>
                  </Transition>
                </div>

                <!-- Address Section (Collapsible) -->
                <div class="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    @click="toggleSeccion('direccion')"
                    class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <span class="text-sm font-medium text-gray-900">Direccion Fiscal</span>
                    <ChevronDownIcon
                      :class="[
                        'w-4 h-4 text-gray-400 transition-transform duration-200',
                        seccionesExpandidas.direccion ? 'rotate-180' : ''
                      ]"
                    />
                  </button>
                  <Transition name="accordion">
                    <div v-if="seccionesExpandidas.direccion" class="p-4 border-t border-gray-200">
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div class="sm:col-span-2">
                          <label for="calle" class="block text-sm font-medium text-gray-700 mb-1">Calle</label>
                          <input
                            id="calle"
                            v-model="calle"
                            type="text"
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Ej: Av. Reforma 123"
                          />
                        </div>
                        <div>
                          <label for="codigoPostal" class="block text-sm font-medium text-gray-700 mb-1">Codigo Postal</label>
                          <input
                            id="codigoPostal"
                            v-model="codigoPostal"
                            type="text"
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Ej: 06600"
                          />
                        </div>
                        <div>
                          <label for="ciudad" class="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                          <input
                            id="ciudad"
                            v-model="ciudad"
                            type="text"
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Ej: Ciudad de Mexico"
                          />
                        </div>
                        <div>
                          <label for="estado" class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                          <input
                            id="estado"
                            v-model="estado"
                            type="text"
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Ej: CDMX"
                          />
                        </div>
                      </div>
                    </div>
                  </Transition>
                </div>

                <!-- Additional Section (Collapsible) -->
                <div class="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    @click="toggleSeccion('adicional')"
                    class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <span class="text-sm font-medium text-gray-900">Informacion Adicional</span>
                    <ChevronDownIcon
                      :class="[
                        'w-4 h-4 text-gray-400 transition-transform duration-200',
                        seccionesExpandidas.adicional ? 'rotate-180' : ''
                      ]"
                    />
                  </button>
                  <Transition name="accordion">
                    <div v-if="seccionesExpandidas.adicional" class="p-4 border-t border-gray-200">
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label for="descuento" class="block text-sm font-medium text-gray-700 mb-1">Descuento (%)</label>
                          <input
                            id="descuento"
                            v-model.number="descuento"
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Ej: 10"
                          />
                          <p class="mt-1 text-xs text-gray-500">Porcentaje de descuento para este cliente</p>
                        </div>
                        <div class="sm:col-span-2">
                          <label for="observaciones" class="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                          <textarea
                            id="observaciones"
                            v-model="observaciones"
                            rows="3"
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                            placeholder="Notas adicionales sobre el cliente..."
                          ></textarea>
                        </div>
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
                {{ esEdicion ? 'Guardar Cambios' : 'Crear Cliente' }}
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
