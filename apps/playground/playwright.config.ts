import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/prototypes',
  testMatch: '**/*.e2e.ts',
  testIgnore: '**/*-deployment.e2e.ts',
  fullyParallel: true,
  forbidOnly: true,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:5173/personal-tools/',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium' } },
  ],
  webServer: [{
    command: 'pnpm lane:data && pnpm mufradat:data && deno run --frozen --config ../../supabase/functions/quran/deno.json --allow-env=QF_CLIENT_ID,QF_CLIENT_SECRET,QF_ENV,QF_ALLOWED_ORIGINS,NODE_ENV --allow-read=../../supabase/functions/quran --allow-net=0.0.0.0:8000 ../../supabase/functions/quran/index.ts',
    env: { QF_CLIENT_ID: '', QF_CLIENT_SECRET: '', QF_ENV: 'prelive', QF_ALLOWED_ORIGINS: 'http://127.0.0.1:5173' },
    url: 'http://127.0.0.1:8000/',
    reuseExistingServer: false,
  }, {
    command: 'pnpm build:preview && node tests/infrastructure/serve-dist.mjs',
    env: {
      VITE_BASE_PATH: '/personal-tools/',
      VITE_SUPABASE_URL: 'http://127.0.0.1:8000',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
    },
    url: 'http://127.0.0.1:5173/personal-tools/',
    reuseExistingServer: false,
  }],
})
