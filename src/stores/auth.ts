import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Permission actions for each menu item
export type PermisoAccion = 'view' | 'edit'

// All available menu routes
export type MenuRuta =
  | 'panel'
  | 'importaciones'
  | 'productos'
  | 'inventario'
  | 'clientes'
  | 'rutas'
  | 'promociones'
  | 'reportes'
  | 'estadisticas'
  | 'auditoria'
  | 'usuarios'
  | 'configuracion'

// User level/role
export type NivelUsuario = 'admin' | 'gerente' | 'vendedor' | 'operador' | 'visor'

// Permission map: menu -> allowed actions (empty array = disabled/no access)
export type MapaPermisosMenu = Partial<Record<MenuRuta, PermisoAccion[]>>

// Permissions for a specific sucursal
export interface PermisosSucursal {
  sucursalId: string
  menus: MapaPermisosMenu
}

export interface Usuario {
  id: string
  nombreCompleto: string
  nombreUsuario: string
  email: string
  nivel: NivelUsuario
  imagen: string | null
  // Sucursales the user has access to with their specific permissions
  permisosPorSucursal: PermisosSucursal[]
}

// All menu permissions (view + edit)
const TODOS_LOS_MENUS: MapaPermisosMenu = {
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

// Admin has full access to all sucursales
const PERMISOS_ADMIN: PermisosSucursal[] = [
  { sucursalId: 'san-juan-del-rio', menus: TODOS_LOS_MENUS },
  { sucursalId: 'tamaulipas', menus: TODOS_LOS_MENUS },
  { sucursalId: 'monterrey', menus: TODOS_LOS_MENUS }
]

// TODO: Remove hardcoded credentials when backend is enabled
const MOCK_CREDENTIALS = { username: 'admin', password: 'admin' }
const MOCK_TOKEN = 'mock-jwt-token'
const MOCK_USUARIO: Usuario = {
  id: '1',
  nombreCompleto: 'Administrador del Sistema',
  nombreUsuario: 'admin',
  email: 'admin@xenon.com',
  nivel: 'admin',
  imagen: null,
  permisosPorSucursal: PERMISOS_ADMIN
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
    token,
    usuario,
    cargando,
    error,
    estaAutenticado,
    sucursalesAccesibles,
    iniciarSesion,
    cerrarSesion,
    inicializar,
    tieneAccesoSucursal,
    obtenerPermisosSucursal,
    tienePermiso,
    puedeVer,
    puedeEditar,
    menuDeshabilitado
  }
})
