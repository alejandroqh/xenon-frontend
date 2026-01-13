import axios from 'axios'
import type { Usuario, PermisosSucursal } from '@/types'

// Re-export for backwards compatibility
export type { Usuario, PermisosSucursal }

// =============================================================================
// Auth API Types
// =============================================================================

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: Usuario
}

export interface RefreshRequest {
  refreshToken: string
}

export interface RefreshResponse {
  accessToken: string
  expiresIn: number
}

// =============================================================================
// Auth API Client
// =============================================================================

const authApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' }
})

// =============================================================================
// API Functions
// =============================================================================

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await authApi.post<LoginResponse>('/auth/login', credentials)
  return response.data
}

export async function refresh(refreshToken: string): Promise<RefreshResponse> {
  const response = await authApi.post<RefreshResponse>('/auth/refresh', { refreshToken })
  return response.data
}

export async function getMe(accessToken: string): Promise<Usuario> {
  const response = await authApi.get<Usuario>('/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  return response.data
}

export async function logout(accessToken: string, refreshToken: string | null): Promise<void> {
  await authApi.post('/auth/logout', { refreshToken }, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
}
