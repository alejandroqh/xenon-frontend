<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { XMarkIcon, ChevronDownIcon } from '@heroicons/vue/24/outline'
import * as sucursalesApi from '@/api/sucursales'
import type { Sucursal, PaisSucursal, RegimenFiscalMX } from '@/types'

const props = defineProps<{
  abierto: boolean
  sucursal?: Sucursal | null
}>()

const emit = defineEmits<{
  cerrar: []
  guardado: [sucursal: Sucursal]
}>()

// Form state
const guardando = ref(false)
const errorForm = ref<string | null>(null)

// Collapsible sections
const seccionesExpandidas = ref({
  direccion: true,
  legal: false,
  fiscal: false,
  contacto: false
})

// Form fields - Basic
const nombre = ref('')
const alias = ref('')
const pais = ref<PaisSucursal>('MX')

// Form fields - Address
const calle = ref('')
const numeroExterior = ref('')
const numeroInterior = ref('')
const colonia = ref('')
const ciudad = ref('')
const estado = ref('')
const codigoPostal = ref('')

// Form fields - Legal/Commercial
const razonSocial = ref('')
const representanteLegal = ref('')

// Form fields - Mexico fiscal
const rfc = ref('')
const regimenFiscal = ref<RegimenFiscalMX | ''>('')

// Form fields - Ecuador fiscal
const ruc = ref('')
const codigoEstablecimiento = ref('')
const puntoEmision = ref('')

// Form fields - Contact
const email = ref('')
const telefono = ref('')

const esEdicion = computed(() => !!props.sucursal)
const titulo = computed(() => esEdicion.value ? 'Editar Sucursal' : 'Crear Sucursal')
const esMexico = computed(() => pais.value === 'MX')
const esEcuador = computed(() => pais.value === 'EC')

const paisOptions: { value: PaisSucursal; label: string }[] = [
  { value: 'MX', label: 'Mexico' },
  { value: 'EC', label: 'Ecuador' }
]

const regimenFiscalOptions: { value: RegimenFiscalMX; label: string }[] = [
  { value: '601', label: '601 - General de Ley Personas Morales' },
  { value: '603', label: '603 - Personas Morales con Fines no Lucrativos' },
  { value: '605', label: '605 - Sueldos y Salarios' },
  { value: '606', label: '606 - Arrendamiento' },
  { value: '607', label: '607 - Enajenacion o Adquisicion de Bienes' },
  { value: '608', label: '608 - Demas ingresos' },
  { value: '610', label: '610 - Residentes en el Extranjero' },
  { value: '611', label: '611 - Ingresos por Dividendos' },
  { value: '612', label: '612 - Actividades Empresariales y Profesionales' },
  { value: '614', label: '614 - Ingresos por intereses' },
  { value: '615', label: '615 - Obtencion de premios' },
  { value: '616', label: '616 - Sin obligaciones fiscales' },
  { value: '620', label: '620 - Sociedades Cooperativas de Produccion' },
  { value: '621', label: '621 - Incorporacion Fiscal' },
  { value: '622', label: '622 - Actividades Agricolas, Ganaderas, etc.' },
  { value: '623', label: '623 - Opcional para Grupos de Sociedades' },
  { value: '624', label: '624 - Coordinados' },
  { value: '625', label: '625 - Plataformas Tecnologicas' },
  { value: '626', label: '626 - Regimen Simplificado de Confianza (RESICO)' }
]

// Reset form when modal opens/closes or sucursal changes
watch(
  () => [props.abierto, props.sucursal],
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

  if (props.sucursal) {
    // Edit mode: populate from existing sucursal
    nombre.value = props.sucursal.nombre
    alias.value = props.sucursal.alias || ''
    pais.value = props.sucursal.pais

    // Address
    calle.value = props.sucursal.calle || ''
    numeroExterior.value = props.sucursal.numeroExterior || ''
    numeroInterior.value = props.sucursal.numeroInterior || ''
    colonia.value = props.sucursal.colonia || ''
    ciudad.value = props.sucursal.ciudad || ''
    estado.value = props.sucursal.estado || ''
    codigoPostal.value = props.sucursal.codigoPostal || ''

    // Legal
    razonSocial.value = props.sucursal.razonSocial || ''
    representanteLegal.value = props.sucursal.representanteLegal || ''

    // Fiscal Mexico
    rfc.value = props.sucursal.rfc || ''
    regimenFiscal.value = props.sucursal.regimenFiscal || ''

    // Fiscal Ecuador
    ruc.value = props.sucursal.ruc || ''
    codigoEstablecimiento.value = props.sucursal.codigoEstablecimiento || ''
    puntoEmision.value = props.sucursal.puntoEmision || ''

    // Contact
    email.value = props.sucursal.email || ''
    telefono.value = props.sucursal.telefono || ''

    // Collapse all sections when editing
    seccionesExpandidas.value = {
      direccion: false,
      legal: false,
      fiscal: false,
      contacto: false
    }
  } else {
    // Create mode: reset to defaults
    nombre.value = ''
    alias.value = ''
    pais.value = 'MX'

    calle.value = ''
    numeroExterior.value = ''
    numeroInterior.value = ''
    colonia.value = ''
    ciudad.value = ''
    estado.value = ''
    codigoPostal.value = ''

    razonSocial.value = ''
    representanteLegal.value = ''

    rfc.value = ''
    regimenFiscal.value = ''

    ruc.value = ''
    codigoEstablecimiento.value = ''
    puntoEmision.value = ''

    email.value = ''
    telefono.value = ''

    seccionesExpandidas.value = {
      direccion: true,
      legal: false,
      fiscal: false,
      contacto: false
    }
  }
}

function cerrar() {
  emit('cerrar')
}

function validarForm(): string | null {
  if (!nombre.value.trim()) {
    return 'El nombre de la sucursal es requerido'
  }
  if (email.value && !email.value.includes('@')) {
    return 'El email no es valido'
  }
  if (pais.value === 'MX' && rfc.value && rfc.value.length !== 12 && rfc.value.length !== 13) {
    return 'El RFC debe tener 12 caracteres (persona moral) o 13 caracteres (persona fisica)'
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
    let resultado: Sucursal

    const datos = {
      nombre: nombre.value.trim(),
      pais: pais.value,

      // Address
      calle: calle.value.trim() || null,
      numeroExterior: numeroExterior.value.trim() || null,
      numeroInterior: numeroInterior.value.trim() || null,
      colonia: colonia.value.trim() || null,
      ciudad: ciudad.value.trim() || null,
      estado: estado.value.trim() || null,
      codigoPostal: codigoPostal.value.trim() || null,

      // Legal
      alias: alias.value.trim() || null,
      razonSocial: razonSocial.value.trim() || null,
      representanteLegal: representanteLegal.value.trim() || null,

      // Fiscal Mexico
      rfc: pais.value === 'MX' ? (rfc.value.trim().toUpperCase() || null) : null,
      regimenFiscal: pais.value === 'MX' && regimenFiscal.value ? regimenFiscal.value : null,

      // Fiscal Ecuador
      ruc: pais.value === 'EC' ? (ruc.value.trim() || null) : null,
      codigoEstablecimiento: pais.value === 'EC' ? (codigoEstablecimiento.value.trim() || null) : null,
      puntoEmision: pais.value === 'EC' ? (puntoEmision.value.trim() || null) : null,

      // Contact
      email: email.value.trim() || null,
      telefono: telefono.value.trim() || null
    }

    if (esEdicion.value && props.sucursal) {
      resultado = await sucursalesApi.actualizar(props.sucursal.id, datos)
    } else {
      resultado = await sucursalesApi.crear(datos)
    }

    emit('guardado', resultado)
  } catch (err: unknown) {
    const axiosError = err as { response?: { data?: { message?: string } } }
    errorForm.value = axiosError.response?.data?.message
      || (err instanceof Error ? err.message : 'Error al guardar sucursal')
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
                        placeholder="Ej: Sucursal Centro"
                      />
                    </div>

                    <!-- Alias -->
                    <div>
                      <label for="alias" class="block text-sm font-medium text-gray-700 mb-1">
                        Alias
                      </label>
                      <input
                        id="alias"
                        v-model="alias"
                        type="text"
                        class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Ej: Centro"
                      />
                    </div>

                    <!-- Pais -->
                    <div>
                      <label for="pais" class="block text-sm font-medium text-gray-700 mb-1">
                        Pais <span class="text-red-500">*</span>
                      </label>
                      <select
                        id="pais"
                        v-model="pais"
                        :disabled="esEdicion"
                        class="w-full h-[38px] px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option v-for="opt in paisOptions" :key="opt.value" :value="opt.value">
                          {{ opt.label }}
                        </option>
                      </select>
                    </div>
                  </div>
                </div>

                <!-- Address Section (Collapsible) -->
                <div class="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    @click="toggleSeccion('direccion')"
                    class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <span class="text-sm font-medium text-gray-900">Direccion</span>
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
                            placeholder="Ej: Av. Reforma"
                          />
                        </div>
                        <div>
                          <label for="numeroExterior" class="block text-sm font-medium text-gray-700 mb-1">No. Exterior</label>
                          <input
                            id="numeroExterior"
                            v-model="numeroExterior"
                            type="text"
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Ej: 123"
                          />
                        </div>
                        <div>
                          <label for="numeroInterior" class="block text-sm font-medium text-gray-700 mb-1">No. Interior</label>
                          <input
                            id="numeroInterior"
                            v-model="numeroInterior"
                            type="text"
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Ej: Local 5"
                          />
                        </div>
                        <div>
                          <label for="colonia" class="block text-sm font-medium text-gray-700 mb-1">Colonia</label>
                          <input
                            id="colonia"
                            v-model="colonia"
                            type="text"
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Ej: Centro"
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

                <!-- Legal Section (Collapsible) -->
                <div class="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    @click="toggleSeccion('legal')"
                    class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <span class="text-sm font-medium text-gray-900">Informacion Legal</span>
                    <ChevronDownIcon
                      :class="[
                        'w-4 h-4 text-gray-400 transition-transform duration-200',
                        seccionesExpandidas.legal ? 'rotate-180' : ''
                      ]"
                    />
                  </button>
                  <Transition name="accordion">
                    <div v-if="seccionesExpandidas.legal" class="p-4 border-t border-gray-200">
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div class="sm:col-span-2">
                          <label for="razonSocial" class="block text-sm font-medium text-gray-700 mb-1">Razon Social</label>
                          <input
                            id="razonSocial"
                            v-model="razonSocial"
                            type="text"
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Ej: Empresa SA de CV"
                          />
                        </div>
                        <div class="sm:col-span-2">
                          <label for="representanteLegal" class="block text-sm font-medium text-gray-700 mb-1">Representante Legal</label>
                          <input
                            id="representanteLegal"
                            v-model="representanteLegal"
                            type="text"
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Ej: Juan Perez Garcia"
                          />
                        </div>
                      </div>
                    </div>
                  </Transition>
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
                      <!-- Mexico fiscal fields -->
                      <div v-if="esMexico" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
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
                        <div>
                          <label for="regimenFiscal" class="block text-sm font-medium text-gray-700 mb-1">Regimen Fiscal</label>
                          <select
                            id="regimenFiscal"
                            v-model="regimenFiscal"
                            class="w-full h-[38px] px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                          >
                            <option value="">Seleccionar...</option>
                            <option v-for="opt in regimenFiscalOptions" :key="opt.value" :value="opt.value">
                              {{ opt.label }}
                            </option>
                          </select>
                        </div>
                      </div>

                      <!-- Ecuador fiscal fields -->
                      <div v-if="esEcuador" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div class="sm:col-span-2">
                          <label for="ruc" class="block text-sm font-medium text-gray-700 mb-1">RUC</label>
                          <input
                            id="ruc"
                            v-model="ruc"
                            type="text"
                            maxlength="13"
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Ej: 1234567890001"
                          />
                        </div>
                        <div>
                          <label for="codigoEstablecimiento" class="block text-sm font-medium text-gray-700 mb-1">Codigo Establecimiento</label>
                          <input
                            id="codigoEstablecimiento"
                            v-model="codigoEstablecimiento"
                            type="text"
                            maxlength="3"
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Ej: 001"
                          />
                        </div>
                        <div>
                          <label for="puntoEmision" class="block text-sm font-medium text-gray-700 mb-1">Punto de Emision</label>
                          <input
                            id="puntoEmision"
                            v-model="puntoEmision"
                            type="text"
                            maxlength="3"
                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Ej: 001"
                          />
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
                            placeholder="Ej: sucursal@empresa.com"
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
                {{ esEdicion ? 'Guardar Cambios' : 'Crear Sucursal' }}
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
