# Shared UI and Storybook

`@scratch-pages/ui` owns reusable React controls, shared styles and the Storybook catalogue. Apps compose these controls and own their behaviour. Foundation and semantic variables come from `@scratch-pages/design-tokens`; see the [style guide](../../docs/style-guide/README.md).

Use Node 24 and pnpm 9.5.0 for the Pages build. Install from the repository root with `pnpm install --frozen-lockfile`.

```sh
pnpm --filter @scratch-pages/ui storybook        # Local catalogue on port 6006
pnpm --filter @scratch-pages/ui build:storybook  # Standalone static output
pnpm build:pages                                # Playground plus Storybook
pnpm test:pages                                 # Check the combined artifact in Chromium
```

Install the browser first with `pnpm --filter playground exec playwright install --with-deps chromium`. `test:pages` uses the existing Playground browser dependency and static server; it does not rebuild. The local Quran route check reuses its existing HTTP fixture; Storybook assets are never intercepted. Avoid running the other Playground browser suite at the same time because both use port 5173.

Standalone output is `packages/ui/storybook-static/`. The combined build creates `apps/playground/dist/storybook/` alongside Playground's index, Quran and Supabase pages. Both outputs are ignored by Git. Storybook's generated asset URLs are relative, so no extra base-path override is required. Run `pnpm build:pages` again after changes; `pnpm build` alone creates only Playground output.

The catalogue exposes Controls/Button Default, Loading, Retry and Long Label. Prop descriptions and autodocs tags exist in source, but no Docs addon is installed and no generated Docs page is exposed. Storybook needs no environment variables or backend services. Playground's existing public `VITE_*` configuration still applies to the combined build; never add secrets to stories or browser builds.

## Publishing and verification

The configured destination is `https://usmaanalii.github.io/personal-tools/storybook/`. **First deployment and hosted verification are pending the approved commit/push for #33.** This is not yet a verified live link.

The [Pages workflow](../../.github/workflows/deploy-pages.yml) builds and checks the combined artifact on PRs. Approved relevant pushes to `main`, or manual dispatch on `main`, publish that same checked artifact. Keep a single Pages owner and preserve every existing page. See [workflow verification and recovery](../../.github/workflows/README.md#combined-pages-artifact-and-storybook).

After deployment, run from the root:

```sh
PLAYWRIGHT_BASE_URL=https://usmaanalii.github.io/personal-tools/ pnpm test:pages
```

This checks Storybook navigation and direct-link refresh plus existing page shells against the real host. It does not prove backend connectivity. Visually review the shared button styling in the preview. Record the commit, workflow run and hosted evidence on #33 before marking deployment complete, then add the verified catalogue URL to root Quick access and update these pending status notes.

For recovery, revert the faulty change through the approved workflow or rerun a known-good complete-site workflow, then repeat hosted verification. Never upload just the Storybook directory to this Pages site.
