import apiClient from './client'
import type {
  Sucursal,
  ListarSucursalesParams,
  CrearSucursalRequest,
  ActualizarSucursalRequest
} from '@/types'

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

/**
 * Create a new sucursal
 */
export async function crear(data: CrearSucursalRequest): Promise<Sucursal> {
  const response = await apiClient.post<Sucursal>('/sucursales', data)
  return response.data
}

/**
 * Update an existing sucursal
 */
export async function actualizar(id: string, data: ActualizarSucursalRequest): Promise<Sucursal> {
  const response = await apiClient.patch<Sucursal>(`/sucursales/${id}`, data)
  return response.data
}

/**
 * Delete a sucursal
 */
export async function eliminar(id: string): Promise<void> {
  await apiClient.delete(`/sucursales/${id}`)
}
