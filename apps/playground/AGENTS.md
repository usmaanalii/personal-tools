# Playground UI guidance

- For changes to the Quran reader's visual design, interaction patterns, responsive layout, or accessibility, consult the `ui-ux-pro-max` skill and use its search workflow. Restore the project skill with `npx skills experimental_install` if it is not installed locally at `.agents/skills/ui-ux-pro-max/SKILL.md`.
- Preserve a calm, content-first reading experience. Evaluate generated recommendations against Quran reading context rather than applying unrelated product palettes mechanically.

## GitHub Pages routes

- Build each directly addressable route as a separate Vite HTML entry point and list it in `vite.config.ts` under `build.rollupOptions.input`. GitHub Pages serves static files without SPA route fallback, so a client-side route alone is not enough for direct links or refreshes.
- Verify each route by opening its URL directly and refreshing it in Playwright.
