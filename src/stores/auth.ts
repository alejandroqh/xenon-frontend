import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// TODO: Remove hardcoded credentials when backend is enabled
const MOCK_CREDENTIALS = { username: 'admin', password: 'admin' }
const MOCK_TOKEN = 'mock-jwt-token'
const MOCK_USUARIO = { id: '1', nombre: 'Administrador', email: 'admin@xenon.com' }

export interface Usuario {
  id: string
  nombre: string
  email: string
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('auth_token'))
  const usuario = ref<Usuario | null>(token.value ? MOCK_USUARIO : null)
  const cargando = ref(false)
  const error = ref<string | null>(null)

  const estaAutenticado = computed(() => !!token.value)

  async function iniciarSesion(nombreUsuario: string, contrasena: string): Promise<boolean> {
    cargando.value = true
    error.value = null

    // TODO: Replace with API call when backend is enabled
    // const response = await apiClient.post('/auth/login', { username, password })
    await new Promise(resolve => setTimeout(resolve, 500)) // Simulate network delay

    if (nombreUsuario === MOCK_CREDENTIALS.username && contrasena === MOCK_CREDENTIALS.password) {
      token.value = MOCK_TOKEN
      usuario.value = MOCK_USUARIO
      localStorage.setItem('auth_token', MOCK_TOKEN)
      cargando.value = false
      return true
    }

    error.value = 'Credenciales invalidas'
    cargando.value = false
    return false
  }

  function cerrarSesion() {
    token.value = null
    usuario.value = null
    localStorage.removeItem('auth_token')
  }

  function inicializar() {
    // TODO: Replace with API call when backend is enabled
    // const response = await apiClient.get('/auth/me')
    if (token.value) {
      usuario.value = MOCK_USUARIO
    }
  }

  return {
    token,
    usuario,
    cargando,
    error,
    estaAutenticado,
    iniciarSesion,
    cerrarSesion,
    inicializar
  }
})
