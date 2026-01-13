import axios from 'axios'
import { useSucursalStore } from '@/stores/sucursal'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

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

    return Promise.reject(error)
  }
)

export default apiClient
