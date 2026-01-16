import axios, { AxiosError } from 'axios'
import { useSucursalStore } from '@/stores/sucursal'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

// Traducir mensajes de error a español
function obtenerMensajeError(error: AxiosError): string {
  // Error de red (servidor caído, sin conexión, etc.)
  if (error.message === 'Network Error') {
    return 'Error de conexión. Verifique su conexión a internet o que el servidor esté disponible.'
  }

  // Timeout
  if (error.code === 'ECONNABORTED') {
    return 'La solicitud tardó demasiado tiempo. Intente nuevamente.'
  }

  // Errores HTTP según código de estado
  if (error.response) {
    const status = error.response.status
    const mensajesHTTP: Record<number, string> = {
      400: 'Solicitud inválida. Verifique los datos enviados.',
      401: 'No autorizado. Inicie sesión nuevamente.',
      403: 'Acceso denegado. No tiene permisos para esta acción.',
      404: 'Recurso no encontrado.',
      408: 'La solicitud tardó demasiado tiempo.',
      409: 'Conflicto con el estado actual del recurso.',
      422: 'Los datos enviados no son válidos.',
      429: 'Demasiadas solicitudes. Espere un momento.',
      500: 'Error interno del servidor. Intente más tarde.',
      502: 'Error de conexión con el servidor.',
      503: 'Servicio no disponible. El servidor está en mantenimiento.',
      504: 'El servidor no respondió a tiempo.'
    }

    return mensajesHTTP[status] || `Error del servidor (${status}).`
  }

  // Error genérico
  return 'Ocurrió un error inesperado. Intente nuevamente.'
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor to add headers
apiClient.interceptors.request.use((config) => {
  const sucursalStore = useSucursalStore()
  if (sucursalStore.sucursalActual) {
    config.headers['X-Sucursal-Id'] = sucursalStore.sucursalActual.id
  }

  // Get access token from auth store (stored in memory, not localStorage)
  const authStore = useAuthStore()
  const token = authStore.getAccessToken()
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }

  return config
})

// Response interceptor to handle 401 errors with token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // If 401 and we haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const authStore = useAuthStore()

      // Try to refresh the token
      const refreshed = await authStore.refrescarToken()

      if (refreshed) {
        // Update the Authorization header with new token
        const newToken = authStore.getAccessToken()
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`
        return apiClient(originalRequest)
      }

      // Refresh failed, redirect to login
      await authStore.cerrarSesion()
      router.push({ name: 'Login' })
    }

    // Agregar mensaje en español al error
    if (error.isAxiosError) {
      error.mensajeEspanol = obtenerMensajeError(error)
    }

    return Promise.reject(error)
  }
)

// Extender tipo de AxiosError para incluir mensajeEspanol
declare module 'axios' {
  export interface AxiosError {
    mensajeEspanol?: string
  }
}

export default apiClient
