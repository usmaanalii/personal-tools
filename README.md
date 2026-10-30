# Personal Tools

A small monorepo for personal web app experiments.

## Quick access

- [Playground index](https://usmaanalii.github.io/personal-tools/)
- [Quran reader](https://usmaanalii.github.io/personal-tools/quran/)
- [Supabase API demo](https://usmaanalii.github.io/personal-tools/supabase/)

## Playground

The playground is a small collection of tools and experiments. Start at the [index page](https://usmaanalii.github.io/personal-tools/) to choose one.

### Quran reader

**Page:** [Open the Quran reader](https://usmaanalii.github.io/personal-tools/quran/)

A phone-first reading prototype for exploring chapters and verses.

- **Find a chapter:** Search the sample chapter list by name or English meaning.
- **Read verses:** Open a chapter to see Arabic text with an English translation.
- **Save a verse:** Bookmark an ayah and find it again in My bookmarks.
- **Explore the layout:** The chapter list and reader sit side by side on desktop and stack for mobile.

The chapter and verse content is sample text. Quran.com data, audio playback, and reading progress are not connected yet.

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

### Supabase API demo

**Page:** [Open the Supabase API demo](https://usmaanalii.github.io/personal-tools/supabase/)

Try a GET request to the public `hello` Edge Function and inspect the response. The Quran reader is a separate page and does not call this function.

For local work on the Supabase example, copy `apps/playground/.env.example` to `apps/playground/.env.local` and fill in the project URL and publishable key. GitHub Actions reads the same public values from repository variables named `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

Values prefixed with `VITE_` are included in the browser build. Use only the Supabase publishable key there; it is intentionally public and must be paired with appropriate Row Level Security policies. Never put a Supabase secret or service-role key in a `VITE_` variable or frontend code.

The function lives at `supabase/functions/hello/index.ts`. It returns a public demo response and does not read or write private data. Add database changes as Supabase migrations and enable Row Level Security for tables accessed by client apps.

## GitHub Pages

GitHub Actions builds the Playground app and deploys its static output to GitHub Pages. The Vite base path defaults to `/personal-tools/`; set `VITE_BASE_PATH=/` when deploying the app at a domain root.

In repository settings, set **Pages > Build and deployment > Source** to **GitHub Actions**.

## Next.js app

**Live app:** [Next.js connection lab](https://next-vercel-supabase-app.vercel.app)

[`apps/next-vercel-supabase-app`](apps/next-vercel-supabase-app/README.md) is an independent Next.js App Router app configured for Vercel and the existing public Supabase demo function.

```sh
pnpm dev:next
pnpm check:next
pnpm --filter next-vercel-supabase-app test:e2e
```

Root commands such as `pnpm dev`, `pnpm test`, and `pnpm build` still target Playground. Use `pnpm test:all`, `pnpm typecheck:all`, `pnpm build:all`, or `pnpm test:e2e:all` to run the corresponding scripts for every app.

See the app README for server-only environment variables, production-build browser tests, Vercel deployment, and the live backend smoke check.
