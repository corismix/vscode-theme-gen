import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        // Exclude build/config files
        'dist/',
        'coverage/',
        '*.config.*',
        // Exclude main entry point from coverage (hard to test without full integration)
        'src/main.ts',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
      // Include source files for coverage
      include: [
        'src/lib/**/*.ts',
        'src/components/**/*.{ts,tsx}',
      ],
      // Report coverage for all source files, even if not tested
      all: true,
    },
    testTimeout: 15000,
    hookTimeout: 15000,
    // Reporters for better test output
    reporters: ['verbose', 'json'],
    // Fail tests on console.error/warn in development
    onConsoleLog: (_log, type) => {
      if (type === 'stderr' && process.env.NODE_ENV === 'test') {
        return false; // Don't output to console during tests
      }
      return true;
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/lib': resolve(__dirname, './src/lib'),
      '@/config': resolve(__dirname, './src/config'),
      '@/types': resolve(__dirname, './src/types'),
    },
  },
  esbuild: {
    target: 'node18',
  },
});