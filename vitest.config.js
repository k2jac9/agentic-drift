import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.js'],
      exclude: ['node_modules/', 'tests/', 'examples/'],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80
    },
    testMatch: ['tests/**/*.test.js'],
    watchExclude: ['node_modules/**', 'dist/**']
  }
});
