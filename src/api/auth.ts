import axios from 'axios'

// =============================================================================
// Types
// =============================================================================

export interface Usuario {
  id: string
  nombreCompleto: string
  nombreUsuario: string
  email: string
  nivel: 'admin' | 'gerente' | 'vendedor' | 'operador' | 'visor'
  imagen: string | null
  permisosPorSucursal: PermisosSucursal[]
}

export interface PermisosSucursal {
  sucursalId: string
  menus: Partial<Record<string, ('view' | 'edit')[]>>
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: Usuario
}

export interface RefreshRequest {
  refreshToken: string
}

export interface RefreshResponse {
  accessToken: string
  expiresIn: number
}

// =============================================================================
// Mock Data - Remove when backend is ready
// =============================================================================

const MOCK_ENABLED = true
const MOCK_DELAY = 300

const TODOS_LOS_MENUS: PermisosSucursal['menus'] = {
  panel: ['view', 'edit'],
  importaciones: ['view', 'edit'],
  productos: ['view', 'edit'],
  inventario: ['view', 'edit'],
  clientes: ['view', 'edit'],
  rutas: ['view', 'edit'],
  promociones: ['view', 'edit'],
  reportes: ['view', 'edit'],
  estadisticas: ['view', 'edit'],
  auditoria: ['view', 'edit'],
  usuarios: ['view', 'edit'],
  configuracion: ['view', 'edit']
}

const MOCK_USERS: Record<string, { password: string; user: Usuario }> = {
  admin: {
    password: 'admin',
    user: {
      id: '1',
      nombreCompleto: 'Administrador del Sistema',
      nombreUsuario: 'admin',
      email: 'admin@xenon.com',
      nivel: 'admin',
      imagen: null,
      permisosPorSucursal: [
        { sucursalId: 'san-juan-del-rio', menus: TODOS_LOS_MENUS },
        { sucursalId: 'tamaulipas', menus: TODOS_LOS_MENUS },
        { sucursalId: 'monterrey', menus: TODOS_LOS_MENUS }
      ]
    }
  }
}

// Simulated server-side token storage
const mockTokenRegistry = {
  accessTokens: new Map<string, { userId: string; expiresAt: number }>(),
  refreshTokens: new Map<string, { userId: string; expiresAt: number }>()
}

function generateToken(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2)}`
}

// =============================================================================
// Auth API Client
// =============================================================================

const authApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' }
})

// Mock interceptor - Remove when backend is ready
if (MOCK_ENABLED) {
  authApi.interceptors.request.use(async (config) => {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY))
    return config
  })

  authApi.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = error.config

      // Mock: POST /auth/login
      if (config.url === '/auth/login' && config.method === 'post') {
        const { username, password } = JSON.parse(config.data)
        const mockUser = MOCK_USERS[username]

        if (!mockUser || mockUser.password !== password) {
          return Promise.reject({
            response: { status: 401, data: { message: 'Credenciales inválidas' } }
          })
        }

        const accessToken = generateToken('access')
        const refreshToken = generateToken('refresh')

        mockTokenRegistry.accessTokens.set(accessToken, {
          userId: mockUser.user.id,
          expiresAt: Date.now() + 15 * 60 * 1000 // 15 min
        })
        mockTokenRegistry.refreshTokens.set(refreshToken, {
          userId: mockUser.user.id,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
        })

        return {
          data: {
            accessToken,
            refreshToken,
            expiresIn: 900,
            user: mockUser.user
          } as LoginResponse
        }
      }

      // Mock: POST /auth/refresh
      if (config.url === '/auth/refresh' && config.method === 'post') {
        const { refreshToken } = JSON.parse(config.data)
        const tokenData = mockTokenRegistry.refreshTokens.get(refreshToken)

        if (!tokenData || tokenData.expiresAt < Date.now()) {
          mockTokenRegistry.refreshTokens.delete(refreshToken)
          return Promise.reject({
            response: { status: 401, data: { message: 'Refresh token inválido' } }
          })
        }

        const newAccessToken = generateToken('access')
        mockTokenRegistry.accessTokens.set(newAccessToken, {
          userId: tokenData.userId,
          expiresAt: Date.now() + 15 * 60 * 1000
        })

        return {
          data: { accessToken: newAccessToken, expiresIn: 900 } as RefreshResponse
        }
      }

      // Mock: GET /auth/me
      if (config.url === '/auth/me' && config.method === 'get') {
        const authHeader = config.headers?.Authorization as string
        const accessToken = authHeader?.replace('Bearer ', '')
        const tokenData = mockTokenRegistry.accessTokens.get(accessToken)

        if (!tokenData || tokenData.expiresAt < Date.now()) {
          mockTokenRegistry.accessTokens.delete(accessToken)
          return Promise.reject({
            response: { status: 401, data: { message: 'Token inválido o expirado' } }
          })
        }

        const user = Object.values(MOCK_USERS).find(u => u.user.id === tokenData.userId)
        if (!user) {
          return Promise.reject({
            response: { status: 404, data: { message: 'Usuario no encontrado' } }
          })
        }

        return { data: user.user }
      }

      // Mock: POST /auth/logout
      if (config.url === '/auth/logout' && config.method === 'post') {
        const authHeader = config.headers?.Authorization as string
        const accessToken = authHeader?.replace('Bearer ', '')
        const { refreshToken } = JSON.parse(config.data || '{}')

        mockTokenRegistry.accessTokens.delete(accessToken)
        if (refreshToken) {
          mockTokenRegistry.refreshTokens.delete(refreshToken)
        }

        return { data: { message: 'Sesión cerrada' } }
      }

      return Promise.reject(error)
    }
  )
}

// =============================================================================
// API Functions
// =============================================================================

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await authApi.post<LoginResponse>('/auth/login', credentials)
  return response.data
}

export async function refresh(refreshToken: string): Promise<RefreshResponse> {
  const response = await authApi.post<RefreshResponse>('/auth/refresh', { refreshToken })
  return response.data
}

export async function getMe(accessToken: string): Promise<Usuario> {
  const response = await authApi.get<Usuario>('/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  return response.data
}

export async function logout(accessToken: string, refreshToken: string | null): Promise<void> {
  await authApi.post('/auth/logout', { refreshToken }, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
}
