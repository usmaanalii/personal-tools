# Releasing an app to Vercel

After setup, an approved push to `main` can test and publish an app without a separate deployment session. GitHub Actions checks which apps need a release, tests them, and builds each one with its production settings.

The new build gets its own Vercel URL first. We call this a **staged deployment**: it runs on Vercel, but visitors to the public website still see the old version. CI tests the staged URL against the real backend. If that passes, CI **promotes** the build by pointing the public domain at it, then checks the public website too. The public domain's link to a deployment is called its **production alias**.

The workflow follows this order:

1. `next-app.yml` chooses the apps affected by the changes.
2. `vercel-app.yml` runs each app's quality checks and local browser tests.
3. The release job builds with production settings and uploads the result without changing the public domain.
4. Browser tests check the staged deployment against the real backend.
5. CI promotes that same build, checks which deployment the public domain points to, and runs the browser tests there.

Each app has an entry in `scripts/releases/projects.json`. It lists the Vercel team and project, app folder, Node version, files that affect the app, test commands, public URL and GitHub environment. Commands are stored as argument lists and run without a shell. The workflow controls permissions and job order; the release script checks Vercel's responses and waits for the deployment to be ready.

## Set up the Next app once

The owner needs to complete these steps before the first automatic release:

1. Protect `main` so changes are reviewed before they reach production. Require **Biome lint** and **Next.js quality and E2E**. The latter keeps its existing check name and passes when a PR intentionally skips unaffected apps. It fails if change detection or an app job fails. Each project's quality and release jobs also have their own results.
2. Create a GitHub environment named `vercel-next-production` and restrict its deployment branches to `main`. Store the deployment secrets in this environment, not at repository or organisation level. Routine releases use the approval already given to the main-branch change. You can add an environment reviewer, but that will require manual approval for every release.
3. Set `VERCEL_TOKEN` directly in that environment. Use a dedicated automation account with the smallest Vercel role available, set an expiry, and choose who will rotate it. Use a separate token for each project. Some Vercel tokens grant access to a whole team; putting one in a project-specific GitHub environment does not reduce its Vercel permissions. Use a project-limited account or access group if your plan supports it. Never commit a token or send it to the agent.
4. Set up [Protection Bypass for Automation](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation) in the Vercel project. Save the matching secret as `VERCEL_AUTOMATION_BYPASS_SECRET` in the GitHub environment. Keep Vercel Authentication enabled. We have not confirmed whether the account's plan includes this feature. If it does not, choose another authenticated way to test the deployment before enabling releases; do not disable protection or skip the test.
5. Check the IDs, app folder and Node version in `projects.json`. Keep access to workspace files outside the app root enabled, and keep the app's production Supabase variables configured on the server. Vercel Git deployments must stay disabled (`gitProviderOptions.createDeployments=disabled`, or no Git link). `vercel.json` also disables Git deployments. The runner rejects an active Git deployment setup, and a separate production deploy hook must not be enabled.
6. Approve, commit and push the reviewed implementation, then watch the main-branch run. Missing credentials stop the release before a build or upload. Record the successful run, commit and deployment on #32. A passing local test run does not establish that CI can deploy.

Once this is set up, routine releases need no interactive login, team-access approval or URL input. PR jobs never receive production credentials. Do not change the trigger to `pull_request_target` or run PR code with those credentials.

## Which changes cause a release?

For a main-branch push, CI compares the current commit with each app's last successful GitHub environment deployment. This catches changes that still need a release after a failed or superseded run, even if the latest push only changes documentation.

The script looks through up to thirty recent deployments and their statuses. If it cannot find a successful starting point, cannot read the API, or cannot compare the Git commits, it runs that app's checks and release steps. Uncertainty must not silently skip an app. If the selection job itself fails, the app jobs cannot proceed.

PRs compare their base commit with the checked-out merge commit. A manual run on `main` checks and releases all configured apps and finds the deployment URLs itself.

An app's own files select that app. Shared-package changes select the apps that use those packages. Changes to the root lockfile, manifest, workspace, Biome, Node, npm or Vercel-ignore settings select all apps, as do changes under `.github/` or to the release scripts. Update the affected-file lists when an app starts using another shared package.

Once a successful release exists to compare against, unrelated docs or Playground changes can skip the Next app. The required check still reports a result when no apps need testing.

## Why there are two builds

The local browser tests start a production Next.js build with a small fake Supabase server. This checks that the app works as a complete running application without needing production credentials.

The release build uses the real production settings. CI must test that output on Vercel before publishing it, because the local build used different backend and environment settings. Those builds cannot share their output.

The release job builds production output once with `vercel build --prod`. `deploy --prebuilt` uploads it, and promotion changes the public domain without rebuilding it. The app's `vercel.json` runs only `pnpm build`, since the workflow has already required the quality checks to pass. Frozen dependency installation remains in both the workspace and CLI steps where the tools require it.

The release job depends on the successful quality job for the same workflow commit through `needs: quality`. PR artifacts or success from an unrelated run cannot authorise a release. Retrying a failed release job can reuse that run's successful quality checks while the commit is still current on main. A new manual run checks current main again.

## What gets cached or saved?

| Item | How it is handled |
| --- | --- |
| pnpm dependencies | setup-node caches the store and uses the lockfile to invalidate it. |
| Local browser-test build cache | `.next/cache` is keyed by project, OS, exact Node version, lockfile/config hashes and commit. Older cache entries are reused only within that same test/toolchain prefix. |
| Production build and environment files | Kept on the temporary release runner. They are not cached or uploaded as GitHub artifacts. |
| Local test reports and coverage | Kept for seven days. These tests have no production credentials. |
| Release record | `release-evidence/release.json` and the job summary list the project, commit SHA, previous deployment, staged deployment and verified URL, status, and failed step when relevant. The artifact lasts thirty days. |
| Hosted browser recordings | Traces, screenshots, videos and saved browser login state are disabled because they could contain authentication data. |

Only the quality job writes the local build cache. GitHub's cache rules keep PR cache entries from becoming main-branch cache entries. The production CLI's raw output is captured but not published; only the release's identifiers and status are uploaded. `.vercel`, `.env`, `.next`, test-results and authenticated browser reports stay out of release artifacts. Production files disappear when the temporary runner is discarded; do not move this job onto a persistent runner without revisiting that handling.

All actions use fixed commit SHAs. The Vercel CLI is pinned to reviewed version 65.8.0, which was already in use for this project. Review tool updates with the lockfile and Node settings, and rerun the release simulations. Deployment tooling must not use a floating `latest` version.

## How credentials reach a protected deployment

The workflow's `GITHUB_TOKEN` has `contents: read`. The selection job also has `deployments: read` so it can find each project's last successful release. Checkout does not leave Git credentials behind, and the reusable workflow does not use `secrets: inherit`. This setup does not deploy PR previews. Each project gets separate GitHub environment deployment statuses.

The caller explicitly passes the two secret names, and the reusable workflow declares both as required. GitHub needs this forwarding even when the values exist only in the release environment. The release job selects the environment and receives its values; the quality job has no deployment environment. Removing a required secret mapping makes workflow validation fail. The runner also checks that the values are present before doing any release work. See [GitHub's reusable workflow secret rules](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows#using-inputs-and-secrets-in-a-reusable-workflow).

The Vercel token is available only in the reviewed main-branch release step. The runner removes it before starting child build or browser commands. API requests send credentials only to the fixed GitHub or Vercel API address and never follow redirects. The workflow does not accept a deployment URL from an event payload.

Before a browser receives the automation-bypass secret, the runner checks the deployment's team, project, production environment, commit SHA and URL against Vercel's metadata. The browser setup sends the secret once to that verified address, with redirects disabled, to obtain a secure cookie limited to the deployment host. Later browser requests use the cookie rather than carrying the secret in every request.

## Add another app

Add an entry to `scripts/releases/projects.json` with a unique project key and GitHub environment. Supply its real Vercel team/project IDs, existing public domain, app folder, exact Node version, shared dependencies and command argument lists. Give it its own main-only GitHub environment, deployment token, automation-bypass secret and Vercel production variables.

The existing workflow then runs the same release steps for the new entry. There is no need to copy deployment jobs. Tests use two independent project configurations to check this reuse; they do not create a second production project.

Start with an existing service that already has a production alias, so the runner can record its previous deployment for recovery. Creating a brand-new service is a separate approved task. Its quality commands must include the app's required checks. Its `verify` command must test the deployed app against the real backend, read `PLAYWRIGHT_BASE_URL`, respect the verified address for authentication, and disable artifacts that could contain secrets. Each app gets its configured Node version; the release script checks that Vercel uses the same major version.

## When runs overlap

A newer PR run may cancel older PR checks. Production release jobs use `vercel-production-<key>` with `cancel-in-progress: false`, so a newer run cannot automatically interrupt a promotion. Different projects have separate locks, environments and statuses.

GitHub can replace waiting runs and does not guarantee their order. Before staging, and again just before promotion, the runner checks whether its commit is still current on main. Before promotion it also checks that the public site's deployment has not changed and rechecks the staged deployment's identity and readiness. An old run fails instead of replacing a newer release. The next run compares against the last successful release, so pending changes are still included.

## Time limits

| Operation | Limit |
| --- | --- |
| Wait for deployment readiness | Up to sixty checks, ten seconds apart |
| Wait for the public domain to point to the deployment | Up to thirty checks |
| Each metadata API request | Thirty seconds |
| Each CLI command | Fifteen minutes |
| Promotion command | Five minutes |
| Whole release job | Forty minutes |

A timeout fails the release. An authentication or identity mismatch is not retried. If the platform API is unavailable, the release stops.

## Recover from a failure

If quality checks, the build, readiness checks, deployment identity checks or staged browser tests fail, the public domain stays on its previous deployment. Fix the cause and retry the failed jobs if the commit is still current on main. Otherwise, run the workflow on current main. A failed run may have uploaded a staged deployment; use its recorded ID to inspect it. Do not force-promote it or bypass the checks.

If a check fails after promotion, the public site may already be serving the new build. The job records the previous target and reports failure. It does not automatically roll back, because that could interfere with a newer release.

Disable the workflow to pause new releases, inspect the actual public-domain target and the failed step, and get the owner's approval for recovery. If a promotion times out or someone cancels it manually, check Vercel before retrying: the domain may already have changed.

For an approved rollback, find `previous` in the failed release record. Use Vercel's API or CLI to check that it belongs to this team and project and was a previously successful production release. Then run the pinned CLI from the workspace root:

```sh
# Set VERCEL_TOKEN securely in the operator's environment; never print it.
vercel rollback <verified-previous-deployment-id> --scope team_MZ10t1hz7YShThLCkaopqpe6 --yes
PLAYWRIGHT_BASE_URL=https://next-vercel-supabase-app.vercel.app pnpm --filter next-vercel-supabase-app test:smoke
```

Also check the deployment ID returned by `/v4/aliases/next-vercel-supabase-app.vercel.app?teamId=...`. A passing greeting test alone does not identify which deployment is serving the domain. Record the restored ID, commit SHA and checks on the issue. Only restore a previously verified service.

[Vercel rollback](https://vercel.com/docs/instant-rollback) disables automatic domain assignment. This workflow explicitly promotes future staged production builds. Re-enable it after recovery and after the next current-main release has been authorised. Do not deliberately break the public app to test recovery.

## Why CI owns deployment

We evaluated [native Deployment Checks](https://vercel.com/docs/deployment-checks). They can hold the public domain on the old version until GitHub checks pass and can trigger hosted tests through `vercel.deployment.ready`. Adopting them would require enabling Git integration, configuring required checks and dispatch-status reporting, and arranging authenticated tests for each production deployment.

We kept CI as the deployment owner and used Vercel's standard [prebuilt staging](https://vercel.com/docs/cli/deploy#skip-domain) and [production promotion](https://vercel.com/docs/cli/promote). Git deployments were already disabled. This keeps a single deployment owner and avoids a second build or separate dispatch-status coordination. CI builds from the workspace root so it can access shared packages. The cost is managing a protected deployment token and a small script that checks platform metadata. The account response did not establish the billing plan or feature entitlements, so this decision does not assume a plan restriction.

The runner accepts only a tested production deployment. Promoting a preview would rebuild it with production variables, which would change the build being published.

For reference, the inspection on 2026-11-02 found Node 22.x, app root `apps/next-vercel-supabase-app`, Git deployments and repository-dispatch events disabled, and deployment authentication enabled except on production domains. Production pointed to `dpl_ADPEzjvqfeL93PYYWvSRkejys9Y1` at commit `591fd9f55e943e9bf66a86160d111bf36eca4283`. GitHub had only a `github-pages` environment and no repository secrets. These are historical settings and must be rechecked before relying on them.

## What has to be verified before closing #32

Run `node --experimental-strip-types --test scripts/releases/*.test.mjs`, `pnpm lint`, the Next `check` and `test:e2e` scripts, and actionlint for both workflows. The controlled simulations cover app selection and reuse, wrong deployment identities and URLs, old commits, competing deployment owners, staging/readiness/browser failures, production changes and alias failures. They check the release rules without changing production. Local browser tests check the assembled app; hosted browser tests check its connection to the real backend.

The implementation stays local until commit/push approval under AGENTS.md. Before closing #32, we still need a successful automated release tied to an exact committed SHA, a real Vercel protection-cookie exchange, a check of the public domain's deployment ID, and an acceptance review on the issue. The workflow requires quality success before release, but we have not yet observed a deliberately failed quality run in GitHub. Local tests cannot confirm the account's feature entitlements, credentials or promotion permissions.

Keep plans and acceptance records on #32 with exact commit and run links. Keep ongoing setup and recovery instructions here. The root Quick access links continue to point to existing public sites; do not add an undeployed URL there.
