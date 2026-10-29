# Personal Tools

A small monorepo for personal web apps, starting with **Playground**, a React and TypeScript app that calls a public Supabase Edge Function.

**Live site:** [Open Playground](https://usmaanalii.github.io/personal-tools/)

## Local setup

Install dependencies with pnpm:

```sh
corepack pnpm install
```

Run Playground locally:

```sh
pnpm dev
```

Common checks:

```sh
pnpm test
pnpm typecheck
pnpm build
pnpm test:e2e
```

Run a workspace app directly with `pnpm --filter playground <script>`.

## Supabase

For local development, copy `apps/playground/.env.example` to `apps/playground/.env.local` and fill in the project URL and publishable key. GitHub Actions reads the same public values from repository variables named `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

Values prefixed with `VITE_` are included in the browser build. Use only the Supabase publishable key there; it is intentionally public and must be paired with appropriate Row Level Security policies. Never put a Supabase secret or service-role key in a `VITE_` variable or frontend code.

The function lives at `supabase/functions/hello/index.ts`. The page calls the configured project's public `hello` endpoint. Project URL and publishable key are public browser values; never put a Supabase secret or service-role key in frontend code.

The `hello` function returns a public demo response and does not read or write private data. Add database changes as Supabase migrations and enable Row Level Security for tables accessed by client apps.

## GitHub Pages

GitHub Actions builds the Playground app and deploys its static output to GitHub Pages. The Vite base path defaults to `/personal-tools/`; set `VITE_BASE_PATH=/` when deploying the app at a domain root.

In repository settings, set **Pages > Build and deployment > Source** to **GitHub Actions**.
