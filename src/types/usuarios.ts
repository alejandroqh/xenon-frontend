// =============================================================================
// Usuario Types
// =============================================================================

/**
 * User role levels
 */
export type NivelUsuario = 'admin' | 'gerente' | 'vendedor' | 'operador' | 'visor'

/**
 * Permission actions
 */
export type PermisoAccion = 'view' | 'edit'

/**
 * Menu route identifiers
 */
export type MenuRuta =
  | 'panel'
  | 'importaciones'
  | 'productos'
  | 'inventario'
  | 'clientes'
  | 'rutas'
  | 'promociones'
  | 'reportes'
  | 'estadisticas'
  | 'auditoria'
  | 'usuarios'
  | 'configuracion'

/**
 * Permissions for a specific sucursal
 */
export interface PermisosSucursal {
  sucursalId: string
  menus: Partial<Record<MenuRuta, PermisoAccion[]>>
}

/**
 * Permissions for a specific sucursal (API response with sucursal name)
 */
export interface PermisosSucursalResponse extends PermisosSucursal {
  sucursalNombre: string
}

/**
 * User entity
 */
export interface Usuario {
  id: string
  nombreCompleto: string
  nombreUsuario: string
  email: string
  nivel: NivelUsuario
  imagen: string | null
  telefono: string | null
  activo: boolean
  accesoApp: boolean    // Enable/disable Android app login
  permisosPorSucursal: PermisosSucursal[]
  creadoEn: number      // Unix timestamp
  actualizadoEn: number // Unix timestamp
}

/**
 * User entity from API response (includes sucursalNombre in permissions)
 */
export interface UsuarioResponse extends Omit<Usuario, 'permisosPorSucursal'> {
  permisosPorSucursal: PermisosSucursalResponse[]
}

/**
 * Request payload for creating a user
 */
export interface CrearUsuarioRequest {
  nombreCompleto: string
  nombreUsuario: string
  email: string
  contrasena: string
  nivel: NivelUsuario
  imagen?: string | null
  telefono?: string | null
  accesoApp?: boolean
  permisosPorSucursal: PermisosSucursal[]
}

/**
 * Request payload for updating a user
 */
export interface ActualizarUsuarioRequest {
  nombreCompleto?: string
  email?: string
  nivel?: NivelUsuario
  imagen?: string | null
  telefono?: string | null
  activo?: boolean
  accesoApp?: boolean
  permisosPorSucursal?: PermisosSucursal[]
}

/**
 * Request payload for changing password
 */
export interface CambiarContrasenaRequest {
  contrasenaActual: string
  contrasenaNueva: string
}

/**
 * Sortable fields for user list
 */
export type UsuarioCampoOrden = 'nombreCompleto' | 'nombreUsuario' | 'email' | 'nivel' | 'creadoEn'

/**
 * Filters for user list query
 */
export interface UsuarioFiltros {
  busqueda?: string           // Search in nombreCompleto, nombreUsuario, email
  nivel?: NivelUsuario[]
  activo?: boolean
  sucursalId?: string         // Filter by sucursal access
}

/**
 * Query params for listing users
 */
export interface ListarUsuariosParams {
  pagina?: number
  limite?: number
  ordenarPor?: UsuarioCampoOrden
  direccion?: 'asc' | 'desc'
  filtros?: UsuarioFiltros
}
