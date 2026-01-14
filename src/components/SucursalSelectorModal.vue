<script setup lang="ts">
import { computed } from 'vue'
import { useSucursalStore, type Sucursal } from '@/stores/sucursal'
import { BuildingOffice2Icon, MapPinIcon } from '@heroicons/vue/24/outline'

const sucursalStore = useSucursalStore()

const sucursalesAccesibles = computed(() => sucursalStore.sucursalesAccesibles)
const mostrar = computed(() => sucursalStore.requiereSeleccion)

function seleccionar(sucursal: Sucursal) {
  sucursalStore.seleccionarSucursal(sucursal.id, true)
}

// Format address from structured fields
function formatearDireccion(sucursal: Sucursal): string {
  const parts: string[] = []

  if (sucursal.ciudad) {
    let ubicacion = sucursal.ciudad
    if (sucursal.estado) ubicacion += `, ${sucursal.estado}`
    parts.push(ubicacion)
  }

  return parts.length > 0 ? parts.join(', ') : ''
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="mostrar"
        class="fixed inset-0 z-50 overflow-y-auto"
      >
        <!-- Backdrop (no click handler - cannot dismiss) -->
        <div class="fixed inset-0 bg-black/50 transition-opacity"></div>

        <!-- Modal panel -->
        <div class="relative min-h-screen flex items-center justify-center p-4">
          <div class="relative bg-white rounded-xl shadow-xl max-w-2xl w-full">
            <!-- Header -->
            <div class="px-6 py-5 border-b border-gray-200 text-center">
              <BuildingOffice2Icon class="w-12 h-12 text-primary-500 mx-auto mb-3" />
              <h3 class="text-lg font-semibold text-gray-900">
                Selecciona una Sucursal
              </h3>
              <p class="mt-1 text-sm text-gray-500">
                Elige la sucursal con la que deseas trabajar
              </p>
            </div>

            <!-- Content - Tile Grid -->
            <div class="px-6 py-5">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  v-for="sucursal in sucursalesAccesibles"
                  :key="sucursal.id"
                  @click="seleccionar(sucursal)"
                  class="group relative p-4 bg-gray-50 hover:bg-primary-50 border-2 border-gray-200 hover:border-primary-500 rounded-xl transition-all duration-200 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  <div class="flex items-start gap-3">
                    <div class="flex-shrink-0 w-10 h-10 bg-primary-100 group-hover:bg-primary-200 rounded-lg flex items-center justify-center transition-colors">
                      <BuildingOffice2Icon class="w-5 h-5 text-primary-600" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-semibold text-gray-900 group-hover:text-primary-700">
                        {{ sucursal.nombre }}
                      </p>
                      <p
                        v-if="formatearDireccion(sucursal)"
                        class="mt-1 text-xs text-gray-500 flex items-center gap-1"
                      >
                        <MapPinIcon class="w-3 h-3 flex-shrink-0" />
                        <span class="truncate">{{ formatearDireccion(sucursal) }}</span>
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <!-- Footer -->
            <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <p class="text-xs text-center text-gray-500">
                Puedes cambiar la sucursal en cualquier momento desde el encabezado
              </p>
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
</style>
