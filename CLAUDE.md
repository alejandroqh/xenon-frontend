# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Xenon Frontend is a Vue 3 + TypeScript SPA for a commercial operations platform with multi-branch (sucursal) support. It uses Vite as the build tool and Tailwind CSS v4 for styling.

## Commands

```bash
npm run dev      # Start development server
npm run build    # TypeScript check (vue-tsc) + production build
npm run preview  # Preview production build locally
```

Note: Uses Bun as package manager (bun.lock present). No test or lint commands configured yet.

## Architecture

### Tech Stack
- Vue 3.5 with Composition API (`<script setup>` syntax)
- TypeScript 5.9 with strict mode
- Pinia for state management
- Vue Router 4 with lazy-loaded routes
- Axios for HTTP requests
- Tailwind CSS v4 (via Vite plugin)

### Path Alias
`@/` maps to `src/` (configured in vite.config.ts and tsconfig)

### Key Architectural Patterns

**Multi-Branch Context:** All API requests include `X-Sucursal-Id` header automatically via Axios interceptor (`src/api/client.ts`). The current branch is managed by `useSucursalStore`.

**State Management:** Pinia stores use Composition API style with `defineStore()`. See `src/stores/sucursal.ts` for the pattern.

**API Client:** Centralized Axios instance in `src/api/client.ts` with request interceptor for branch header injection. Import and use this client for all API calls.

**Layout Structure:** `MainLayout.vue` provides fixed sidebar navigation + sticky header. Views render inside nested `<RouterView>`.

**Route Configuration:** Routes defined in `src/router/index.ts` with `meta.title` for page titles. All view components are lazy-loaded.

### Directory Structure
```
src/
├── api/          # HTTP client configuration
├── router/       # Vue Router setup
├── stores/       # Pinia stores
├── layouts/      # Layout components (MainLayout)
├── views/        # Page-level components
├── components/   # Reusable UI components
└── assets/       # Static assets
```

### Environment Variables
- `VITE_APP_NAME` - Application name (displayed in header)
- `VITE_API_URL` - Backend API base URL

### Naming Conventions
- Domain entities use Spanish naming (Sucursal, Envíos)
- Store hooks prefixed with `use` (e.g., `useSucursalStore`)
- Views suffixed with `View` (e.g., `DashboardView.vue`)
- Layouts suffixed with `Layout` (e.g., `MainLayout.vue`)
