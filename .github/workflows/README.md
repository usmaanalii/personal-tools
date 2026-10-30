# GitHub Actions workflows

## Skipping work for unaffected changes

Avoid using trigger-level `paths` filters on pull request workflows when their
checks may be required for merging. GitHub skips the entire workflow when no
path matches, which can leave a required check pending and block the pull
request.

Instead, let the workflow start and use job-level change detection to skip
expensive jobs. A skipped job reports success for required-check purposes. The
Playwright workflow follows this pattern: its pull request `changes` job uses
`dorny/paths-filter` and the `playwright` job runs only when relevant files
changed. Direct pushes to `main` retain trigger-level path filters because
those runs are not serving as pull request checks. Manual dispatch runs the
Playwright job.

## Next.js app

`next-app.yml` owns the `Next.js quality and E2E` check for `apps/next-vercel-supabase-app`. It uses pull-request job-level change detection, frozen-lockfile installation, lint/format/type checks, Vitest API/UI integration tests with API coverage gates, and desktop/mobile Chromium smoke journeys against a production Next build with a local Supabase HTTP fixture. Change-detection failures fail the check. App, shared Biome configuration, root manifest, lockfile, workspace, Node-version, and workflow changes trigger verification.

The workflow can be dispatched manually with an optional HTTPS `deployment_url` to run a browser smoke test against the actual hosted Supabase connection. The URL is passed via an environment variable rather than interpolated into a shell command. That smoke test does not mock the backend or deploy the app.

Add `Next.js quality and E2E` to GitHub branch protection when enabling this workflow. Vercel runs the app's quality and build commands separately; E2E enforcement before merge comes from the required GitHub check.

## Repository lint

`lint.yml` runs `pnpm exec biome ci . --error-on-warnings` using the shared Biome configuration on every pull request, push to `main`, and manual dispatch. It installs dependencies with the frozen lockfile and has no path filters, so changes to any app or shared configuration are checked. Errors and warnings fail the check. Generated output follows `.gitignore`; generated Next.js declarations and `pnpm-lock.yaml` are explicitly excluded. Formatting and import organization are disabled. The Next.js app uses the same Biome linter with app-specific rules and retains Prettier in `next-app.yml`. Add **Biome lint** to branch protection to require it before merging.

## Playground Quran reader

The Pages and Playground E2E workflows use Node 24 and both run the independent Edge Function API-contract suite. The root Node pin and separate Next.js job are unchanged. Vitest covers detailed page and handler behavior with HTTP-level MSW responses. Playground app and all Edge Function workspace changes trigger the E2E workflow. It runs frontend Vitest tests and the independent backend API-contract suite (`pnpm test:functions`), then builds production static files and checks desktop/mobile routing, refresh and layout beneath `/personal-tools/` without an SPA fallback. Those narrow browser checks use fixture content and do not prove hosted backend access. An optional manual `deployment_url` input runs `test:smoke` against actual deployed assets and real services; include the path prefix and trailing slash. No deployment occurs in that workflow. The Supabase `quran` function is deployed separately from Pages; credentials belong in Supabase function secrets. Pages uses only the existing public Supabase variables. See `supabase/functions/quran/README.md` for live verification and the per-instance request-budget limitation.
