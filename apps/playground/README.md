# Playground

A React and Vite app with separately addressable pages: the homepage (`/`), Quran reader (`/quran/`), and Supabase demo (`/supabase/`). The reader loads chapters and paginated Arabic verses with an English translation (M.A.S. Abdel Haleem in pre-live; The Clear Quran in production) through the Supabase `quran` Edge Function. Bookmarks last for the current session; audio and reading progress are not connected. The Pages workflow publishes frontend changes from `main`.

## Development

Use Node 24 for Playground checks (the current jsdom/Undici test dependencies fail to load on Node 22.22.3). The separate Next.js app retains its own Node requirements. Install dependencies from the repository root with `pnpm install`.

```sh
pnpm --filter playground dev
pnpm --filter playground test
pnpm --filter playground typecheck
pnpm --filter playground build
pnpm --filter playground test:e2e
```

For both the Quran reader and Supabase demo, copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Both are public browser configuration; never use a secret or service-role key. Vitest uses `.env.test` and MSW responses.

## Quran API setup

The browser calls `/functions/v1/quran/chapters` and `/functions/v1/quran/verses?chapter=1&page=1` on `VITE_SUPABASE_URL`. Each verse page contains at most 20 verses. Previous/Next verses navigate pages; opening a saved verse restores its page. Chapter search uses the chapter list returned by the API.

Create a Backend/server app in the [Quran Foundation Developer Console](https://api-docs.quran.foundation/request-access/). Save `QF_CLIENT_ID`, `QF_CLIENT_SECRET`, and `QF_ENV=prelive` directly in Supabase Edge Function secrets. Never expose these through Vite or GitHub Pages configuration. Testing access includes only Al-Fatihah and Al-Baqarah; complete Quran content requires production approval and production credentials. This is Quran Foundation’s access policy, not a Supabase or reader limitation. See [Production access](../../supabase/functions/quran/README.md#production-access) for the approval and environment-switch steps.

The function is deployed and verified against real pre-live content. Desktop and mobile browser checks also passed against the live function. The Pages workflow publishes the frontend integration from `main`. Deploy future function updates from `supabase/functions/quran/` separately from the static website. For local function development, copy `supabase/functions/.env.example` to the gitignored `.env`, populate the credentials, and configure the frontend public Supabase values for your local project. Explicitly configure `QF_ALLOWED_ORIGINS` for local browser origins; the hosted default only permits `https://usmaanalii.github.io`.

See the [Quran function README](../../supabase/functions/quran/README.md) for the API contract, security controls, limitations, and deployment verification. Without configuration or during upstream failures, the reader shows a retryable error; it never substitutes sample verses. The translation is rendered as plain text with attribution; formatting and footnote markers are removed. Quranic text opts out of browser translation. Audio controls are disabled until playback is implemented, and the chapter shortcut does not claim saved reading progress.

## Linting

Run `pnpm lint` from the repository root for shared Biome recommended lint rules across all apps. `pnpm lint:fix` applies safe fixes without formatting. Existing CSS cascade and user-triggered search autofocus exceptions have inline explanations.

## Tests

UI test descriptions use the visible interaction and outcome: **shows** for displayed results, **opens** for navigation, and **marks** for pressed bookmark states.

Vitest with React Testing Library in jsdom covers component routing, greetings, request errors, chapter search and navigation, bookmark state, pagination, loading recovery, and safe translation text. The proxy tests exercise the real HTTP handler against mocked upstream token/content endpoints, including token reuse, expiry, bounded retry, input restrictions, request budgets, and timeouts. These checks do not verify hosted credentials. The UI suite does not prove browser layout or deployed routing.

Keep detailed page behavior in Vitest with real application components and HTTP-level MSW responses. Add Playwright coverage only for a distinct served-app or browser risk.

`test:e2e` builds the production app and serves only its static files at `http://127.0.0.1:5173/personal-tools/`, without an SPA fallback. Playwright owns the server and refuses to reuse that port. Desktop and mobile Chromium smoke checks cover:

- `tests/homepage.e2e.ts` and `tests/supabase.e2e.ts`: direct loading, refresh and navigation between served pages.
- `tests/quran.e2e.ts`: direct loading/refresh of the reader, responsive overflow and desktop panel positioning.
- `tests/static-routes.e2e.ts`: a 404 for missing pages, so an SPA fallback cannot hide broken static routing.

Quran content is supplied at the HTTP boundary solely to make these static-site/layout checks independent of hosted services. They prove production assets, the deployment prefix, navigation and layout; they do not prove the Edge Function or Quran Foundation connectivity. The build uses explicit test-only public configuration; it must not be published as the deployed build.

## Deployment smoke

Run against an existing deployed website, including its base prefix and trailing slash:

```sh
PLAYWRIGHT_BASE_URL=https://usmaanalii.github.io/personal-tools/ pnpm --filter playground test:smoke
```

`tests/deployment.smoke.ts` opens the actual deployed Quran reader, confirms content and translation load after refresh, and calls the greeting function through the Supabase demo. It runs on desktop and mobile Chromium without replacing HTML, assets or backend responses. It does not build or deploy anything, and does not repeat detailed pagination/bookmark behavior. Loopback HTTP URLs are accepted for testing an already-served production build configured against real services. The Playwright workflow accepts the same root URL through its optional manual `deployment_url` input.

## Deployment

The Pages workflow uses Node 24 for Playground tests and builds. GitHub Actions builds and deploys this app to GitHub Pages. The default base is `/personal-tools/`; use `VITE_BASE_PATH=/` for hosting at a domain root. Each route has an HTML entry point configured in `vite.config.ts`.

See the [root README](../../README.md) for live links, repository variables, and GitHub Pages setup.
