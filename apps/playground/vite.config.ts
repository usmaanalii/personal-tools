import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/personal-tools/',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(appRoot, 'index.html'),
        quran: resolve(appRoot, 'quran/index.html'),
        supabase: resolve(appRoot, 'supabase/index.html'),
      },
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          setupFiles: ['./src/test-setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'infrastructure',
          environment: 'node',
          include: ['tests/infrastructure/**/*.test.ts'],
        },
      },
    ],
    clearMocks: true,
  },
})
