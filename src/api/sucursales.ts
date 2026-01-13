import apiClient from './client'
import type { Sucursal, ListarSucursalesParams } from '@/types'

// =============================================================================
// Sucursales API Functions
// =============================================================================

/**
 * List all sucursales accessible to the current user
 */
export async function listar(params?: ListarSucursalesParams): Promise<Sucursal[]> {
  const response = await apiClient.get<Sucursal[]>('/sucursales', { params })
  return response.data
}

/**
 * Get a single sucursal by ID
 */
export async function obtener(id: string): Promise<Sucursal> {
  const response = await apiClient.get<Sucursal>(`/sucursales/${id}`)
  return response.data
}
