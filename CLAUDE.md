# CLAUDE.md

Vue 3 + TypeScript SPA for commercial operations with multi-branch (sucursal) support. Vite build, Tailwind CSS v4.

## Commands

```bash
npm run dev      # Dev server
npm run build    # Type check + production build
npm run preview  # Preview production
```

Package manager: Bun. No tests/lint configured.

## Architecture

**Stack:** Vue 3.5 (Composition API, `<script setup>`), TypeScript 5.9 strict, Pinia, Vue Router 4 (lazy-loaded), Axios, Tailwind v4

**Path alias:** `@/` → `src/`

### UI Libraries (prefer over custom implementations)

- **SweetAlert2** - toasts, alerts, confirmations (see `UsuariosView.vue` for Toast pattern)
- **Moment.js** - dates with Spanish locale (`es-mx`)
- **Heroicons** - icons (`@heroicons/vue/24/outline` or `/solid`)

### Key Patterns

- **Multi-Branch:** `X-Sucursal-Id` header auto-injected via Axios interceptor (`src/api/client.ts`), managed by `useSucursalStore`
- **State:** Pinia with Composition API style (`src/stores/`)
- **Layout:** `MainLayout.vue` (fixed sidebar + sticky header) with nested `<RouterView>`
- **Routes:** `src/router/index.ts` with `meta.title`, lazy-loaded views

### Directory Structure

```
src/
├── api/        # Axios client
├── router/     # Routes
├── stores/     # Pinia stores
├── layouts/    # MainLayout
├── views/      # Page components (*View.vue)
├── components/ # Reusable components
└── assets/     # Static files
```

### Naming Conventions

- Spanish domain names (Sucursal, Envíos)
- Stores: `use*Store`
- Views: `*View.vue`
- Layouts: `*Layout.vue`

### Environment

- `VITE_APP_NAME` - App name
- `VITE_API_URL` - API base URL

## Auth & Permissions

**Auth store:** `src/stores/auth.ts` (mock: `admin/admin`)

**User levels:** `admin | gerente | vendedor | operador | visor`

**Permission system:** Per-sucursal, per-menu granular permissions

```typescript
type PermisoAccion = 'view' | 'edit'
type MenuRuta = 'panel' | 'importaciones' | 'productos' | 'inventario' | 'clientes' | 'rutas' | 'promociones' | 'reportes' | 'estadisticas' | 'auditoria' | 'usuarios' | 'configuracion'
```

- No menu entry = no access
- `['view']` = read-only
- `['view', 'edit']` = full access

**Helper methods:** `tieneAccesoSucursal()`, `puedeVer()`, `puedeEditar()`, `menuDeshabilitado()`

## API Reference

**Base:** `http://localhost:3000` | **Docs:** `/docs`

### Endpoints

**Auth:** `POST /api/auth/login`, `/refresh`, `/logout` | `GET /api/auth/me`

**Sucursales:** `GET|POST /api/sucursales/` | `GET|PATCH|DELETE /api/sucursales/{id}`

**Usuarios:** `GET|POST /api/usuarios/` | `GET|PATCH /api/usuarios/{id}`

**Health:** `GET /health`

### User Schema (create/update)

```typescript
{
  nombreCompleto: string
  nombreUsuario: string
  email: string
  contrasena: string          // min 6, create only
  nivel: NivelUsuario
  imagen?: string | null
  telefono?: string | null
  accesoApp?: boolean
  activo?: boolean            // update only
  permisosPorSucursal: { sucursalId: string, menus: Record<MenuRuta, PermisoAccion[]> }[]
}
```
