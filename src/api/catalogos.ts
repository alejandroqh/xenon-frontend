import apiClient from './client'
import type {
  RegimenFiscal,
  TipoIdentificacion,
  UsoCfdi,
  TipoDocumentoFiscal,
  CatalogosParams
} from '@/types'

// =============================================================================
// Catalogos API Functions
// =============================================================================

/**
 * List fiscal regimes, optionally filtered by country
 */
export async function listarRegimenesFiscales(params?: CatalogosParams): Promise<RegimenFiscal[]> {
  const response = await apiClient.get<RegimenFiscal[]>('/catalogos/regimenes-fiscales', { params })
  return response.data
}

/**
 * List identification types, optionally filtered by country
 */
export async function listarTiposIdentificacion(params?: CatalogosParams): Promise<TipoIdentificacion[]> {
  const response = await apiClient.get<TipoIdentificacion[]>('/catalogos/tipos-identificacion', { params })
  return response.data
}

/**
 * List CFDI usage codes (Mexico-specific)
 */
export async function listarUsosCfdi(params?: CatalogosParams): Promise<UsoCfdi[]> {
  const response = await apiClient.get<UsoCfdi[]>('/catalogos/usos-cfdi', { params })
  return response.data
}

/**
 * List fiscal document types, optionally filtered by country
 */
export async function listarTiposDocumentoFiscal(params?: CatalogosParams): Promise<TipoDocumentoFiscal[]> {
  const response = await apiClient.get<TipoDocumentoFiscal[]>('/catalogos/tipos-documento-fiscal', { params })
  return response.data
}
