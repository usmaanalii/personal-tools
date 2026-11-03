# Playground

The Supabase connection page adopts the workspace's shared light tokens and owned Button. Its direct public Edge Function call, JSON response, local loading/error states and retry action remain app-owned. The shared guide is in [`docs/style-guide`](../../docs/style-guide/README.md). The Vite integration scans shared UI sources; `pnpm --filter playground build` verifies its production CSS. No private credentials belong in `VITE_*` variables.

A React and Vite app with separately addressable pages: the homepage (`/`), Quran reader (`/quran/`), and Supabase demo (`/supabase/`). The reader loads chapters and paginated Arabic verses with an English translation (M.A.S. Abdel Haleem in pre-live; The Clear Quran in production) through the Supabase `quran` Edge Function. Bookmarks last for the current session; audio and reading progress are not connected. The Pages workflow publishes frontend changes from `main`.

Chapter browsing and surrounding reader chrome use shared tokens, owned Button/Input/ViewSwitcher controls and Tailwind utilities. Reader owns chapter requests, search, selection, bookmarks and verse loading; app-local views receive data, actions and composition slots. Search and bookmarks remain local to the mounted reader and do not modify URL state. See the [chapter browsing state inventory](src/prototypes/quran/chapter-browsing-journeys.md) for responsive examples, intentional visual/accessibility changes and verification limits. Quran text, verse presentation and word-dialog CSS remain separate from the migrated chrome.

`pnpm --filter @scratch-pages/ui storybook` opens the shared catalogue, including Playground's twelve chapter examples (six states at mobile and desktop widths). Playground declares the same pinned Storybook renderer as a development dependency so its colocated stories are included in normal TypeScript checks; it adds no production dependency. The combined Pages workflow will publish these additions after an approved push.

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

The browser calls `/functions/v1/quran/v2/chapters` and `/functions/v1/quran/v2/verses?chapter=1&page=1` on `VITE_SUPABASE_URL`. Each verse page contains at most 20 verses. Previous/Next verses navigate pages; opening a saved verse restores its page. Chapter search uses the chapter list returned by the API.

Create a Backend/server app in the [Quran Foundation Developer Console](https://api-docs.quran.foundation/request-access/). Save `QF_CLIENT_ID`, `QF_CLIENT_SECRET`, and `QF_ENV=prelive` directly in Supabase Edge Function secrets. Never expose these through Vite or GitHub Pages configuration. Testing access includes only Al-Fatihah and Al-Baqarah; complete Quran content requires production approval and production credentials. This is Quran Foundation’s access policy, not a Supabase or reader limitation. See [Production access](../../supabase/functions/quran/README.md#production-access) for the approval and environment-switch steps.

The function is deployed and verified against real pre-live content. Desktop and mobile browser checks also passed against the live function. The Pages workflow publishes the frontend integration from `main`. Deploy future function updates from the complete repository root with the Supabase CLI, separately from the static website, so shared-contract imports are bundled. This frontend requires `/quran/v2/`; that backend was deployed as version 5 and verified against real pre-live content on 2026-10-30 before frontend publication. For local function development, copy `supabase/functions/.env.example` to the gitignored `.env`, populate the credentials, and configure the frontend public Supabase values for your local project. Explicitly configure `QF_ALLOWED_ORIGINS` for local browser origins; the hosted default only permits `https://usmaanalii.github.io`.

See the [Quran function README](../../supabase/functions/quran/README.md) for the API contract, security controls, limitations, and deployment verification. Without configuration or during upstream failures, the reader shows a retryable error; it never substitutes sample verses. The translation is rendered as plain text with attribution; formatting and footnote markers are removed. Quranic text opts out of browser translation. Audio controls are disabled until playback is implemented, and the chapter shortcut does not claim saved reading progress.

## Word meanings (#18)

When the backend supplies validated word data, tap an Arabic word (or activate it
with Enter/Space) to highlight it and open its English gloss, available
transliteration and verse reference. A native `<dialog>` appears as a mobile
bottom sheet or a centered desktop dialog. Previous/next stays within the verse;
Close/Escape restores focus to the last selected word. Changing the chapter or
verse page closes the details. Verse-end markers remain non-interactive.

Words come with the verse page, so opening details needs no extra request.
Occurrence identities use chapter, verse and provider position. Missing or
invalid word records retain whole-verse Arabic; missing annotations have explicit
unavailable labels. Word text is rendered inertly. The English word data is
credited to Quran Foundation separately from the selected whole-verse translator;
no authorship by that translator is implied. Grammar and dictionaries are outside
this feature. See the [journey/state inventory](src/prototypes/quran/word-meaning-journeys.md).

No new environment variables or dependencies are required. Backend version 6 was
deployed on 2026-11-01 with the existing server-side credentials. Live checks
verified all 7 Al-Fatihah verses and Al-Baqarah pages 1, 2 and 15, including word
positions, English glosses, transliteration, translation attribution, legacy
responses and CORS. Pages publishes the frontend through the approved push;
the deployment smoke checks real word details after publication. An older
backend remains usable but supplies whole-verse reading only. Full-Quran
coverage still needs production access. See the [backend rollout checklist](../../supabase/functions/quran/README.md#word-data-addition-18).

### Word-details ownership (#23)

The Quran modules remain app-local. `use-word-selection.ts` owns selected
position and verse-bounded navigation; `word-content.tsx` renders the existing
word fields independently from fixture data; `word-dialog.tsx` owns native modal
lifecycle and naming. `verse-words.tsx` composes them and owns occurrence button
refs, highlighting and focus return. Reader's existing chapter/page/retry keys
discard stale selection along with the old verses.

Close/Escape returns focus to the latest connected occurrence. When context
invalidation removes the details, focus stays on a surviving focused control;
if focus was lost, Reader focuses its current chapter heading, which is outside
the normal Tab order. The fallback runs after old DOM targets have been removed.
The dialog markup, CSS and dependencies retain their existing appearance.

See the [#23 verification record](src/prototypes/quran/word-selection-verification.md)
for checks and evidence limits. The existing Pages workflow publishes the
frontend after an approved push; this refactor adds no deployment steps.

## Linting

Run `pnpm lint` from the repository root for shared Biome recommended lint rules across all apps. `pnpm lint:fix` applies safe fixes without formatting. Existing CSS cascade and user-triggered search autofocus exceptions have inline explanations.

## Tests

UI test descriptions use the visible interaction and outcome: **shows** for displayed results, **opens** for navigation, and **marks** for pressed bookmark states.

Vitest with React Testing Library in jsdom covers component routing, greetings, request errors, chapter search and navigation, bookmark state, pagination, loading recovery, and safe translation text. Backend API-contract tests belong to the independent `edge-functions` workspace under `supabase/functions/tests/`; run `pnpm test:functions` from the repository root. They exercise real handlers against mocked upstream token/content endpoints, including token reuse, expiry, bounded retry, input restrictions, request budgets, and timeouts. These checks do not verify hosted credentials. The UI suite does not prove browser layout or deployed routing.

Keep detailed page behavior in Vitest with real application components and HTTP-level MSW responses. Add Playwright coverage only for a distinct served-app or browser risk.

`test:e2e` builds the production app and serves only its static files at `http://127.0.0.1:5173/personal-tools/`, without an SPA fallback. Playwright owns the server and refuses to reuse that port. Desktop and mobile Chromium smoke checks cover:

- `tests/prototypes/quran/reader.e2e.ts`: homepage entry, reader refresh, visible content and overflow.
- `tests/prototypes/quran/word-dialog.e2e.ts`: opens the reader directly, refreshes it, selects a word, shows its meaning and closes the details to resume reading.
- `tests/prototypes/supabase/demo.e2e.ts`: direct loading, refresh and navigation back to the homepage.

There are three high-level smoke journeys per viewport. E2E does not repeat detailed word navigation, unavailable-label, focus, typography, rotation or modal lifecycle cases. Detailed word behavior belongs in Vitest; `quran-words.test.tsx` covers the real page composition with HTTP fixtures, and `word-content.test.tsx` proves independent rendering with visible content. The shared typed word factory avoids copied records; fixtures reject unsupported chapter/page requests, and pagination uses Al-Baqarah rather than inventing a second page for seven-verse Al-Fatihah.

The static-server fallback/404 contract runs once in Vitest's Node infrastructure project, not in a browser matrix. Word-data mapping and failure recovery are covered independently in backend-owned tests. Vitest/jsdom models modal visibility and the application's dismissal/focus callbacks; it does not prove native focus containment, browser Escape dispatch or rendered geometry. The smoke suite does not replace a browser component or scoped manual check for those details. See the [verification record](src/prototypes/quran/word-selection-verification.md) for current evidence and limitations.

Tests follow the same ownership as source code:

```text
src/app/app.test.tsx                         # shared homepage/routing
src/prototypes/quran/*.test.tsx              # reader page integration
src/prototypes/supabase/*.test.tsx           # demo page integration
tests/prototypes/quran/                      # reader E2E, deployment smoke and content fixture
tests/prototypes/supabase/                   # demo E2E and deployment smoke
tests/infrastructure/                       # static server, launcher and HTTP integration check
../../supabase/functions/tests/             # backend-owned API contracts
```

Quran content is supplied at the HTTP boundary solely to make these static-site/layout checks independent of hosted services. They prove production assets, the deployment prefix, navigation and layout; they do not prove the Edge Function or Quran Foundation connectivity. The build uses explicit test-only public configuration; it must not be published as the deployed build.

## Deployment smoke

Run against an existing deployed website, including its base prefix and trailing slash. The Quran smoke also opens a real word's English meaning and transliteration after refresh:

```sh
PLAYWRIGHT_BASE_URL=https://usmaanalii.github.io/personal-tools/ pnpm --filter playground test:smoke
```

The `*-deployment.e2e.ts` files alongside each prototype’s E2E tests open the actual deployed Quran reader, confirm content and translation load after refresh, and call the greeting function through the Supabase demo. They run on desktop and mobile Chromium without replacing HTML, assets or backend responses. They do not build or deploy anything, and do not repeat detailed pagination/bookmark behavior. Loopback HTTP URLs are accepted for testing an already-served production build configured against real services. The Playwright workflow accepts the same root URL through its optional manual `deployment_url` input.

## Deployment

The Pages workflow uses Node 24 for Playground tests and builds. GitHub Actions builds and deploys this app together with the shared UI Storybook in one GitHub Pages artifact. From the repository root, use `pnpm build:pages` followed by `pnpm test:pages` to verify that complete artifact; `pnpm build` remains the standalone Playground build. See [Storybook publishing and recovery](../../packages/ui/README.md#publishing-and-verification). The default base is `/personal-tools/`; use `VITE_BASE_PATH=/` for hosting at a domain root. Each route has an HTML entry point configured in `vite.config.ts`.

See the [root README](../../README.md) for live links, repository variables, and GitHub Pages setup.


## API contracts

Public schemas and inferred types live in [`@scratch-pages/api-contracts`](../../packages/api-contracts/README.md). The hello and Quran fetch adapters validate successful responses using those schemas. Quran consumes application-owned v2 data and backend attribution; it retains only display-specific conversion of untrusted translation HTML into inert text. No additional environment variables or generation step are needed.

The v2 backend was deployed and verified on 2026-10-30; frontend publication follows the approved push through Pages. Existing legacy backend routes remain available for older browser builds. Backend rollout must precede this frontend release; see the [migration instructions](../../supabase/functions/quran/README.md#owned-v2-contract-and-migration).
