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
