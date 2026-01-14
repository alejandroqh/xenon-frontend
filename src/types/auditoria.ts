// =============================================================================
// Auditoria Types
// =============================================================================

/**
 * Tipos de acciones que se registran en auditoría
 */
export type AccionAuditoria =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'REFRESH_FAILED'

/**
 * Entidades que son auditadas
 */
export type EntidadAuditoria =
  | 'sucursal'
  | 'usuario'
  | 'cliente'
  | 'permiso'
  | 'auth'

/**
 * Entrada de auditoría
 */
export interface AuditoriaEntrada {
  id: string
  secuencia: number
  hashActual: string
  hashAnterior: string | null
  accion: AccionAuditoria
  entidad: EntidadAuditoria | string
  entidadId: string
  usuarioId: string | null
  usuarioNombre: string | null
  sucursalId: string | null
  sucursalNombre: string | null
  pagina: string | null
  componente: string | null
  ipAddress: string | null
  userAgent: string | null
  valorAnterior: Record<string, unknown> | null
  valorNuevo: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  creadoEn: number // Unix timestamp
}

/**
 * Parámetros para listar entradas de auditoría
 */
export interface ListarAuditoriaParams {
  limit?: number
  offset?: number
  usuarioId?: string
  sucursalId?: string
  accion?: AccionAuditoria
  entidad?: string
  entidadId?: string
  desde?: number // Unix timestamp
  hasta?: number // Unix timestamp
}

/**
 * Respuesta paginada de auditoría
 */
export interface AuditoriaPaginada {
  data: AuditoriaEntrada[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

/**
 * Estadísticas de auditoría
 */
export interface AuditoriaStats {
  totalEntradas: number
  porAccion: Record<string, number>
  porEntidad: Record<string, number>
  porDia: Array<{ fecha: string; total: number }>
}

/**
 * Resultado de verificación de cadena hash
 */
export interface VerificacionCadena {
  valido: boolean
  totalVerificados: number
  errores: Array<{
    id: string
    esperado: string
    encontrado: string
  }>
}
