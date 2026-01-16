import apiClient from './client'
import type {
  Producto,
  ProductoDetalle,
  ListarProductosParams,
  CrearProductoRequest,
  ActualizarProductoRequest
} from '@/types'

// =============================================================================
// Productos API Functions
// =============================================================================

/**
 * List all products for current sucursal
 */
export async function listar(params?: ListarProductosParams): Promise<Producto[]> {
  const response = await apiClient.get<Producto[]>('/productos', { params })
  return response.data
}

/**
 * Get a single product by ID with related data
 */
export async function obtener(id: string): Promise<ProductoDetalle> {
  const response = await apiClient.get<ProductoDetalle>(`/productos/${id}`)
  return response.data
}

/**
 * Create a new product
 */
export async function crear(datos: CrearProductoRequest): Promise<Producto> {
  const response = await apiClient.post<Producto>('/productos', datos)
  return response.data
}

/**
 * Update product (partial update)
 */
export async function actualizar(id: string, datos: ActualizarProductoRequest): Promise<Producto> {
  const response = await apiClient.patch<Producto>(`/productos/${id}`, datos)
  return response.data
}

/**
 * Delete a product
 */
export async function eliminar(id: string): Promise<void> {
  await apiClient.delete(`/productos/${id}`)
}

// =============================================================================
// Bulk Upload API Functions
// =============================================================================

/**
 * Download Mexico CSV template
 */
export function descargarTemplateMX(): void {
  const url = `${apiClient.defaults.baseURL}/productos/template/mx`
  window.open(url, '_blank')
}

/**
 * Download Ecuador CSV template
 */
export function descargarTemplateEC(): void {
  const url = `${apiClient.defaults.baseURL}/productos/template/ec`
  window.open(url, '_blank')
}

/**
 * Bulk upload result for a single row
 */
export interface BulkUploadImported {
  row: number
  productoId: string
  nombre: string
}

export interface BulkUploadError {
  row: number
  data: Record<string, unknown>
  errors: string[]
}

export interface BulkUploadSummary {
  total: number
  imported: number
  skipped: number
  failed: number
}

export interface BulkUploadResponse {
  success: boolean
  summary: BulkUploadSummary
  imported: BulkUploadImported[]
  errors: BulkUploadError[]
}

/**
 * Bulk upload products from CSV file
 */
export async function cargaMasiva(file: File): Promise<BulkUploadResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiClient.post<BulkUploadResponse>('/productos/bulk-upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return response.data
}
