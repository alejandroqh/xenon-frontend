import type { AxiosError } from 'axios'

/**
 * Obtiene el mensaje de error en español de un error de API
 * Prioridad: mensaje del servidor > mensajeEspanol del interceptor > mensaje fallback
 */
export function obtenerMensajeError(err: unknown, fallback = 'Ocurrió un error inesperado'): string {
  if (!err) return fallback

  // Si es un error de Axios con mensajeEspanol (agregado por el interceptor)
  const axiosError = err as AxiosError & { mensajeEspanol?: string }

  // Primero intentar obtener mensaje del servidor (API response)
  if (axiosError.response?.data) {
    const data = axiosError.response.data as { message?: string; error?: string }
    if (data.message) return data.message
    if (data.error) return data.error
  }

  // Usar mensajeEspanol del interceptor
  if (axiosError.mensajeEspanol) {
    return axiosError.mensajeEspanol
  }

  // Fallback al mensaje original si no es "Network Error"
  if (err instanceof Error && err.message && err.message !== 'Network Error') {
    return err.message
  }

  return fallback
}
