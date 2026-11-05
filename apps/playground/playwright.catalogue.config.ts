import { defineConfig, devices } from '@playwright/test'

// Component presentation only: real catalogue components, no application routes or backend fixtures.
export default defineConfig({
  testDir: './tests/catalogue',
  testMatch: '**/*.e2e.ts',
  outputDir: 'catalogue-test-results',
  forbidOnly: true,
  workers: 1,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:5174/personal-tools/',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node tests/infrastructure/serve-catalogue.mjs',
    url: 'http://127.0.0.1:5174/personal-tools/iframe.html',
    reuseExistingServer: false,
  },
})
