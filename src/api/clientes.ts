import apiClient from './client'
import type {
  Cliente,
  CrearClienteRequest,
  ActualizarClienteRequest,
  ListarClientesParams,
  DireccionCliente,
  CrearDireccionRequest,
  ActualizarDireccionRequest
} from '@/types'

// =============================================================================
// Clientes API Functions
// =============================================================================

/**
 * List all clients
 */
export async function listar(params?: ListarClientesParams): Promise<Cliente[]> {
  const response = await apiClient.get<Cliente[]>('/clientes', { params })
  return response.data
}

/**
 * Get a single client by ID
 */
export async function obtener(id: string): Promise<Cliente> {
  const response = await apiClient.get<Cliente>(`/clientes/${id}`)
  return response.data
}

/**
 * Create a new client
 */
export async function crear(datos: CrearClienteRequest): Promise<Cliente> {
  const response = await apiClient.post<Cliente>('/clientes', datos)
  return response.data
}

/**
 * Update client (partial update)
 */
export async function actualizar(id: string, datos: ActualizarClienteRequest): Promise<Cliente> {
  const response = await apiClient.patch<Cliente>(`/clientes/${id}`, datos)
  return response.data
}

/**
 * Delete a client
 */
export async function eliminar(id: string): Promise<void> {
  await apiClient.delete(`/clientes/${id}`)
}

// =============================================================================
// Direcciones API Functions
// =============================================================================

/**
 * List all addresses for a client
 */
export async function listarDirecciones(clienteId: string): Promise<DireccionCliente[]> {
  const response = await apiClient.get<DireccionCliente[]>(`/clientes/${clienteId}/direcciones`)
  return response.data
}

/**
 * Get a single address
 */
export async function obtenerDireccion(clienteId: string, direccionId: string): Promise<DireccionCliente> {
  const response = await apiClient.get<DireccionCliente>(`/clientes/${clienteId}/direcciones/${direccionId}`)
  return response.data
}

/**
 * Create a new address for a client
 */
export async function crearDireccion(clienteId: string, datos: CrearDireccionRequest): Promise<DireccionCliente> {
  const response = await apiClient.post<DireccionCliente>(`/clientes/${clienteId}/direcciones`, datos)
  return response.data
}

/**
 * Update an address
 */
export async function actualizarDireccion(
  clienteId: string,
  direccionId: string,
  datos: ActualizarDireccionRequest
): Promise<DireccionCliente> {
  const response = await apiClient.patch<DireccionCliente>(
    `/clientes/${clienteId}/direcciones/${direccionId}`,
    datos
  )
  return response.data
}

/**
 * Delete an address
 */
export async function eliminarDireccion(clienteId: string, direccionId: string): Promise<void> {
  await apiClient.delete(`/clientes/${clienteId}/direcciones/${direccionId}`)
}
