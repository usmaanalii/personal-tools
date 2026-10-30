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

`check` runs zero-warning Next.js/React/accessibility lint, type-aware floating-promise checks, Prettier, Next route type generation, strict TypeScript, and API unit tests with coverage. Coverage gates require 100% statements, branches, functions, and lines for the API route and shared response schema. UI behavior is covered by browser tests rather than the unit coverage metric.

`test:e2e` builds production Next.js and starts it on port 3100, plus a local HTTP Supabase fixture on port 54329. Playwright checks desktop and mobile Chromium: the greeting, failure and retry, keyboard activation and loading feedback, malformed responses, direct loading, refresh, and horizontal overflow. No Supabase credentials or external backend are required. These tests prove the app-to-fixture path, not the hosted service.

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

This smoke test clicks the real UI and requires `Hello from Supabase!` without mocks or a local fixture. It does not provision a deployment. The target must be reachable by the test runner; an authentication-protected Vercel preview needs the appropriate access setup. For checking a locally started production app against the real backend, loopback HTTP URLs are also accepted.

## CI and merge protection

`.github/workflows/next-app.yml` runs `check` and production-build E2E tests on relevant pull requests, main-branch pushes, and manual dispatch. Unaffected pull requests skip the expensive job; change-detection errors fail the quality check. Test reports, traces on failure, screenshots, and coverage are retained for seven days.

Configure **Next.js quality and E2E** as a required branch-protection check in GitHub to enforce it before merging. Committing the workflow alone does not change branch protection. Vercel's own build runs the quality gate; browser E2E runs in GitHub Actions.

A manual workflow run can additionally accept a deployed URL to run the live smoke test. A local successful build or fixture test must not be reported as a successful Vercel deployment.
