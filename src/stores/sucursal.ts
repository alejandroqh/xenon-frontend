import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Sucursal {
  id: string
  nombre: string
}

const sucursales: Sucursal[] = [
  { id: 'san-juan-del-rio', nombre: 'San Juan del Río' },
  { id: 'tamaulipas', nombre: 'Tamaulipas' },
  { id: 'monterrey', nombre: 'Monterrey' }
]

export const useSucursalStore = defineStore('sucursal', () => {
  const sucursalActual = ref<Sucursal>(sucursales[0]!)

  const todasLasSucursales = computed(() => sucursales)

  function seleccionarSucursal(id: string) {
    const sucursal = sucursales.find(s => s.id === id)
    if (sucursal) {
      sucursalActual.value = sucursal
    }
  }

  return {
    sucursalActual,
    todasLasSucursales,
    seleccionarSucursal
  }
})
