# Repository guidance

- This repository is a pnpm workspace. Install dependencies from the repository root with `pnpm install`.
- Keep each app independently buildable, testable, and documented in its own `apps/<name>` directory.
- Run an app with `pnpm --filter <app-name> dev`; use the root scripts for the current default app.
- Keep app-specific code in its app directory. Add shared packages only when multiple apps need the same code.
- Treat all `VITE_*` values as public browser configuration. Never put service-role keys or other secrets in frontend code.
- Keep Supabase schema changes in migrations and require Row Level Security for tables exposed to client applications.
