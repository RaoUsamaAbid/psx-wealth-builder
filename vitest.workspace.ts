import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'engines',
      root: './packages/engines',
      environment: 'node',
      include: ['test/**/*.test.ts'],
    },
  },
  {
    test: {
      name: 'market-data',
      root: './packages/market-data',
      environment: 'node',
      include: ['test/**/*.test.ts'],
    },
  },
  {
    test: {
      name: 'api',
      root: './apps/api',
      environment: 'node',
      include: ['test/**/*.test.ts'],
      testTimeout: 60000,
      hookTimeout: 120000,
    },
  },
  {
    esbuild: { jsx: 'automatic', jsxImportSource: 'react' },
    test: {
      name: 'web',
      root: './apps/web',
      environment: 'jsdom',
      globals: true,
      include: ['test/**/*.test.{ts,tsx}'],
      setupFiles: ['./test/setup.ts'],
    },
  },
]);
