import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import * as sucursalesApi from '@/api/sucursales'
import type { Sucursal } from '@/types'

export type { Sucursal }

export const useSucursalStore = defineStore('sucursal', () => {
  const authStore = useAuthStore()

  const sucursales = ref<Sucursal[]>([])
  const sucursalActualId = ref<string | null>(null)
  const cargando = ref(false)
  const error = ref<string | null>(null)

  // Only sucursales the user has access to
  const sucursalesAccesibles = computed(() => {
    return sucursales.value.filter(s => authStore.tieneAccesoSucursal(s.id))
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

  // Fetch sucursales from the backend
  async function cargarSucursales(): Promise<void> {
    cargando.value = true
    error.value = null

    try {
      sucursales.value = await sucursalesApi.listar()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar sucursales'
      error.value = message
      sucursales.value = []
    } finally {
      cargando.value = false
    }
  }

  // Initialize: load sucursales and select first accessible
  async function inicializar(): Promise<void> {
    await cargarSucursales()

    if (sucursalesAccesibles.value.length > 0 && !sucursalActualId.value) {
      sucursalActualId.value = sucursalesAccesibles.value[0]!.id
    }
  }

  // Reset store state
  function $reset() {
    sucursales.value = []
    sucursalActualId.value = null
    cargando.value = false
    error.value = null
  }

  return {
    sucursales,
    sucursalActual,
    sucursalesAccesibles,
    cargando,
    error,
    seleccionarSucursal,
    cargarSucursales,
    inicializar,
    $reset
  }
})
