import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'test/'],
    },
    // Permite interoperar con módulos JavaScript durante la migración gradual.
    deps: {
      interopDefault: true,
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
