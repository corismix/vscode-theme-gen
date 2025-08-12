import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic'
    }),
    {
      name: 'add-shebang',
      generateBundle(_options, bundle) {
        const indexFile = bundle['index.js'];
        if (indexFile && indexFile.type === 'chunk') {
          indexFile.code = '#!/usr/bin/env node\n' + indexFile.code;
        }
      }
    }
  ],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/components': resolve(__dirname, 'src/components'),
      '@/lib': resolve(__dirname, 'src/lib'),
      '@/config': resolve(__dirname, 'src/config'),
      '@/types': resolve(__dirname, 'src/types')
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
        // Runtime dependencies that should remain external
        'react',
        'ink', 
        'meow',
        // Node.js built-ins
        'fs',
        'fs/promises',
        'path',
        'os',
        'util',
        'process',
        'child_process',
        'stream',
        'events'
      ],
      output: {
        entryFileNames: 'index.js',
        format: 'es',
        preserveModules: false,
        // Optimize bundle size
        generatedCode: {
          constBindings: true
        }
      }
    },
    // Enable production optimizations
    minify: 'esbuild',
    sourcemap: process.env.NODE_ENV === 'development',
    emptyOutDir: true,
    // Optimize for production
    reportCompressedSize: true
  },

  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  },

  esbuild: {
    target: 'es2020',
    format: 'esm',
    // Production optimizations
    treeShaking: true,
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true
  }
});