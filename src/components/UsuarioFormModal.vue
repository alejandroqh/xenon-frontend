<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { XMarkIcon, ChevronDownIcon, PlusIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { useSucursalStore } from '@/stores/sucursal'
import * as usuariosApi from '@/api/usuarios'
import type {
  UsuarioResponse,
  NivelUsuario,
  MenuRuta,
  PermisoAccion,
  PermisosSucursal
} from '@/types'

const props = defineProps<{
  abierto: boolean
  usuario?: UsuarioResponse | null
}>()

const emit = defineEmits<{
  cerrar: []
  guardado: [usuario: UsuarioResponse]
}>()

const sucursalStore = useSucursalStore()

// Form state
const guardando = ref(false)
const errorForm = ref<string | null>(null)

// Form fields
const nombreCompleto = ref('')
const nombreUsuario = ref('')
const email = ref('')
const contrasena = ref('')
const confirmarContrasena = ref('')
const telefono = ref('')
const nivel = ref<NivelUsuario>('vendedor')
const accesoApp = ref(false)
const permisosPorSucursal = ref<PermisosSucursal[]>([])

// UI state
const permisosExpandidos = ref<Record<string, boolean>>({})

const esEdicion = computed(() => !!props.usuario)
const titulo = computed(() => esEdicion.value ? 'Editar Usuario' : 'Crear Usuario')

const nivelOptions: { value: NivelUsuario; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'vendedor', label: 'Vendedor' },
  { value: 'operador', label: 'Operador' },
  { value: 'visor', label: 'Visor' }
]

const menuOptions: { value: MenuRuta; label: string }[] = [
  { value: 'panel', label: 'Panel' },
  { value: 'importaciones', label: 'Importaciones' },
  { value: 'productos', label: 'Productos' },
  { value: 'inventario', label: 'Inventario' },
  { value: 'clientes', label: 'Clientes' },
  { value: 'rutas', label: 'Rutas' },
  { value: 'promociones', label: 'Promociones' },
  { value: 'reportes', label: 'Reportes' },
  { value: 'estadisticas', label: 'Estadisticas' },
  { value: 'auditoria', label: 'Auditoria' },
  { value: 'usuarios', label: 'Usuarios' },
  { value: 'configuracion', label: 'Configuracion' }
]

// Sucursales not yet added to permissions
const sucursalesDisponibles = computed(() => {
  const idsAsignados = new Set(permisosPorSucursal.value.map(p => p.sucursalId))
  return sucursalStore.sucursales.filter(s => !idsAsignados.has(s.id))
})

// Reset form when modal opens/closes or user changes
watch(
  () => [props.abierto, props.usuario],
  () => {
    if (props.abierto) {
      resetForm()
    }
  },
  { immediate: true }
)

function resetForm() {
  errorForm.value = null
  permisosExpandidos.value = {}

  if (props.usuario) {
    // Edit mode: populate from existing user
    nombreCompleto.value = props.usuario.nombreCompleto
    nombreUsuario.value = props.usuario.nombreUsuario
    email.value = props.usuario.email
    telefono.value = props.usuario.telefono || ''
    nivel.value = props.usuario.nivel
    accesoApp.value = props.usuario.accesoApp
    // Deep clone permissions
    permisosPorSucursal.value = props.usuario.permisosPorSucursal.map(p => ({
      sucursalId: p.sucursalId,
      menus: { ...p.menus }
    }))
  } else {
    // Create mode: reset to defaults
    nombreCompleto.value = ''
    nombreUsuario.value = ''
    email.value = ''
    contrasena.value = ''
    confirmarContrasena.value = ''
    telefono.value = ''
    nivel.value = 'vendedor'
    accesoApp.value = false
    permisosPorSucursal.value = []
  }
}

function cerrar() {
  emit('cerrar')
}

function togglePermiso(sucursalId: string) {
  permisosExpandidos.value[sucursalId] = !permisosExpandidos.value[sucursalId]
}

function agregarSucursal(sucursalId: string) {
  permisosPorSucursal.value.push({
    sucursalId,
    menus: {}
  })
  permisosExpandidos.value[sucursalId] = true
}

function eliminarSucursal(sucursalId: string) {
  permisosPorSucursal.value = permisosPorSucursal.value.filter(p => p.sucursalId !== sucursalId)
  delete permisosExpandidos.value[sucursalId]
}

function getSucursalNombre(sucursalId: string): string {
  return sucursalStore.sucursales.find(s => s.id === sucursalId)?.nombre || sucursalId
}

function toggleMenuPermiso(sucursalId: string, menu: MenuRuta, accion: PermisoAccion) {
  const permiso = permisosPorSucursal.value.find(p => p.sucursalId === sucursalId)
  if (!permiso) return

  const acciones = permiso.menus[menu] || []

  if (accion === 'edit') {
    // Edit implies view
    if (acciones.includes('edit')) {
      // Remove edit, keep view
      permiso.menus[menu] = ['view']
    } else {
      // Add edit (and view if not present)
      permiso.menus[menu] = ['view', 'edit']
    }
  } else {
    // Toggle view
    if (acciones.includes('view')) {
      // Remove entire menu permission
      delete permiso.menus[menu]
    } else {
      // Add view only
      permiso.menus[menu] = ['view']
    }
  }
}

function tienePermiso(sucursalId: string, menu: MenuRuta, accion: PermisoAccion): boolean {
  const permiso = permisosPorSucursal.value.find(p => p.sucursalId === sucursalId)
  if (!permiso) return false
  return permiso.menus[menu]?.includes(accion) || false
}

function validarForm(): string | null {
  if (!nombreCompleto.value.trim()) {
    return 'El nombre completo es requerido'
  }
  if (!esEdicion.value && !nombreUsuario.value.trim()) {
    return 'El nombre de usuario es requerido'
  }
  if (!email.value.trim()) {
    return 'El email es requerido'
  }
  if (!esEdicion.value) {
    if (!contrasena.value) {
      return 'La contrasena es requerida'
    }
    if (contrasena.value.length < 6) {
      return 'La contrasena debe tener al menos 6 caracteres'
    }
    if (contrasena.value !== confirmarContrasena.value) {
      return 'Las contrasenas no coinciden'
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
    let resultado: UsuarioResponse

    if (esEdicion.value && props.usuario) {
      // Update existing user
      resultado = await usuariosApi.actualizar(props.usuario.id, {
        nombreCompleto: nombreCompleto.value.trim(),
        email: email.value.trim(),
        telefono: telefono.value.trim() || null,
        nivel: nivel.value,
        accesoApp: accesoApp.value,
        permisosPorSucursal: permisosPorSucursal.value
      })
    } else {
      // Create new user
      resultado = await usuariosApi.crear({
        nombreCompleto: nombreCompleto.value.trim(),
        nombreUsuario: nombreUsuario.value.trim(),
        email: email.value.trim(),
        contrasena: contrasena.value,
        telefono: telefono.value.trim() || null,
        nivel: nivel.value,
        accesoApp: accesoApp.value,
        permisosPorSucursal: permisosPorSucursal.value
      })
    }

    emit('guardado', resultado)
  } catch (err) {
    errorForm.value = err instanceof Error ? err.message : 'Error al guardar usuario'
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
                <!-- Basic info section -->
                <div>
                  <h4 class="text-sm font-medium text-gray-900 mb-4">Informacion Basica</h4>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <!-- Nombre Completo -->
                    <div class="sm:col-span-2">
                      <label for="nombreCompleto" class="block text-sm font-medium text-gray-700 mb-1">
                        Nombre Completo <span class="text-red-500">*</span>
                      </label>
                      <input
                        id="nombreCompleto"
                        v-model="nombreCompleto"
                        type="text"
                        class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Ej: Juan Perez Garcia"
                      />
                    </div>

                    <!-- Nombre de Usuario (solo en creacion) -->
                    <div v-if="!esEdicion">
                      <label for="nombreUsuario" class="block text-sm font-medium text-gray-700 mb-1">
                        Nombre de Usuario <span class="text-red-500">*</span>
                      </label>
                      <input
                        id="nombreUsuario"
                        v-model="nombreUsuario"
                        type="text"
                        class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Ej: jperez"
                      />
                    </div>

                    <!-- Email -->
                    <div :class="esEdicion ? 'sm:col-span-2' : ''">
                      <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
                        Email <span class="text-red-500">*</span>
                      </label>
                      <input
                        id="email"
                        v-model="email"
                        type="email"
                        class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Ej: jperez@empresa.com"
                      />
                    </div>

                    <!-- Telefono -->
                    <div>
                      <label for="telefono" class="block text-sm font-medium text-gray-700 mb-1">
                        Telefono
                      </label>
                      <input
                        id="telefono"
                        v-model="telefono"
                        type="tel"
                        class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Ej: 555-123-4567"
                      />
                    </div>

                    <!-- Nivel -->
                    <div>
                      <label for="nivel" class="block text-sm font-medium text-gray-700 mb-1">
                        Nivel <span class="text-red-500">*</span>
                      </label>
                      <select
                        id="nivel"
                        v-model="nivel"
                        class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                      >
                        <option v-for="opt in nivelOptions" :key="opt.value" :value="opt.value">
                          {{ opt.label }}
                        </option>
                      </select>
                    </div>
                  </div>
                </div>

                <!-- Password section (solo en creacion) -->
                <div v-if="!esEdicion" class="pt-4 border-t border-gray-200">
                  <h4 class="text-sm font-medium text-gray-900 mb-4">Contrasena</h4>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label for="contrasena" class="block text-sm font-medium text-gray-700 mb-1">
                        Contrasena <span class="text-red-500">*</span>
                      </label>
                      <input
                        id="contrasena"
                        v-model="contrasena"
                        type="password"
                        class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Minimo 6 caracteres"
                      />
                    </div>
                    <div>
                      <label for="confirmarContrasena" class="block text-sm font-medium text-gray-700 mb-1">
                        Confirmar Contrasena <span class="text-red-500">*</span>
                      </label>
                      <input
                        id="confirmarContrasena"
                        v-model="confirmarContrasena"
                        type="password"
                        class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Repite la contrasena"
                      />
                    </div>
                  </div>
                </div>

                <!-- Access section -->
                <div class="pt-4 border-t border-gray-200">
                  <h4 class="text-sm font-medium text-gray-900 mb-4">Acceso</h4>
                  <label class="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      v-model="accesoApp"
                      class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span class="text-sm text-gray-700">Permitir acceso desde la app movil</span>
                  </label>
                </div>

                <!-- Permissions section -->
                <div class="pt-4 border-t border-gray-200">
                  <div class="flex items-center justify-between mb-4">
                    <h4 class="text-sm font-medium text-gray-900">Permisos por Sucursal</h4>
                    <div v-if="sucursalesDisponibles.length > 0" class="relative">
                      <select
                        @change="(e) => { if ((e.target as HTMLSelectElement).value) { agregarSucursal((e.target as HTMLSelectElement).value); (e.target as HTMLSelectElement).value = '' } }"
                        class="pl-3 pr-8 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white appearance-none cursor-pointer"
                      >
                        <option value="">Agregar sucursal...</option>
                        <option v-for="suc in sucursalesDisponibles" :key="suc.id" :value="suc.id">
                          {{ suc.nombre }}
                        </option>
                      </select>
                      <PlusIcon class="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <!-- No permissions message -->
                  <div
                    v-if="permisosPorSucursal.length === 0"
                    class="bg-gray-50 rounded-lg p-4 text-center text-gray-500 text-sm"
                  >
                    Sin permisos asignados. Agrega una sucursal para configurar los permisos.
                  </div>

                  <!-- Permissions list -->
                  <div v-else class="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-200">
                    <div
                      v-for="permiso in permisosPorSucursal"
                      :key="permiso.sucursalId"
                    >
                      <!-- Accordion header -->
                      <div class="flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors">
                        <button
                          type="button"
                          @click="togglePermiso(permiso.sucursalId)"
                          class="flex items-center gap-3 flex-1 text-left cursor-pointer"
                        >
                          <ChevronDownIcon
                            :class="[
                              'w-4 h-4 text-gray-400 transition-transform duration-200',
                              permisosExpandidos[permiso.sucursalId] ? 'rotate-180' : ''
                            ]"
                          />
                          <span class="text-sm font-medium text-gray-900">
                            {{ getSucursalNombre(permiso.sucursalId) }}
                          </span>
                          <span class="text-xs text-gray-500">
                            ({{ Object.keys(permiso.menus).length }} menus)
                          </span>
                        </button>
                        <button
                          type="button"
                          @click="eliminarSucursal(permiso.sucursalId)"
                          class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <TrashIcon class="w-4 h-4" />
                        </button>
                      </div>

                      <!-- Accordion content -->
                      <Transition name="accordion">
                        <div
                          v-if="permisosExpandidos[permiso.sucursalId]"
                          class="px-4 py-3 bg-gray-50 border-t border-gray-100"
                        >
                          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            <div
                              v-for="menu in menuOptions"
                              :key="menu.value"
                              class="flex items-center justify-between p-2 bg-white rounded border border-gray-200"
                            >
                              <span class="text-xs font-medium text-gray-700">{{ menu.label }}</span>
                              <div class="flex items-center gap-1">
                                <button
                                  type="button"
                                  @click="toggleMenuPermiso(permiso.sucursalId, menu.value, 'view')"
                                  :class="[
                                    'px-2 py-0.5 text-[10px] font-medium rounded transition-colors cursor-pointer',
                                    tienePermiso(permiso.sucursalId, menu.value, 'view')
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                  ]"
                                >
                                  Ver
                                </button>
                                <button
                                  type="button"
                                  @click="toggleMenuPermiso(permiso.sucursalId, menu.value, 'edit')"
                                  :class="[
                                    'px-2 py-0.5 text-[10px] font-medium rounded transition-colors cursor-pointer',
                                    tienePermiso(permiso.sucursalId, menu.value, 'edit')
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                  ]"
                                >
                                  Editar
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Transition>
                    </div>
                  </div>
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
                {{ esEdicion ? 'Guardar Cambios' : 'Crear Usuario' }}
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
