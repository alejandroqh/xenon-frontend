import axios from 'axios'
import { useSucursalStore } from '@/stores/sucursal'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

// Interceptor to add sucursal header to all requests
apiClient.interceptors.request.use((config) => {
  const sucursalStore = useSucursalStore()
  config.headers['X-Sucursal-Id'] = sucursalStore.sucursalActual.id
  return config
})

export default apiClient
