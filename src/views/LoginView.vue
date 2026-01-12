<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const nombreUsuario = ref('')
const contrasena = ref('')

async function onSubmit() {
  const exito = await authStore.iniciarSesion(nombreUsuario.value, contrasena.value)

  if (exito) {
    router.push('/')
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="w-full max-w-md">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-2xl font-semibold text-gray-900">
          Xenon
        </h1>
        <p class="mt-2 text-sm text-gray-500">
          Iniciar sesion en tu cuenta
        </p>
      </div>

      <!-- Login Card -->
      <div class="bg-white rounded-lg border border-gray-200 p-8">
        <form @submit.prevent="onSubmit" class="space-y-6">
          <!-- Username field -->
          <div>
            <label
              for="nombreUsuario"
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              Usuario
            </label>
            <input
              id="nombreUsuario"
              v-model="nombreUsuario"
              type="text"
              required
              autocomplete="username"
              class="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Ingresa tu usuario"
            />
          </div>

          <!-- Password field -->
          <div>
            <label
              for="contrasena"
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              Contrasena
            </label>
            <input
              id="contrasena"
              v-model="contrasena"
              type="password"
              required
              autocomplete="current-password"
              class="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Ingresa tu contrasena"
            />
          </div>

          <!-- Error message -->
          <div v-if="authStore.error" class="text-sm text-red-600">
            {{ authStore.error }}
          </div>

          <!-- Submit button -->
          <button
            type="submit"
            :disabled="authStore.cargando"
            class="w-full py-2.5 px-4 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span v-if="authStore.cargando">Iniciando sesion...</span>
            <span v-else>Iniciar sesion</span>
          </button>
        </form>
      </div>

      <!-- Footer -->
      <p class="mt-6 text-center text-xs text-gray-500">
        Plataforma de Operaciones Comerciales
      </p>
    </div>
  </div>
</template>
