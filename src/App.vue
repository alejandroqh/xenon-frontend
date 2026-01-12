<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'

const route = useRoute()

const mostrarLayout = computed(() => route.meta.requiresAuth !== false)
</script>

<template>
  <MainLayout v-if="mostrarLayout" />
  <RouterView v-else />
</template>
