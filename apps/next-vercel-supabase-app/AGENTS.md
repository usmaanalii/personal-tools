# Next.js app guidance

- This app uses the App Router. Keep pages and layouts as Server Components; use Client Components only for interactive leaves.
- Run `pnpm --filter next-vercel-supabase-app check` and `pnpm --filter next-vercel-supabase-app test:e2e` for changes to this app.
- Put detailed page behavior in Vitest UI integration tests with the real component tree and MSW at the HTTP boundary. Keep Playwright to short assembled-app journeys and browser-specific checks; every duplicated assertion needs a distinct integration risk.
- `test:e2e` builds and starts production Next.js and a local HTTP Supabase fixture. It does not prove the hosted Supabase service is working.
- `PLAYWRIGHT_BASE_URL=https://... pnpm --filter next-vercel-supabase-app test:smoke` drives the deployed UI without mocks. It must receive the greeting from the live backend.
- Keep Supabase credentials in server-only environment variables. Never add secret or service-role keys, or prefix server credentials with `NEXT_PUBLIC_`.
- Validate external JSON at the HTTP boundary with the shared app greeting schema. Return safe errors to the browser.
- Preserve strict TypeScript flags, zero-warning lint, coverage gates, and both desktop/mobile E2E projects.
- Follow the root TDD and commit/push approval rules.
