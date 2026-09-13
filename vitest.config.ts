import { defineConfig } from 'vitest/config';

export function createVitestConfig(integration = false) {
  return defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: integration
      ? ['src/**/*.integration.test.ts']
      : ['src/**/*.test.ts'],
    exclude: integration ? [] : ['src/**/*.integration.test.ts'],
    env: integration
      ? {
          KITAB_INTEGRATION_TESTS: 'true',
        }
      : {},
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
}

export default createVitestConfig();
