// =============================================================================
// Sucursal Types
// =============================================================================

/**
 * Sucursal (branch) entity
 */
export interface Sucursal {
  id: string
  nombre: string
  direccion: string | null
  telefono: string | null
  activo: boolean
  creadoEn: number      // Unix timestamp
  actualizadoEn: number // Unix timestamp
}

/**
 * Request payload for creating a sucursal
 */
export interface CrearSucursalRequest {
  nombre: string
  direccion?: string | null
  telefono?: string | null
}

/**
 * Request payload for updating a sucursal
 */
export interface ActualizarSucursalRequest {
  nombre?: string
  direccion?: string | null
  telefono?: string | null
  activo?: boolean
}

/**
 * Query params for listing sucursales
 */
export interface ListarSucursalesParams {
  activo?: boolean
}
