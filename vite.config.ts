import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic'
    })
  ],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/components': resolve(__dirname, 'src/components'),
      '@/utils': resolve(__dirname, 'src/utils'),
      '@/lib': resolve(__dirname, 'src/lib'),
      '@/context': resolve(__dirname, 'src/context'),
      '@/types': resolve(__dirname, 'src/utils/types')
    }
  },

  build: {
    target: 'es2020',
    outDir: 'dist',
    lib: {
      entry: 'src/main.ts',
      formats: ['es'],
      fileName: 'index'
    },
    rollupOptions: {
      external: [
        'react',
        'ink',
        'meow',
        'chalk',
        'figures',
        'ink-big-text',
        'ink-gradient', 
        'ink-select-input',
        'ink-spinner',
        'ink-text-input',
        'fs',
        'fs/promises',
        'path',
        'os',
        'util',
        'process'
      ],
      output: {
        entryFileNames: 'index.js',
        format: 'es',
        preserveModules: false
      }
    },
    minify: false,
    sourcemap: true,
    emptyOutDir: true
  },

  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  },

  esbuild: {
    target: 'es2020',
    format: 'esm'
  }
});