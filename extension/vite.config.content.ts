import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    emptyOutDir: false, // Don't clear dist, as this runs after the main build
    outDir: 'dist',
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content.ts'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        format: 'iife', // Self-executing bundle, no external imports
        name: 'PRPleaseContent', // Global variable name (not really used but required for IIFE)
        extend: true,
      },
    },
  },
});
