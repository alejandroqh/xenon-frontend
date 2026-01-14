// =============================================================================
// Cliente Types
// =============================================================================

/**
 * Tipo de persona fiscal
 */
export type TipoPersona = 'fisica' | 'moral'

/**
 * Cliente entity
 */
export interface Cliente {
  id: string
  nombre: string
  razonSocial: string | null
  tipoPersona: TipoPersona | null
  pais: string
  rfc: string | null
  regimenFiscal: string | null
  usoCfdi: string | null
  codigoPostal: string | null
  tipoIdentificacion: string | null
  numeroIdentificacion: string | null
  email: string | null
  telefono: string | null
  calle: string | null
  ciudad: string | null
  estado: string | null
  agenteId: string | null
  perfil: string | null
  descuento: number
  observaciones: string | null
  activo: boolean
  creadoEn: number      // Unix timestamp
  actualizadoEn: number // Unix timestamp
}

/**
 * Request payload for creating a client
 */
export interface CrearClienteRequest {
  nombre: string
  razonSocial?: string | null
  tipoPersona?: TipoPersona | null
  pais?: string
  rfc?: string | null
  regimenFiscal?: string | null
  usoCfdi?: string | null
  codigoPostal?: string | null
  tipoIdentificacion?: string | null
  numeroIdentificacion?: string | null
  email?: string | null
  telefono?: string | null
  calle?: string | null
  ciudad?: string | null
  estado?: string | null
  agenteId?: string | null
  perfil?: string | null
  descuento?: number
  observaciones?: string | null
  activo?: boolean
}

/**
 * Request payload for updating a client
 */
export interface ActualizarClienteRequest {
  nombre?: string
  razonSocial?: string | null
  tipoPersona?: TipoPersona | null
  pais?: string
  rfc?: string | null
  regimenFiscal?: string | null
  usoCfdi?: string | null
  codigoPostal?: string | null
  tipoIdentificacion?: string | null
  numeroIdentificacion?: string | null
  email?: string | null
  telefono?: string | null
  calle?: string | null
  ciudad?: string | null
  estado?: string | null
  agenteId?: string | null
  perfil?: string | null
  descuento?: number
  observaciones?: string | null
  activo?: boolean
}

/**
 * Query params for listing clients
 */
export interface ListarClientesParams {
  activo?: boolean
  pais?: string
}

// =============================================================================
// Direccion Types
// =============================================================================

/**
 * Direccion de cliente entity
 */
export interface DireccionCliente {
  id: string
  clienteId: string
  nombre: string
  calle: string | null
  numeroExterior: string | null
  numeroInterior: string | null
  colonia: string | null
  ciudad: string | null
  estado: string | null
  codigoPostal: string | null
  pais: string
  lat: string | null
  lng: string | null
  esPrincipal: boolean
  activo: boolean
  creadoEn: number
  actualizadoEn: number
}

/**
 * Request payload for creating an address
 */
export interface CrearDireccionRequest {
  nombre: string
  calle?: string | null
  numeroExterior?: string | null
  numeroInterior?: string | null
  colonia?: string | null
  ciudad?: string | null
  estado?: string | null
  codigoPostal?: string | null
  pais?: string
  lat?: string | null
  lng?: string | null
  esPrincipal?: boolean
  activo?: boolean
}

/**
 * Request payload for updating an address
 */
export interface ActualizarDireccionRequest {
  nombre?: string
  calle?: string | null
  numeroExterior?: string | null
  numeroInterior?: string | null
  colonia?: string | null
  ciudad?: string | null
  estado?: string | null
  codigoPostal?: string | null
  pais?: string
  lat?: string | null
  lng?: string | null
  esPrincipal?: boolean
  activo?: boolean
}
