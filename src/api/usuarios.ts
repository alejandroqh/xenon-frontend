import apiClient from './client'
import type { UsuarioResponse, CrearUsuarioRequest, ActualizarUsuarioRequest } from '@/types'

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
 * Create a new user
 */
export async function crear(datos: CrearUsuarioRequest): Promise<UsuarioResponse> {
  const response = await apiClient.post<UsuarioResponse>('/usuarios', datos)
  return response.data
}

/**
 * Update user (partial update)
 */
export async function actualizar(id: string, datos: ActualizarUsuarioRequest): Promise<UsuarioResponse> {
  const response = await apiClient.patch<UsuarioResponse>(`/usuarios/${id}`, datos)
  return response.data
}
