// =============================================================================
// Sucursal Types
// =============================================================================

/**
 * Supported countries for sucursales
 */
export type PaisSucursal = 'MX' | 'EC'

/**
 * Mexico tax regimes (Regimen Fiscal SAT)
 */
export type RegimenFiscalMX =
  | '601' // General de Ley Personas Morales
  | '603' // Personas Morales con Fines no Lucrativos
  | '605' // Sueldos y Salarios e Ingresos Asimilados a Salarios
  | '606' // Arrendamiento
  | '607' // Regimen de Enajenacion o Adquisicion de Bienes
  | '608' // Demas ingresos
  | '610' // Residentes en el Extranjero sin Establecimiento Permanente en Mexico
  | '611' // Ingresos por Dividendos
  | '612' // Personas Fisicas con Actividades Empresariales y Profesionales
  | '614' // Ingresos por intereses
  | '615' // Regimen de los ingresos por obtencion de premios
  | '616' // Sin obligaciones fiscales
  | '620' // Sociedades Cooperativas de Produccion
  | '621' // Incorporacion Fiscal
  | '622' // Actividades Agricolas, Ganaderas, Silvicolas y Pesqueras
  | '623' // Opcional para Grupos de Sociedades
  | '624' // Coordinados
  | '625' // Regimen de las Actividades Empresariales con ingresos a traves de Plataformas Tecnologicas
  | '626' // Regimen Simplificado de Confianza

/**
 * Sucursal (branch) entity with fiscal model
 */
export interface Sucursal {
  id: string
  nombre: string
  activo: boolean
  creadoEn: number      // Unix timestamp
  actualizadoEn: number // Unix timestamp

  // Structured address fields
  calle: string | null
  numeroExterior: string | null
  numeroInterior: string | null
  colonia: string | null
  ciudad: string | null
  estado: string | null
  codigoPostal: string | null
  pais: PaisSucursal

  // Commercial/Legal fields
  alias: string | null
  razonSocial: string | null
  representanteLegal: string | null

  // Mexico fiscal fields
  rfc: string | null
  regimenFiscal: RegimenFiscalMX | null

  // Ecuador fiscal fields
  ruc: string | null
  codigoEstablecimiento: string | null
  puntoEmision: string | null

  // Contact fields
  email: string | null
  telefono: string | null

  // Factura readiness
  facturaReady: boolean
  facturaReadyMissing?: string[] // Only present when facturaReady is false
}

/**
 * Request payload for creating a sucursal
 */
export interface CrearSucursalRequest {
  nombre: string
  pais: PaisSucursal

  // Structured address fields
  calle?: string | null
  numeroExterior?: string | null
  numeroInterior?: string | null
  colonia?: string | null
  ciudad?: string | null
  estado?: string | null
  codigoPostal?: string | null

  // Commercial/Legal fields
  alias?: string | null
  razonSocial?: string | null
  representanteLegal?: string | null

  // Mexico fiscal fields
  rfc?: string | null
  regimenFiscal?: RegimenFiscalMX | null

  // Ecuador fiscal fields
  ruc?: string | null
  codigoEstablecimiento?: string | null
  puntoEmision?: string | null

  // Contact fields
  email?: string | null
  telefono?: string | null
}

/**
 * Request payload for updating a sucursal
 */
export interface ActualizarSucursalRequest {
  nombre?: string
  activo?: boolean

  // Structured address fields
  calle?: string | null
  numeroExterior?: string | null
  numeroInterior?: string | null
  colonia?: string | null
  ciudad?: string | null
  estado?: string | null
  codigoPostal?: string | null

  // Commercial/Legal fields
  alias?: string | null
  razonSocial?: string | null
  representanteLegal?: string | null

  // Mexico fiscal fields
  rfc?: string | null
  regimenFiscal?: RegimenFiscalMX | null

  // Ecuador fiscal fields
  ruc?: string | null
  codigoEstablecimiento?: string | null
  puntoEmision?: string | null

  // Contact fields
  email?: string | null
  telefono?: string | null
}

/**
 * Query params for listing sucursales
 */
export interface ListarSucursalesParams {
  activo?: boolean
}
