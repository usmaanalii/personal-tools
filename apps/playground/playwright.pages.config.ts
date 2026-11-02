import { defineConfig, devices } from '@playwright/test'

// Verify the already-built, complete Pages artifact; never rebuild between test and upload.
export default defineConfig({
  testDir: './tests/pages',
  testMatch: '**/*.e2e.ts',
  forbidOnly: true,
  workers: 1,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173/personal-tools/',
    trace: 'retain-on-failure',
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: 'node tests/infrastructure/serve-dist.mjs',
    url: 'http://127.0.0.1:5173/personal-tools/',
    reuseExistingServer: false,
  },
})
