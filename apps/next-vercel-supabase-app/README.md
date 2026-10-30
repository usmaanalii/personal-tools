# Next.js + Vercel + Supabase

**Live app:** https://next-vercel-supabase-app.vercel.app

An independent App Router app alongside Playground. The home page checks the existing public Supabase `hello` Edge Function through `GET /api/supabase` on the Next.js server. It supports loading feedback, safe failure messages, and retry.

## Run locally

Use the repository's Node version (`.nvmrc`) and pnpm 9.5.0. Install from the repository root:

```sh
pnpm install --frozen-lockfile
cp apps/next-vercel-supabase-app/.env.example apps/next-vercel-supabase-app/.env.local
pnpm --filter next-vercel-supabase-app dev
```

Fill in `.env.local` before checking the connection. Open http://localhost:3000. The page and build work without backend configuration; the API returns a safe 503 when configuration is absent or invalid.

Use `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from the existing Supabase project. These are server-only variables in this app. Do not use `NEXT_PUBLIC_`, secret keys, or service-role keys. Local environment files are ignored by Git. No new database tables or schema changes are needed.

The server calls `/functions/v1/hello`, validates its JSON with Zod, and returns a safe 502 on upstream HTTP, network, timeout, or response-validation failures. Requests are uncached and have an eight-second upstream timeout. This server-side request also avoids changing the existing function's browser CORS configuration.

## Quality checks

Run from the repository root:

```sh
pnpm --filter next-vercel-supabase-app check
pnpm --filter next-vercel-supabase-app test:e2e
```

`check` runs zero-warning Biome lint (shared recommended rules plus Next.js/React rules, explicit-any and `@ts-ignore` errors, and floating-promise checks), Prettier, Next route type generation, strict TypeScript, and Vitest API/UI integration tests with coverage. Coverage gates require 100% statements, branches, functions, and lines for the API route and shared response schema. A separate jsdom UI project renders the real home page and uses MSW only at the HTTP boundary. It covers greetings, failure/retry, Enter activation, loading feedback, and malformed responses; it does not prove native browser behavior, layout, or the served Next application. API coverage thresholds remain scoped to the route and shared schema.

The app’s `biome.json` extends the repository configuration. Biome replaces ESLint; its type inference and rules are not identical to typescript-eslint. The floating-promise rule is explicitly enabled at error level but remains an experimental nursery rule. Strict TypeScript remains a separate gate.

`test:e2e` builds production Next.js and starts it on port 3100, plus a local HTTP Supabase fixture on port 54329. A short Playwright smoke journey checks desktop and mobile Chromium: direct loading, refresh, the greeting through the real Next route, and horizontal overflow. Detailed UI states belong in Vitest rather than being repeated here. No Supabase credentials or external backend are required. These tests prove the app-to-fixture path, not the hosted service.

Test ownership stays inside this app: `src/components/connection-check.test.tsx` covers page interactions, `src/app/api/supabase/route.test.ts` covers the HTTP handler, and `tests/connection/greeting.e2e.ts` owns the shared local/deployment smoke journey. Its upstream fixture lives in `tests/connection/fixtures/`. Failure screenshots and traces come from Playwright configuration; the journey does not take unconditional screenshots.

Useful individual commands:

```sh
pnpm --filter next-vercel-supabase-app lint
pnpm --filter next-vercel-supabase-app format:check
pnpm --filter next-vercel-supabase-app typecheck
pnpm --filter next-vercel-supabase-app test
pnpm --filter next-vercel-supabase-app build
pnpm --filter next-vercel-supabase-app start
```

For the first browser run on a fresh machine, install Chromium:

```sh
pnpm --filter next-vercel-supabase-app exec playwright install chromium
```

Playwright owns and shuts down its fixture and app processes; it refuses to reuse a server already on those test ports. Avoid running a production build and development server against the same `.next` directory simultaneously.

## Deploy to Vercel

1. Import the existing `personal-tools` Git repository into a **new Vercel project**.
2. Set **Root Directory** to `apps/next-vercel-supabase-app` and use the Next.js framework preset.
3. Use the repository's Node major version (22.x) and set `ENABLE_EXPERIMENTAL_COREPACK=1` to honor the root `packageManager` pin (`pnpm@9.5.0`). The app's `vercel.json` installs with the frozen workspace lockfile and runs `pnpm check && pnpm build`.
4. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in the Vercel project's Preview and Production environments.
5. Deploy. Playground keeps its independent GitHub Pages deployment.

Alternatively, after `pnpm dlx vercel login`, run these commands from the **repository root**:

```sh
pnpm dlx vercel link --project next-vercel-supabase-app --scope usyyys-projects
pnpm dlx vercel deploy --prod --scope usyyys-projects
```

The Vercel project Root Directory must remain `apps/next-vercel-supabase-app`. CLI uploads start at the workspace root so the shared lockfile and workspace configuration are available. `.vercelignore` excludes local environment files, agent tooling, and generated artifacts. Root development/build scripts intentionally still default to Playground.

Connect the Vercel project to the GitHub repository once this app is committed and pushed to enable automatic Git deployments and pull-request previews. This CLI deployment does not commit or push local changes.

After deployment, verify the actual hosted connection:

```sh
PLAYWRIGHT_BASE_URL=https://your-app.vercel.app pnpm --filter next-vercel-supabase-app test:smoke
```

This desktop/mobile smoke test reuses the same greeting journey and clicks the real UI and requires `Hello from Supabase!` without mocks or a local fixture. It does not provision a deployment. The target must be reachable by the test runner; an authentication-protected Vercel preview needs the appropriate access setup. For checking a locally started production app against the real backend, loopback HTTP URLs are also accepted.

## CI and merge protection

`.github/workflows/next-app.yml` runs `check` and production-build E2E tests on relevant pull requests, main-branch pushes, and manual dispatch. Unaffected pull requests skip the expensive job; change-detection errors fail the quality check. Test reports, traces on failure, screenshots, and coverage are retained for seven days.

Configure **Next.js quality and E2E** as a required branch-protection check in GitHub to enforce it before merging. Committing the workflow alone does not change branch protection. Vercel's own build runs the quality gate; browser E2E runs in GitHub Actions.

A manual workflow run can additionally accept a deployed URL to run the live smoke test. A local successful build or fixture test must not be reported as a successful Vercel deployment.
