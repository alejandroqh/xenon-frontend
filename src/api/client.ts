import axios from 'axios'
import { useSucursalStore } from '@/stores/sucursal'

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

  // Add Authorization header if token exists
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }

  return config
})

// Response interceptor to handle 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
