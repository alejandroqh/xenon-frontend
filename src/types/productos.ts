// =============================================================================
// Producto Types
// =============================================================================

/**
 * SAT objeto de impuesto codes
 */
export type ObjetoImpuesto = '01' | '02' | '03' | '04'

/**
 * Producto entity
 */
export interface Producto {
  // Identity
  id: string
  sucursalId: string

  // Core Info
  nombre: string
  descripcion: string | null
  marca: string | null
  modelo: string | null

  // Identifiers
  sku: string | null
  codigoBarras: string | null
  codigoFabricante: string | null

  // Mexico SAT CFDI 4.0
  claveProdServ: string | null
  claveUnidad: string | null
  noIdentificacion: string | null

  // Ecuador SRI
  codigoPrincipal: string | null
  codigoAuxiliar: string | null

  // Pricing (decimal as string for precision)
  precioBase: string | null
  precioMinimo: string | null
  costo: string | null
  moneda: string

  // Tax Config
  tasaIva: string
  exentoIva: boolean
  tasaIeps: string | null
  objetoImp: ObjetoImpuesto

  // Unit of Measure
  unidadId: string | null
  unidadNombre: string | null
  contenidoUnidad: string | null

  // Categorization
  categoriaId: string | null
  etiquetas: string[] | null

  // Images
  imagenPrincipal: string | null
  galeriaImagenes: string[] | null

  // Physical Attributes (as strings)
  peso: string | null
  largo: string | null
  ancho: string | null
  alto: string | null

  // Technical Specs
  especificaciones: Record<string, string> | null

  // Sales Config
  paraVentaPublico: boolean
  aplicarDescuento: boolean
  esServicio: boolean

  // Status & Timestamps
  activo: boolean
  creadoEn: number
  actualizadoEn: number
}

/**
 * Category info included in ProductoDetalle
 */
export interface CategoriaInfo {
  id: string
  nombre: string
  ruta: string | null
}

/**
 * Unit info included in ProductoDetalle
 */
export interface UnidadInfo {
  codigo: string
  nombre: string
  codigoSat: string | null
}

/**
 * Inventory info included in ProductoDetalle
 */
export interface InventarioInfo {
  id: number
  productoId: string
  sucursalId: string
  existenciaActual: string
  existenciaMinima: string | null
  existenciaMaxima: string | null
  existenciaReservada: string
  ubicacion: string | null
  ultimaEntrada: number | null
  ultimaSalida: number | null
  costoPromedio: string | null
  actualizadoEn: number
}

/**
 * Producto with related data (category, unit, inventory)
 */
export interface ProductoDetalle extends Producto {
  categoria: CategoriaInfo | null
  unidad: UnidadInfo | null
  inventario: InventarioInfo | null
}

/**
 * Query params for listing products
 */
export interface ListarProductosParams {
  activo?: boolean
  categoriaId?: string
  marca?: string
  esServicio?: boolean
  buscar?: string
}

/**
 * Request payload for creating a product
 */
export interface CrearProductoRequest {
  // Required
  nombre: string

  // Core Info
  descripcion?: string | null
  marca?: string | null
  modelo?: string | null

  // Identifiers
  sku?: string | null
  codigoBarras?: string | null
  codigoFabricante?: string | null

  // Mexico SAT CFDI 4.0
  claveProdServ?: string | null
  claveUnidad?: string | null
  noIdentificacion?: string | null

  // Ecuador SRI
  codigoPrincipal?: string | null
  codigoAuxiliar?: string | null

  // Pricing (decimal as string)
  precioBase?: string | null
  precioMinimo?: string | null
  costo?: string | null
  moneda?: string

  // Tax Config
  tasaIva?: string
  exentoIva?: boolean
  tasaIeps?: string | null
  objetoImp?: ObjetoImpuesto

  // Unit of Measure
  unidadId?: string | null
  unidadNombre?: string | null
  contenidoUnidad?: string | null

  // Categorization
  categoriaId?: string | null
  etiquetas?: string[] | null

  // Images
  imagenPrincipal?: string | null
  galeriaImagenes?: string[] | null

  // Physical Attributes
  peso?: string | null
  largo?: string | null
  ancho?: string | null
  alto?: string | null

  // Technical Specs
  especificaciones?: Record<string, string> | null

  // Sales Config
  paraVentaPublico?: boolean
  aplicarDescuento?: boolean
  esServicio?: boolean

  // Status
  activo?: boolean
}

/**
 * Request payload for updating a product (all fields optional)
 */
export type ActualizarProductoRequest = Partial<CrearProductoRequest>
