# Playground UI guidance

- For changes to the Quran reader's visual design, interaction patterns, responsive layout, or accessibility, consult the `ui-ux-pro-max` skill and use its search workflow. Restore the project skill with `npx skills experimental_install` if it is not installed locally at `.agents/skills/ui-ux-pro-max/SKILL.md`.
- Preserve a calm, content-first reading experience. Evaluate generated recommendations against Quran reading context rather than applying unrelated product palettes mechanically.

## GitHub Pages routes

- Build each directly addressable route as a separate Vite HTML entry point and list it in `vite.config.ts` under `build.rollupOptions.input`. GitHub Pages serves static files without SPA route fallback, so a client-side route alone is not enough for direct links or refreshes.
- Verify each route by opening its URL directly and refreshing it in Playwright.

## Test allocation

- Keep detailed page behavior in Vitest integration tests using real application components and MSW at HTTP boundaries.
- Keep Playwright smoke checks short and focused on production static files, the deployment prefix, direct loading/refresh, navigation and responsive layout. Content fixtures in these checks do not prove backend connectivity.
- `test:smoke` targets an actual deployment with no asset replacement or backend interception. Do not maintain a second detailed behavioral suite under a live/mocked split.

- Colocate Vitest page tests with their owning prototype under `src/prototypes/<domain>/`; shared routing tests belong in `src/app/`. Group browser journeys and domain fixtures under `tests/prototypes/<domain>/`. Keep domain-neutral harness code and HTTP checks under `tests/infrastructure/`.
- Test the static-server HTTP contract in Vitest’s Node project, not once per browser viewport.

- Edge Function API-contract tests belong to `supabase/functions/tests/<function>/`, not frontend prototype directories. Run them with `pnpm test:functions`.
- Use `.e2e.ts` consistently for browser tests; deployment-only cases use `*-deployment.e2e.ts` and are selected by configuration.
