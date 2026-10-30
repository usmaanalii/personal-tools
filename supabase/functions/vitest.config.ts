import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['hello/handler.ts', 'quran/handler.ts', 'quran/provider.ts'],
      reporter: ['text', 'lcov'],
    },
  },
})
