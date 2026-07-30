import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'test/'],
    },
    // Configuración para importar archivos con extensión .js
    deps: {
      interopDefault: true
    }
  },
  // Si usas alias en tu proyecto, configúralos aquí
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})