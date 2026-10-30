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

`next-app.yml` owns the `Next.js quality and E2E` check for `apps/next-vercel-supabase-app`. It uses pull-request job-level change detection, frozen-lockfile installation, lint/format/type/API-coverage checks, and desktop/mobile Chromium tests against a production Next build with a local Supabase HTTP fixture. Change-detection failures fail the check. App, shared Biome configuration, root manifest, lockfile, workspace, Node-version, and workflow changes trigger verification.

The workflow can be dispatched manually with an optional HTTPS `deployment_url` to run a browser smoke test against the actual hosted Supabase connection. The URL is passed via an environment variable rather than interpolated into a shell command. That smoke test does not mock the backend or deploy the app.

Add `Next.js quality and E2E` to GitHub branch protection when enabling this workflow. Vercel runs the app's quality and build commands separately; E2E enforcement before merge comes from the required GitHub check.

## Repository lint

`lint.yml` runs `pnpm exec biome ci . --error-on-warnings` using the shared Biome configuration on every pull request, push to `main`, and manual dispatch. It installs dependencies with the frozen lockfile and has no path filters, so changes to any app or shared configuration are checked. Errors and warnings fail the check. Generated output follows `.gitignore`; generated Next.js declarations and `pnpm-lock.yaml` are explicitly excluded. Formatting and import organization are disabled. The Next.js app uses the same Biome linter with app-specific rules and retains Prettier in `next-app.yml`. Add **Biome lint** to branch protection to require it before merging.
