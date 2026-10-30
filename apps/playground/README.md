# Playground

A React and Vite app with separately addressable pages: the homepage (`/`), Quran reader (`/quran/`), and Supabase demo (`/supabase/`). The reader uses sample content and in-memory bookmarks; audio and reading progress are not connected.

## Development

Install dependencies from the repository root with `pnpm install`.

```sh
pnpm --filter playground dev
pnpm --filter playground test
pnpm --filter playground typecheck
pnpm --filter playground build
pnpm --filter playground test:e2e
```

For the Supabase demo, copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Both are public browser configuration; never use a secret or service-role key. Vitest uses `.env.test` and MSW responses.

## Tests

UI test descriptions use the visible interaction and outcome: **shows** for displayed results, **opens** for navigation, and **marks** for pressed bookmark states.

Vitest with React Testing Library in jsdom covers component routing, greetings, request errors, chapter search and navigation, and bookmark state. It does not prove browser layout or deployed routing.

Playwright tests are organized by the route that owns the journey:

- `tests/homepage.e2e.ts`: opening the Quran reader from the homepage on mobile.
- `tests/quran.e2e.ts`: desktop reader heading positions and horizontal overflow.
- `tests/supabase.e2e.ts`: opening the demo directly and returning to the homepage.

The browser suite starts a local Vite development server at `/`. It does not verify built GitHub Pages routing, the `/personal-tools/` deployment prefix, or the hosted Supabase backend.

## Deployment

GitHub Actions builds and deploys this app to GitHub Pages. The default base is `/personal-tools/`; use `VITE_BASE_PATH=/` for hosting at a domain root. Each route has an HTML entry point configured in `vite.config.ts`.

See the [root README](../../README.md) for live links, repository variables, and GitHub Pages setup.
