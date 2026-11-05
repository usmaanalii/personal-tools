# Shared UI and Storybook

`@scratch-pages/ui` owns reusable React controls, shared Tailwind utilities and the Storybook catalogue. Apps compose these controls and own their behaviour. Foundation and semantic variables come from `@scratch-pages/design-tokens`; see the [style guide](../../docs/style-guide/README.md).

Use Node 24 and pnpm 9.5.0 for the Pages build. Install from the repository root with `pnpm install --frozen-lockfile`.

```sh
pnpm --filter @scratch-pages/ui storybook        # Local catalogue on port 6006
pnpm --filter @scratch-pages/ui build:storybook  # Standalone static output
pnpm build:pages                                # Playground plus Storybook
pnpm test:pages                                 # Check the combined artifact in Chromium
pnpm test:catalogue                             # Check built component presentation
```

Install the browser first with `pnpm --filter playground exec playwright install --with-deps chromium`. `test:pages` uses the existing Playground browser dependency and static server; it does not rebuild. The local Quran route check reuses its existing HTTP fixture; Storybook assets are never intercepted. Avoid running the other Playground browser suite at the same time because both use port 5173.

Standalone output is `packages/ui/storybook-static/`. The combined build creates `apps/playground/dist/storybook/` alongside Playground's index, Quran and Supabase pages. Both outputs are ignored by Git. Storybook's generated asset URLs are relative, so no extra base-path override is required. Run `pnpm build:pages` again after changes; `pnpm build` alone creates only Playground output.

The catalogue exposes Button action/size/pressed states, labelled Input examples, an interactive ViewSwitcher, and an owned accessible Dialog composition. It also discovers app-owned Quran chapter stories in Playground: populated, loading, failed/retry, no search results, empty bookmarks and long names at mobile/desktop widths. App stories stay with their feature; generic controls import no app code or APIs. These are local additions until an approved push publishes them.

Playground's app-level stories add its homepage and Quran/Supabase route-loading shells for visual review. `test:pages` checks catalogue navigation and direct-link refresh under the publication prefix. Component state variations remain documented by stories; the browser smoke does not enumerate them.

Issue #28 adds `Foundations / Semantic themes / Comparison` and `Playground / Quran / Verse reading / Stacked` and `Parallel Translation`. The theme example imports the optional `@scratch-pages/design-tokens/catalogue.css`; production apps keep the default mapping. The reading examples render the app-owned production `VerseView` with the same fixture data and callbacks through its layout variant. These #28 additions remain local until an approved push. `test:catalogue` checks rendered control colours, portal font inheritance, responsive composition, pointer targets and axe results. It serves standalone Storybook on port 5174 without a backend; build Storybook first. Feature behaviour remains in Vitest, and `test:pages` covers catalogue navigation/assets and route refresh. See the [adoption inventory](../../docs/style-guide/adoption.md) and [extension rules](../../docs/style-guide/README.md#extending-the-guide).

Import controls from `@scratch-pages/ui` and import `@scratch-pages/ui/styles.css` in the consuming stylesheet. When composing with app-local Tailwind classes, register the app sources with `@source` in that stylesheet; shared control classes are scanned by the package. Styling uses tokens and complete literal utility strings. Button accepts `variant="primary" | "outline" | "ghost"` and `size="default" | "icon" | "compact"`; give icon-only actions an accessible name. Input needs a visible label; ViewSwitcher owns native grouped button semantics while its caller owns the selected value. Dialog owns the Radix integration, modal semantics and shared overlay/surface styles; consumers own responsive dimensions, naming through `DialogTitle`, and dismissal behavior.

Production source scans exclude stories and tests. The catalogue entry imports the same theme definitions and explicitly scans UI and app stories. Keep one utility entry per app so lazy route stylesheets cannot emit competing utility rules. Ordinary presentation uses Tailwind; token/theme definitions, scoped document baselines and source-specific Quran rendering remain CSS.

Prop descriptions and autodocs tags exist in source, but no Docs addon is installed and no generated Docs page is exposed. Storybook needs no environment variables or backend services. Playground's existing public `VITE_*` configuration still applies to the combined build; never add secrets to stories or browser builds. The app's renderer development dependency uses the same MIT-licensed 10.6.5 version already selected by the catalogue; see the [dependency record](../../docs/style-guide/README.md#dependency-ownership).

## Publishing and verification

The [live catalogue](https://usmaanalii.github.io/personal-tools/storybook/) was first published from [commit `8a5706d`](https://github.com/usmaanalii/personal-tools/commit/8a5706d987b10af7f6bbb2a31e05c13cd20cffc8) by [the successful Pages run](https://github.com/usmaanalii/personal-tools/actions/runs/41484993463) on 2026-11-02. All four hosted browser checks passed without interception, including the existing Playground routes.

The [Pages workflow](../../.github/workflows/deploy-pages.yml) builds and checks the combined artifact on PRs. Approved relevant pushes to `main`, or manual dispatch on `main`, publish that same checked artifact. Keep a single Pages owner and preserve every existing page. See [workflow verification and recovery](../../.github/workflows/README.md#combined-pages-artifact-and-storybook).

After deployment, run from the root:

```sh
PLAYWRIGHT_BASE_URL=https://usmaanalii.github.io/personal-tools/ pnpm test:pages
```

This checks Storybook navigation and direct-link refresh plus existing page shells against the real host. It does not prove backend connectivity. Visually review the shared button styling in the preview. Record the commit, workflow run and hosted evidence on the owning issue before marking a deployment complete. Keep root Quick access aligned with the verified live URL.

For recovery, revert the faulty change through the approved workflow or rerun a known-good complete-site workflow, then repeat hosted verification. Never upload just the Storybook directory to this Pages site.
