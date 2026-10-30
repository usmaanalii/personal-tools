import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env['PLAYWRIGHT_BASE_URL']
const target = baseURL ? new URL(baseURL) : undefined
const local =
  target?.protocol === 'http:' &&
  ['localhost', '127.0.0.1'].includes(target.hostname)
if (!target || (target.protocol !== 'https:' && !local)) {
  throw new Error('Set PLAYWRIGHT_BASE_URL to the HTTPS deployment URL.')
}

export default defineConfig({
  testDir: './tests',
  testMatch: '**/greeting.e2e.ts',
  forbidOnly: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL,
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
})
