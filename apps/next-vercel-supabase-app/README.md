# Next.js + Vercel + Supabase

The connection page uses the [shared light style guide](../../docs/style-guide/README.md), including its design tokens and Button component. Shared styles enter through `src/app/globals.css`, which registers production sources and excludes tests. Page presentation uses Tailwind; global CSS retains the document baseline. The page and layout are Server Components; `ConnectionCheck` handles browser interactions, and the server route holds the Supabase configuration. After changing shared UI, run `pnpm --filter next-vercel-supabase-app check` and `test:e2e`. Dark mode is planned for later.

**Live app:** https://next-vercel-supabase-app.vercel.app

This App Router app runs independently of Playground. Select Check connection on the home page to call the public Supabase `hello` Edge Function through the Next.js server at `GET /api/supabase`. The page shows progress, displays a safe error if the request fails, and lets you retry.

## Run locally

Use the repository's Node version (`.nvmrc`) and pnpm 9.5.0. Install from the repository root:

```sh
pnpm install --frozen-lockfile
cp apps/next-vercel-supabase-app/.env.example apps/next-vercel-supabase-app/.env.local
pnpm --filter next-vercel-supabase-app dev
```

Fill in `.env.local`, then open http://localhost:3000 to check the connection. You can view and build the page without backend settings, but the API returns a safe 503 response until those settings are valid.

Use `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from the existing Supabase project. These are server-only variables in this app. Do not use `NEXT_PUBLIC_`, secret keys, or service-role keys. Local environment files are ignored by Git. No new database tables or schema changes are needed.

The server calls `/functions/v1/hello` and checks the response JSON with Zod. It returns a safe 502 response if the upstream service returns an error, cannot be reached, takes more than eight seconds, or sends invalid JSON data. Requests are not cached. Calling from the server also avoids changing the function's browser CORS settings.

## Quality checks

Run from the repository root:

```sh
pnpm --filter next-vercel-supabase-app check
pnpm --filter next-vercel-supabase-app test:e2e
```

`check` runs Biome lint, Prettier, Next route type generation, strict TypeScript and Vitest integration tests with coverage. Lint warnings fail the check. The lint rules include the shared recommended rules, Next.js/React checks, explicit-any and `@ts-ignore` errors, and floating-promise checks. Coverage must reach 100% of statements, branches, functions and lines in the API route and shared response schema.

The UI tests render the real home page in jsdom, with MSW supplying HTTP responses. They cover greetings, loading, errors and retries, Enter activation, and malformed responses. Browser behaviour and layout are checked separately by Playwright.

The app's `biome.json` extends the repository settings. Biome replaces ESLint, but its type inference and rules differ from typescript-eslint. The floating-promise rule is enabled as an error and is still an experimental nursery rule. Strict TypeScript runs as a separate check.

`test:e2e` builds Next.js for production and starts it on port 3100. It also starts a local fake Supabase server on port 54329, so no Supabase credentials or external backend are needed. Desktop and mobile Chromium tests open and refresh the page, request the greeting through the real Next route, and check for horizontal overflow. Detailed UI states stay in Vitest. These browser tests check the local app and fake backend; use the hosted check below to test the real service.

The test files are:

- `src/components/connection-check.test.tsx` for page interactions.
- `src/app/api/supabase/route.test.ts` for the HTTP handler.
- `tests/connection/greeting.e2e.ts` for the browser journey used locally and on deployments.
- `tests/connection/fixtures/` for the local upstream server.

Local browser tests save screenshots and traces when they fail. The journey itself takes no unconditional screenshots. Hosted checks disable recordings to avoid saving authentication data.

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

Playwright starts and stops the local app and fake backend. It refuses to reuse a server already running on those test ports. Avoid running a production build and development server against the same `.next` directory simultaneously.

## Deploy to Vercel

Use the existing project `prj_JMebKnoQdyM6tIXkOSCbVNsMOSyc` in team `team_MZ10t1hz7YShThLCkaopqpe6` (`usyyys-projects`). Keep its Root Directory set to `apps/next-vercel-supabase-app`, use Node 22.x, and allow access to workspace files outside that folder. Configure production `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` on the server. This app does not need another Vercel project.

Complete the one-time setup in [the shared release runbook](../../.github/workflows/VERCEL_RELEASES.md) before enabling automatic releases. It explains the GitHub environment and credentials, adding another app, and recovering from a failed release. This app's settings are in `scripts/releases/projects.json`. GitHub Actions handles deployment, so Vercel Git deployments stay disabled in both project settings and `vercel.json`.

After setup, an approved relevant push to `main` does the following:

1. Runs quality checks and the desktop/mobile tests against the local fake backend.
2. Builds with production settings and uploads to a new Vercel URL while the public website stays on the previous version.
3. Tests that new URL against the real Supabase service.
4. Points the public domain at the tested build, checks its deployment ID, and tests the public website too.

The release job can run only after quality checks pass. Vercel's build command is therefore `pnpm build`, without another quality run. CLI builds and uploads start at the workspace root so shared packages are available. Production output and downloaded environment files stay on the temporary runner; GitHub does not cache or save them as artifacts.

For an already accessible deployment:

```sh
PLAYWRIGHT_BASE_URL=https://next-vercel-supabase-app.vercel.app pnpm --filter next-vercel-supabase-app test:smoke
```

This command opens the deployed app in desktop and mobile browsers and checks the greeting through the real Next route and Supabase service. It starts no local server or fake backend.

Protected deployment URLs need extra setup. Before providing the automation-bypass secret, the release runner checks Vercel's metadata for the expected team, project, production environment, commit SHA and URL. It then supplies `VERCEL_VERIFIED_ORIGIN` and exchanges the secret for a secure cookie limited to that host. That setup request cannot follow redirects, and later requests use the cookie. Hosted checks save no traces, screenshots, videos or browser login state. Local browser tests keep their usual failure recordings.

## CI and merge protection

`.github/workflows/next-app.yml` chooses which projects need checks and calls `vercel-app.yml` for each one. PR jobs have no production credentials. Main pushes compare against this project's last successful GitHub environment deployment, so changes from failed or superseded releases still get picked up after a later unrelated push. If CI cannot work out what changed, it runs all the project's checks and release steps. A manual run on `main` also runs them all and finds the deployment URL automatically.

Require **Next.js quality and E2E** and **Biome lint** in branch protection. The first check keeps a result visible even when a PR does not affect this app: it passes an intentional skip and fails a selection or app-job error. The workflow also requires app quality to pass before release. Coverage keeps `NODE_ENV=test` so the tests use React's test build.

GitHub keeps local test reports and coverage for seven days. It keeps release identifiers and step/status records for thirty days. Raw production build output, environment files, authentication state and hosted browser reports are excluded.

To confirm a release, check that its workflow completed successfully and its release artifact records `status: verified` for the intended commit. That result includes live checks before and after promotion and confirmation of the public domain's deployment ID. Release evidence and acceptance reviews are recorded on [#32](https://github.com/usmaanalii/personal-tools/issues/32).

## Shared API contract

The app uses the shared hello schema through `greetingSchema`, which re-exports it from [`@scratch-pages/api-contracts`](../../packages/api-contracts/README.md), also used by Playground and the Edge Function. The server route and environment variables stay the same. Install dependencies from the repository root; Vercel must include workspace files outside the app Root Directory when building this app. The current hosted hello response already satisfies this schema.

## Shared default guide

The app imports the owned Button and consumes the shared `--theme-*` mappings directly. Its page composition and technical monospace labels remain app-local. The temporary colour aliases are removed in #28 without changing rendered values or behaviour. The [adoption inventory](../../docs/style-guide/adoption.md) records state coverage and verification limits.

Shared UI/token edits continue to select this app's quality and production-browser checks. Pages owns the catalogue build; the Next release no longer repeats it. The app remains independently buildable with its existing commands and server-only configuration. The alternate catalogue theme does not add a production theme switcher.
