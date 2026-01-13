# Xenon Frontend

A Vue 3 + TypeScript SPA for a commercial operations platform with multi-branch (sucursal) support.

## Tech Stack

- Vue 3.5 with Composition API (`<script setup>` syntax)
- TypeScript 5.9 with strict mode
- Pinia for state management
- Vue Router 4 with lazy-loaded routes
- Axios for HTTP requests
- Tailwind CSS v4 (via Vite plugin)
- Bun as package manager

## Getting Started

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview
```

## Project Structure

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

## Environment Variables

Create a `.env` file with:

```
VITE_APP_NAME=Xenon
VITE_API_URL=http://localhost:3000/api
```

## Key Features

- **Multi-Branch Support:** All API requests include `X-Sucursal-Id` header automatically
- **Role-Based Permissions:** Granular permissions per branch per menu item
- **Lazy-Loaded Routes:** Optimized bundle splitting for better performance

## Naming Conventions

- Domain entities use Spanish naming (Sucursal, Envios)
- Store hooks prefixed with `use` (e.g., `useSucursalStore`)
- Views suffixed with `View` (e.g., `DashboardView.vue`)
- Layouts suffixed with `Layout` (e.g., `MainLayout.vue`)
