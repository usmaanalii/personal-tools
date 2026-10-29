# Repository guidance

- This repository is a pnpm workspace. Install dependencies from the repository root with `pnpm install`.
- Keep each app independently buildable, testable, and documented in its own `apps/<name>` directory.
- Run an app with `pnpm --filter <app-name> dev`; use the root scripts for the current default app.
- Keep app-specific code in its app directory. Add shared packages only when multiple apps need the same code.
- Treat all `VITE_*` values as public browser configuration. Never put service-role keys or other secrets in frontend code.
- Keep Supabase schema changes in migrations and require Row Level Security for tables exposed to client applications.

## Dependabot workflow

- Check whether dependency PRs overlap before merging; consolidate distinct, compatible updates into one PR when that simplifies review.
- For pnpm dependency bumps, update `pnpm-lock.yaml` with the manifest. CI uses `pnpm install --frozen-lockfile`, so a manifest-only bump fails.
- When GitHub connector write actions return 403, use the authenticated `gh` CLI for PR creation and merge if available.

## Git workflow

- After each completed task or independently reviewable unit of work, show the user the changes and ask whether they want them committed and pushed.
- Leave changes local until the user approves. When approved, use the target branch they specify.
