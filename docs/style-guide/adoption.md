# Default-guide adoption inventory

Maintained with issue [#28](https://github.com/usmaanalii/personal-tools/issues/28). This inventory covers the current checkout. The #28 changes are local until an approved commit, push and successful deployment. Commit-pinned acceptance and release evidence belong on the issue.

## Surface register

The route entries in [Vite configuration](../../apps/playground/vite.config.ts) are Playground home, Quran and Supabase. The independent Next app has its connection page at `/`. The shared Storybook is a separately deployed catalogue under `/storybook/`. No QUL prototype route exists in this checkout; #22 remains separate work.

| Surface | Entry and user journey | Adoption |
| --- | --- | --- |
| Playground home | `/personal-tools/`; select Quran or Supabase, then use each page's return link where available | Shared tokens; native destination links; app-owned composition |
| Route-loading shells | Enter `/quran/` or `/supabase/`; a labelled loading status offers a home link until the module resolves | Shared tokens; the destination shell owns copy and navigation |
| Quran reader | `/personal-tools/quran/`; load chapters, search/select, read/paginate, bookmark, inspect words | Shared controls and semantic mappings; content exceptions below |
| Playground connection demo | `/personal-tools/supabase/`; call the API, read the response or repeat after an error | Shared Button and token-based layout/feedback |
| Next connection lab | `/`; check the connection, read the greeting or select Try again | Shared Button and semantic tokens; server page/client interaction split retained |
| Storybook | `/personal-tools/storybook/`; browse shared controls and app-owned visual examples | Shared generated utilities; default/alternate mapping and composition examples |

## States and evidence

“Adopted” describes the implemented UI's use of the guide. Evidence identifies the harness or static source that supports it. Vitest runs real React composition in jsdom with MSW at HTTP boundaries. It does not render CSS or prove native focus containment. Storybook examples use demonstration data and actions. Browser checks exercise production assets with fixture backend content unless explicitly run against a deployment.

| Surface/state | What readers see and how it changes | Status and evidence |
| --- | --- | --- |
| Home populated, focus, responsive | Two destinations; keyboard activation opens the chosen page; cards reflow | Adopted. [Navigation integration](../../apps/playground/src/app/app.test.tsx), [home story](../../apps/playground/src/app/navigation.stories.tsx), [browser journey](../../apps/playground/tests/prototypes/quran/reader.e2e.ts) |
| Home loading/empty/partial/error/retry/long data | Home has fixed local content and no request or data-driven list | Not applicable to the implemented home. Link/download failures are not home data states |
| Quran/Supabase module loading | Destination heading, polite status and return-home link; successful import replaces the shell | Adopted. [Integration tests](../../apps/playground/src/app/app.test.tsx), [loading stories](../../apps/playground/src/app/route-loading.stories.tsx) |
| Module download failure/retry | No application recovery view is implemented for a failed JavaScript chunk | Existing availability limit. This baseline does not establish offline module recovery |
| Quran chapter loading/error/retry | Busy status; safe failure message and Retry chapters; retry can restore the reader | Adopted. [Reader integration](../../apps/playground/src/prototypes/quran/quran-reader.test.tsx), [chapter stories](../../apps/playground/src/prototypes/quran/chapter-list.stories.tsx) |
| Quran chapters populated/search-empty/bookmarks-empty | Current chapter, search feedback, saved rows or the existing empty-bookmark message | Adopted. [Reader integration](../../apps/playground/src/prototypes/quran/quran-reader.test.tsx), [chapter state inventory](../../apps/playground/src/prototypes/quran/chapter-browsing-journeys.md) |
| Quran chapter long content/responsive | Names/meanings wrap; chapter list and reading panel fit phone and desktop layouts | Adopted. Chapter long-name/mobile/desktop stories; whole-reader browser fit and axe checks |
| Quran empty chapter/verse response | Empty API lists fail validation and use the existing error/retry path | Adopted error state, not a new successful empty screen. [HTTP adapter tests](../../apps/playground/src/prototypes/quran/quran-api.test.ts) and [owned schema](../../packages/api-contracts/src/quran.ts) |
| Quran verse loading/error/retry | New chapter/page hides stale verses; local loading/error feedback; Retry verses reloads | Adopted. Reader integration covers error recovery and pagination. Rendered loading/error contrast is not separately audited by the populated-state browser check |
| Quran verse populated, saved and pagination boundaries | Arabic and credited translation; pressed bookmark; page and chapter navigation expose disabled boundaries | Adopted. Reader integration, [VerseView](../../apps/playground/src/prototypes/quran/verse-view.tsx), stacked/parallel catalogue examples |
| Quran verse long translation/responsive | Translation wraps in the available column; shared 16px body text; 44px action targets | Adopted. [Catalogue presentation checks](../../apps/playground/tests/catalogue/presentation.e2e.ts) cover composition geometry, pointer targets and portal font inheritance. Production Arabic remains 27px desktop/28px mobile in the retained content stylesheet |
| Quran partial word data | Missing meaning/transliteration is labelled; missing/invalid word arrays retain whole-verse Arabic | Adopted. [Word integration](../../apps/playground/src/prototypes/quran/quran-words.test.tsx), [content tests](../../apps/playground/src/prototypes/quran/word-content.test.tsx), HTTP adapter tests |
| Word details populated/open/close/first/last | Owned Dialog; Previous/Next remain within the verse; Close/Escape returns focus to the last word | Adopted. Word integration plus [native browser lifecycle](../../apps/playground/tests/prototypes/quran/word-dialog-browser.e2e.ts) |
| Word details long content/responsive | Centered desktop surface or mobile bottom sheet; text scrolls and controls remain reachable | Adopted. Dialog browser checks cover narrow and landscape CSS viewports, focus and scoped axe. Physical safe-area and actual browser-zoom limits below |
| Playground demo idle/loading/success/error/retry | Shared action is disabled during the request; response/status updates; the same action can repeat after error | Adopted. [Demo integration](../../apps/playground/src/prototypes/supabase/supabase-demo.test.tsx) covers success/error/malformed payload; loading implementation is in [the real demo](../../apps/playground/src/prototypes/supabase/supabase-demo.tsx). No separate rendered loading-state audit |
| Playground demo empty/partial | Greeting payload is atomic; malformed/missing fields use the error state | No successful partial/empty screen. Demo integration and the owned greeting contract cover validation |
| Playground demo long content/responsive | Response preserves whitespace and wraps; page width is bounded | Adopted. [Demo composition](../../apps/playground/src/prototypes/supabase/supabase-demo.tsx) supplies wrapping; [browser journey](../../apps/playground/tests/prototypes/supabase/demo.e2e.ts) covers ordinary phone/desktop fit. Arbitrarily long server output is not separately browser-audited |
| Next idle/loading/success/error/retry | Shared action exposes pending state, greeting or safe alert; Try again recovers | Adopted. [Connection integration](../../apps/next-vercel-supabase-app/src/components/connection-check.test.tsx), [production-browser journey](../../apps/next-vercel-supabase-app/tests/connection/greeting.e2e.ts) |
| Next empty/partial | One validated greeting; missing/invalid data uses the alert/retry state | No successful partial/empty screen. Connection integration and server route contract tests |
| Next long content/responsive | Greeting wraps in its card; layout fits desktop/mobile | Adopted. [Connection composition](../../apps/next-vercel-supabase-app/src/components/connection-check.tsx), desktop/mobile production-browser fit. Arbitrarily long greeting output is not separately browser-audited |
| Catalogue default/disabled/retry/long label, Input, ViewSwitcher, Dialog | Intentional control variations with real owned components | Adopted. [UI story sources](../../packages/ui/src), [manager/direct-refresh check](../../apps/playground/tests/pages/catalogue.e2e.ts). Autodocs tags exist; a generated Docs addon is not installed |
| Catalogue alternate mapping | Same controls and interactions under default light and slate semantic colours | Adopted locally. [Theme story](../../packages/ui/src/semantic-themes.stories.tsx), catalogue browser comparison and axe checks that fail on violations |
| Catalogue alternate reader composition | Same verse fixture, word details and bookmark callbacks; stacked or parallel translation; narrow view remains stacked | Adopted locally. [Verse story](../../apps/playground/src/prototypes/quran/verse-view.stories.tsx), catalogue geometry/axe checks. Feature interactions remain covered by reader Vitest tests. No production switcher |

## Retained exceptions and debt

- Noto Naskh Arabic, Arabic sizes/line heights, word spacing, whole-provider-word targets and verse markers remain content-specific. Shared themes change surrounding semantic colours. Do not replace the font or split words to fit generic controls.
- QUL source fonts, glyphs and canonical line layout remain protected requirements for #22. They are not implemented or verified by this inventory. Their acquisition/rights prerequisites do not block this baseline.
- Chapter choices and saved-verse rows retain native compound buttons with app-specific content layout. They consume shared typography, colours, radius and focus tokens. Their semantics and content differ from a short generic action, so they remain app-local.
- Native navigation links, response `pre` formatting and the Next lab's monospace technical labels are deliberate app composition. They do not own a second generic control or colour system.
- The reader has no dedicated skip-to-reading link. This remains keyboard-navigation efficiency debt. Axe and keyboard smoke do not establish screen-reader usability or full WCAG conformance.
- Real browser zoom, physical notches/home indicators and assistive-technology sessions remain unverified. CSS viewport emulation does not prove them. The current `env(safe-area-inset-*)` padding is retained.
- Quran audio, settings and other prototype placeholders are unchanged. A guide-adoption pass does not make them functional. Only pre-live provider access is available; fixture-backed checks do not prove full-Quran/live backend availability.

## Retired foundations

The `.tiny-action` control rules, dialog descendant-button styling, DM Sans/Manrope imports, Latin verse font overrides and hardcoded Quran interface colours are removed. Verse actions and dialog actions use the owned Button. Ordinary page presentation uses Tailwind. Remaining CSS owns theme/token definitions, source registration, scoped document baselines and Quran content rendering.

Next consumes `--theme-*` directly. The temporary `--background`, `--surface`, `--foreground`, `--muted`, `--border`, `--accent`, `--on-accent` and `--error` aliases are removed. No temporary generic compatibility layer remains.

## Verification ownership

Pages builds the catalogue once. Its routing checks verify the combined artifact; `test:catalogue` checks component presentation against the standalone catalogue from that same build. Next retains independent quality and production-build/browser checks. Detailed UI behaviour remains in Vitest.

Keep dated runs, review findings, sensitivity experiments and commit-pinned acceptance assessments on issue #28. Recheck this register when routes or states change. Record CI and hosted evidence before declaring a release complete, and keep Quick access URLs aligned with deployment. Quran branding exploration remains a separate owner-approved task.
