import apiClient from './client'
import type { UsuarioResponse } from '@/types'

// =============================================================================
// Usuarios API Functions
// =============================================================================

export interface ListarUsuariosParams {
  activo?: boolean
}

/**
 * List all users with their permissions
 */
export async function listar(params?: ListarUsuariosParams): Promise<UsuarioResponse[]> {
  const response = await apiClient.get<UsuarioResponse[]>('/usuarios', { params })
  return response.data
}

/**
 * Get a single user by ID
 */
export async function obtener(id: string): Promise<UsuarioResponse> {
  const response = await apiClient.get<UsuarioResponse>(`/usuarios/${id}`)
  return response.data
}

/**
 * Update user (partial update)
 */
export async function actualizar(id: string, datos: Partial<{
  nombreCompleto: string
  nombreUsuario: string
  email: string
  contrasena: string
  nivel: 'admin' | 'gerente' | 'vendedor' | 'operador' | 'visor'
  imagen: string | null
  telefono: string | null
  activo: boolean
  accesoApp: boolean
  permisosPorSucursal: Array<{
    sucursalId: string
    menus: Record<string, string[]>
  }>
}>): Promise<UsuarioResponse> {
  const response = await apiClient.patch<UsuarioResponse>(`/usuarios/${id}`, datos)
  return response.data
}
