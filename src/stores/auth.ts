import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as authApi from '@/api/auth'
import type {
  Usuario,
  PermisosSucursal,
  PermisoAccion,
  NivelUsuario,
  MenuRuta
} from '@/types'

// Re-export types for convenience
export type { Usuario, PermisosSucursal, PermisoAccion, NivelUsuario, MenuRuta }

// Token refresh buffer (refresh 1 minute before expiration)
const REFRESH_BUFFER_MS = 60 * 1000

export const useAuthStore = defineStore('auth', () => {
  // Access token stored in memory only (not localStorage) for security
  // This means users need to re-login on page refresh unless refresh token is valid
  let accessToken: string | null = null
  let refreshTimer: ReturnType<typeof setTimeout> | null = null

  // Refresh token in localStorage (in production, use HttpOnly cookie)
  const getRefreshToken = () => localStorage.getItem('refresh_token')
  const setRefreshToken = (token: string | null) => {
    if (token) {
      localStorage.setItem('refresh_token', token)
    } else {
      localStorage.removeItem('refresh_token')
    }
  }

  const usuario = ref<Usuario | null>(null)
  const cargando = ref(false)
  const error = ref<string | null>(null)
  const inicializado = ref(false)

  const estaAutenticado = computed(() => !!usuario.value && !!accessToken)

  // Get current access token (for API client)
  function getAccessToken(): string | null {
    return accessToken
  }

  // Schedule token refresh before expiration
  function scheduleTokenRefresh(expiresIn: number) {
    if (refreshTimer) {
      clearTimeout(refreshTimer)
    }

    const refreshIn = Math.max((expiresIn * 1000) - REFRESH_BUFFER_MS, 0)
    refreshTimer = setTimeout(async () => {
      await refrescarToken()
    }, refreshIn)
  }

  // Refresh access token using refresh token
  async function refrescarToken(): Promise<boolean> {
    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      return false
    }

    try {
      const response = await authApi.refresh(refreshToken)
      accessToken = response.accessToken
      scheduleTokenRefresh(response.expiresIn)
      return true
    } catch {
      // Refresh failed, clear everything
      limpiarSesion()
      return false
    }
  }

  // Clear session data without API call
  function limpiarSesion() {
    accessToken = null
    usuario.value = null
    setRefreshToken(null)
    if (refreshTimer) {
      clearTimeout(refreshTimer)
      refreshTimer = null
    }
  }

  async function iniciarSesion(nombreUsuario: string, contrasena: string): Promise<boolean> {
    cargando.value = true
    error.value = null

    try {
      const response = await authApi.login({
        username: nombreUsuario,
        password: contrasena
      })

      accessToken = response.accessToken
      usuario.value = response.user
      setRefreshToken(response.refreshToken)
      scheduleTokenRefresh(response.expiresIn)
      inicializado.value = true

      cargando.value = false
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión'
      error.value = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || message
      cargando.value = false
      return false
    }
  }

  async function cerrarSesion() {
    cargando.value = true

    try {
      // Call logout API to invalidate tokens server-side
      if (accessToken) {
        await authApi.logout(accessToken, getRefreshToken())
      }
    } catch {
      // Ignore logout errors, clear local state anyway
    } finally {
      limpiarSesion()
      cargando.value = false
    }
  }

  // Initialize auth state on app startup
  async function inicializar(): Promise<boolean> {
    if (inicializado.value) {
      return estaAutenticado.value
    }

    cargando.value = true

    try {
      // Try to refresh token if we have one
      const refreshToken = getRefreshToken()
      if (!refreshToken) {
        inicializado.value = true
        cargando.value = false
        return false
      }

      // Get new access token
      const refreshed = await refrescarToken()
      if (!refreshed || !accessToken) {
        inicializado.value = true
        cargando.value = false
        return false
      }

      // Validate token and get user data
      usuario.value = await authApi.getMe(accessToken)
      inicializado.value = true
      cargando.value = false
      return true
    } catch {
      limpiarSesion()
      inicializado.value = true
      cargando.value = false
      return false
    }
  }

  // Get list of sucursal IDs the user has access to
  const sucursalesAccesibles = computed(() => {
    if (!usuario.value) return []
    return usuario.value.permisosPorSucursal.map(p => p.sucursalId)
  })

  // Check if user has access to a specific sucursal
  function tieneAccesoSucursal(sucursalId: string): boolean {
    return sucursalesAccesibles.value.includes(sucursalId)
  }

  // Get permissions for a specific sucursal
  function obtenerPermisosSucursal(sucursalId: string): PermisosSucursal | null {
    if (!usuario.value) return null
    return usuario.value.permisosPorSucursal.find(p => p.sucursalId === sucursalId) ?? null
  }

  // Check if user has a specific permission for a menu in a sucursal
  function tienePermiso(sucursalId: string, menu: MenuRuta, accion: PermisoAccion): boolean {
    const permisos = obtenerPermisosSucursal(sucursalId)
    if (!permisos) return false
    const acciones = permisos.menus[menu]
    if (!acciones) return false
    return acciones.includes(accion)
  }

  // Check if user can view a menu in a sucursal
  function puedeVer(sucursalId: string, menu: MenuRuta): boolean {
    return tienePermiso(sucursalId, menu, 'view')
  }

  // Check if user can edit in a menu section for a sucursal
  function puedeEditar(sucursalId: string, menu: MenuRuta): boolean {
    return tienePermiso(sucursalId, menu, 'edit')
  }

  // Check if menu is disabled/inaccessible for user in a sucursal
  function menuDeshabilitado(sucursalId: string, menu: MenuRuta): boolean {
    const permisos = obtenerPermisosSucursal(sucursalId)
    if (!permisos) return true
    const acciones = permisos.menus[menu]
    return !acciones || acciones.length === 0
  }

  return {
    usuario,
    cargando,
    error,
    inicializado,
    estaAutenticado,
    sucursalesAccesibles,
    getAccessToken,
    iniciarSesion,
    cerrarSesion,
    inicializar,
    refrescarToken,
    tieneAccesoSucursal,
    obtenerPermisosSucursal,
    tienePermiso,
    puedeVer,
    puedeEditar,
    menuDeshabilitado
  }
})
