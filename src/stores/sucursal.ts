import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'

export interface Sucursal {
  id: string
  nombre: string
}

// All available sucursales in the system
const TODAS_SUCURSALES: Sucursal[] = [
  { id: 'san-juan-del-rio', nombre: 'San Juan del Río' },
  { id: 'tamaulipas', nombre: 'Tamaulipas' },
  { id: 'monterrey', nombre: 'Monterrey' }
]

export const useSucursalStore = defineStore('sucursal', () => {
  const authStore = useAuthStore()
  const sucursalActualId = ref<string | null>(null)

  // Only sucursales the user has access to
  const sucursalesAccesibles = computed(() => {
    return TODAS_SUCURSALES.filter(s => authStore.tieneAccesoSucursal(s.id))
  })

  // Current selected sucursal (defaults to first accessible)
  const sucursalActual = computed(() => {
    if (sucursalActualId.value) {
      const found = sucursalesAccesibles.value.find(s => s.id === sucursalActualId.value)
      if (found) return found
    }
    return sucursalesAccesibles.value[0] ?? null
  })

  function seleccionarSucursal(id: string) {
    if (authStore.tieneAccesoSucursal(id)) {
      sucursalActualId.value = id
    }
  }

  // Initialize to first accessible sucursal
  function inicializar() {
    if (sucursalesAccesibles.value.length > 0 && !sucursalActualId.value) {
      sucursalActualId.value = sucursalesAccesibles.value[0]!.id
    }
  }

  return {
    sucursalActual,
    sucursalesAccesibles,
    seleccionarSucursal,
    inicializar
  }
})
