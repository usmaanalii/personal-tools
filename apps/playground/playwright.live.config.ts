import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/live',
  testMatch: '**/*.live.ts',
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: 'list',
  use: { trace: 'off' },
  projects: [
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
})
