// =============================================================================
// Catalog Types
// =============================================================================

import type { PaisSucursal } from './sucursales'

/**
 * Regimen Fiscal (Tax Regime) from catalog
 */
export interface RegimenFiscal {
  codigo: string
  pais: PaisSucursal | string
  descripcion: string
  fisica: boolean
  moral: boolean
  activo: boolean
}

/**
 * Tipo de Identificacion (Identification Type) from catalog
 */
export interface TipoIdentificacion {
  codigo: string
  pais: PaisSucursal | string
  descripcion: string
  requiereValidacion: boolean
  longitudMinima: number | null
  longitudMaxima: number | null
}

/**
 * Uso de CFDI (Mexico-specific) from catalog
 */
export interface UsoCfdi {
  id: string
  codigo: string
  nombre: string
  activo: boolean
}

/**
 * Tipo de Documento Fiscal from catalog
 */
export interface TipoDocumentoFiscal {
  id: string
  codigo: string
  nombre: string
  pais: PaisSucursal
  activo: boolean
}

/**
 * Query params for catalog endpoints
 */
export interface CatalogosParams {
  pais?: PaisSucursal | string
  activo?: boolean
}
