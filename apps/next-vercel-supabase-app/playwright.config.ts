import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: true,
  retries: process.env['CI'] ? 2 : 0,
  workers: 2,
  timeout: 15_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium' },
    },
  ],
  webServer: [
    {
      command: 'node tests/connection/fixtures/supabase.mjs',
      url: 'http://127.0.0.1:54329/health',
      reuseExistingServer: false,
    },
    {
      command: 'pnpm build && pnpm start --hostname 127.0.0.1 --port 3100',
      url: 'http://127.0.0.1:3100',
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        SUPABASE_URL: 'http://127.0.0.1:54329',
        SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_e2e_fixture',
        NEXT_TELEMETRY_DISABLED: '1',
      },
    },
  ],
})
