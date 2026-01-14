import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import * as sucursalesApi from '@/api/sucursales'
import type { Sucursal } from '@/types'

export type { Sucursal }

const STORAGE_KEY = 'sucursal_seleccionada'

export const useSucursalStore = defineStore('sucursal', () => {
  const authStore = useAuthStore()

  const sucursales = ref<Sucursal[]>([])
  const sucursalActualId = ref<string | null>(null)
  const seleccionExplicita = ref(false)
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

  // True when user has multiple sucursales and hasn't explicitly selected one
  const requiereSeleccion = computed(() => {
    return sucursalesAccesibles.value.length > 1 && !seleccionExplicita.value
  })

  function seleccionarSucursal(id: string, explicita: boolean = false) {
    if (authStore.tieneAccesoSucursal(id)) {
      sucursalActualId.value = id
      if (explicita) {
        seleccionExplicita.value = true
        localStorage.setItem(STORAGE_KEY, id)
      }
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

  // Initialize: load sucursales and handle selection
  async function inicializar(): Promise<void> {
    await cargarSucursales()

    // Check for persisted selection in localStorage
    const persistedId = localStorage.getItem(STORAGE_KEY)
    if (persistedId && sucursalesAccesibles.value.some(s => s.id === persistedId)) {
      sucursalActualId.value = persistedId
      seleccionExplicita.value = true
      return
    }

    // Auto-select only if user has exactly 1 accessible sucursal
    if (sucursalesAccesibles.value.length === 1) {
      sucursalActualId.value = sucursalesAccesibles.value[0]!.id
      seleccionExplicita.value = true
    } else if (sucursalesAccesibles.value.length > 1) {
      // Multiple sucursales: set first as default but require explicit selection
      sucursalActualId.value = sucursalesAccesibles.value[0]!.id
      seleccionExplicita.value = false
    }
  }

  // Reset store state
  function $reset() {
    sucursales.value = []
    sucursalActualId.value = null
    seleccionExplicita.value = false
    cargando.value = false
    error.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  return {
    sucursales,
    sucursalActual,
    sucursalesAccesibles,
    requiereSeleccion,
    cargando,
    error,
    seleccionarSucursal,
    cargarSucursales,
    inicializar,
    $reset
  }
})
