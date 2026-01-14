import apiClient from './client'
import type {
  AuditoriaEntrada,
  AuditoriaPaginada,
  AuditoriaStats,
  ListarAuditoriaParams,
  VerificacionCadena
} from '@/types'

// =============================================================================
// Auditoria API Functions
// =============================================================================

/**
 * List audit entries with filters and pagination
 */
export async function listar(params?: ListarAuditoriaParams): Promise<AuditoriaPaginada> {
  const response = await apiClient.get<AuditoriaPaginada>('/auditoria', { params })
  return response.data
}

/**
 * Get a single audit entry by ID
 */
export async function obtener(id: string): Promise<AuditoriaEntrada> {
  const response = await apiClient.get<AuditoriaEntrada>(`/auditoria/${id}`)
  return response.data
}

/**
 * Get audit history for a specific entity
 */
export async function historial(entidad: string, entidadId: string): Promise<AuditoriaEntrada[]> {
  const response = await apiClient.get<AuditoriaEntrada[]>(
    `/auditoria/historial/${entidad}/${entidadId}`
  )
  return response.data
}

/**
 * Get audit statistics
 */
export async function estadisticas(): Promise<AuditoriaStats> {
  const response = await apiClient.get<AuditoriaStats>('/auditoria/stats')
  return response.data
}

/**
 * Verify hash chain integrity (admin only)
 */
export async function verificarCadena(): Promise<VerificacionCadena> {
  const response = await apiClient.get<VerificacionCadena>('/auditoria/verify')
  return response.data
}
