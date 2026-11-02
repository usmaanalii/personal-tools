# GitHub Actions workflows

## Keep required checks visible on every PR

A required check must report a result even when a PR does not affect its app. A workflow-level `paths` filter can skip the whole workflow and leave that check pending, blocking the merge.

Let PR workflows start, then decide which jobs need to run. The Playground Playwright workflow uses `dorny/paths-filter` in its `changes` job and runs `playwright` only for relevant changes. A skipped job counts as success for required checks. Its main-branch pushes still use workflow-level path filters because those runs are not PR merge checks; a manual run starts the Playwright job.

The Vercel workflow uses a project list and an always-running summary check for the same reason.

## Vercel workspace apps

`next-app.yml` reads `scripts/releases/projects.json`, chooses the affected apps, and calls `vercel-app.yml` for each one. PRs compare the base and proposed changes and receive no production credentials. Main pushes compare against each project's last successful GitHub environment deployment. This picks up changes left behind by a failed or superseded release, even after an unrelated push. If CI cannot find a starting commit or work out what changed, it runs the project's checks and release steps. A manual run on `main` runs all configured projects and needs no deployment URL.

Each app first runs dependency installation with the frozen lockfile, its quality and coverage checks, the Storybook catalogue build, and browser tests against a production build with a fake local backend. The release job can access the project's protected environment only after those checks pass, and only on main.

The release job uses Vercel CLI 65.8.0 to build with production settings and upload to a new URL without changing the public domain. It tests that deployment against the real backend, points the public domain at the same build, checks the domain's deployment ID, then tests the public website. Action versions are pinned to commit SHAs. Each project's releases run one at a time, and a newer run cannot automatically cancel a release in progress.

Complete the setup in [the Vercel release runbook](VERCEL_RELEASES.md) before enabling releases. The Next app needs a GitHub environment named `vercel-next-production` and credentials configured there; source changes alone do not set them up. The runbook also covers adding another app and recovering from failures.

Require **Next.js quality and E2E** and **Biome lint** in branch protection. The first check passes an intentional skip for unaffected apps and fails selection or app-job errors. Coverage keeps `NODE_ENV=test`. Production build output, environment files and browser login state are never cached or uploaded as artifacts.

## Repository lint

`lint.yml` runs `pnpm exec biome ci . --error-on-warnings` on every PR, main-branch push and manual run. It installs with the frozen lockfile and checks all apps and shared configuration without path filters. Errors and warnings fail the check.

Generated output follows `.gitignore`. Generated Next.js declarations and `pnpm-lock.yaml` are also explicitly excluded. Biome formatting and import organisation are disabled. The Next.js app adds its own lint rules and keeps Prettier in `next-app.yml`. Require **Biome lint** in branch protection to prevent merging a failing lint check.

## Playground Quran reader

The Pages and Playground E2E workflows use Node 24. Both run the separate Edge Function API-contract suite. This does not change the root Node pin or the separate Next.js job.

Playground app changes and any Edge Function workspace changes trigger Playground E2E. The workflow runs frontend Vitest tests and `pnpm test:functions`, builds the static production files, then uses desktop and mobile browsers to check routing, refresh and layout under `/personal-tools/`. There is no SPA fallback. The browser checks use fixture content; detailed page and handler tests use Vitest with MSW supplying HTTP responses.

To check an existing deployment against real services, run the workflow manually with `deployment_url`. Include the path prefix and trailing slash. That input runs `test:smoke`; the E2E workflow does not deploy anything.

The Supabase `quran` function is deployed separately from Pages. Its credentials belong in Supabase function secrets; Pages uses only the existing public Supabase variables. See `supabase/functions/quran/README.md` for live verification and the limit on request budgeting within each running function instance.

## Shared style guide

Changes in `packages/design-tokens/**` or `packages/ui/**` cause Pages, Playground E2E and Next checks to run, including the PR change-detection steps. The Next quality job also builds the shared UI Storybook catalogue. The workflow builds the Storybook catalogue without publishing a website.

The connection browser journeys run axe accessibility scans alongside their short route and action checks.

## Shared API contracts

Changes to `packages/api-contracts/**` cause Pages, Playground E2E and Next verification to run, including PR change detection. Function changes also trigger Pages.

Playground E2E installs Deno 2.9.6 and runs `pnpm --filter edge-functions check:deno` on both actual function entry points with frozen function lockfiles. It also runs the Node/MSW handler tests. Deno checks imports and types; it cannot confirm a hosted deployment or provider credentials. Deploy and verify the Quran v2 backend before publishing the frontend that uses it.
