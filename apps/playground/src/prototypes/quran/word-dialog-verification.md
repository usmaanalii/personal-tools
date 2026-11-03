# Owned word dialog migration (#26)

Implementation and local verification recorded on 3 November 2026 for commit
[`95d99b6`](https://github.com/usmaanalii/personal-tools/commit/95d99b62236a6b54e142e214fad776f39c552729),
based on `281b2e6e0323770d4dce632d34d86abc192ccb79`.
Issues #23 and #24 were closed before this slice began. This record supersedes
only their earlier native-dialog description and browser-evidence boundary;
selection ownership and the default shared guide remain as approved.

## Ownership and behavior

- `packages/ui/src/dialog.tsx` contains the Radix imports and exposes the owned
  Dialog Root, Trigger, Portal, Overlay, Content, Title and Close components.
  Tailwind utility classes style its overlay and surface using design tokens.
- The UI package pins `@radix-ui/react-dialog` 1.1.23 exactly. Its npm metadata
  declares MIT licensing and React/React DOM peer ranges that include React 19.
  The workspace lockfile resolves the full transitive graph; no app or backend
  dependency was added.
- `word-dialog.tsx` composes the owned dialog and retains the Quran feature's
  outside-dismissal and focus-return policy. Escape and Close clear selection;
  focus returns to the latest connected selected word. A removed trigger is
  ignored, then the reader's existing delayed heading fallback handles lost
  focus after context teardown.
- `verse-words.tsx`, `word-content.tsx` and the API contract continue to own
  occurrence selection, highlighting, Arabic semantics, annotations and whole
  verse fallback. No glyph substitution, word splitting, backend contract or
  data-fetching change was made.
- One Tailwind-responsive Radix modal keeps a centered desktop surface and a
  bottom-aligned mobile sheet. The sheet uses `dvh`, safe-area padding and the
  shared radius/focus/surface tokens. Long content scrolls inside the modal.
  Superseded native dialog and backdrop rules were removed from Quran CSS.
- The shared UI Storybook now documents an interactive Dialog example with
  autodocs and prop descriptions. The app README and style guide describe
  ownership and consuming behavior.

## Test allocation and evidence

Detailed content, navigation, missing annotations, chapter/page invalidation,
Escape and focus callback behavior stay in `quran-words.test.tsx`, using the real
reader composition and HTTP-level MSW. The focused browser file covers the
distinct browser risks: modal focus containment, browser Escape, accessible
name relationship and axe violations, return to the last selected occurrence,
and rendered viewport fit. Its layout check covers centered desktop alignment,
bottom-aligned mobile layout, fixed-navigation layering, 320px phone width,
landscape, long content, reduced-motion preference and 640px CSS reflow,
equivalent to a 1280px display at 200% zoom. The smoke checks still cover direct routes, refresh
and the short primary journey. All browser payloads are fixtures and do not prove
hosted API connectivity.

The browser run used desktop and mobile Chromium. Chromium does not provide a
physical iPhone safe-area inset in this emulation; the sheet uses left, right and
bottom safe-area padding utilities, while the browser run verifies it stays
inside the emulated viewport and above the fixed mobile shortcuts at the bottom edge.
The 200% case verifies its equivalent CSS layout viewport rather than changing
browser chrome's zoom setting.

## Dependency, bundle and rollback

Bundle measurements compare the baseline archive at the commit above with the
current Playground production build, both using pnpm 9.5.0 and Vite 8.3.5.
Values are per emitted chunk and use Vite's gzip estimates. The Quran route loads
the main entry, shared schemas and Quran reader chunks:

| Chunk | Baseline gzip | With Dialog gzip | Change |
| --- | ---: | ---: | ---: |
| Main entry JS | 69.99 kB | 70.24 kB | +0.25 kB |
| Shared schemas JS | 24.91 kB | 37.48 kB | +12.57 kB |
| Quran reader JS | 6.56 kB | 7.09 kB | +0.53 kB |
| Quran reader CSS | 4.43 kB | 4.71 kB | +0.28 kB |
| Combined Quran route assets | 105.89 kB | 119.52 kB | +13.63 kB |

The increase is the shipped cost of the Radix dialog's focus, dismissal and
modal behavior; these totals are build estimates, not transfer measurements or
browser-cache measurements. Reverting the single issue commit removes the app
rewiring and CSS, owned UI wrapper/story, exact manifest and lockfile entries,
tests and documentation together. The slice changes no routes, backend, stored
data or deployment configuration.

## Verification

| Check | Result | Limit |
| --- | --- | --- |
| Playground Vitest | 46 tests passed, 7 files | jsdom does not prove browser geometry. |
| Playground Playwright suite | 10 passed across desktop/mobile Chromium | Fixture content; no live provider check or physical safe-area device. |
| Playground production build | Passed; all three Vite HTML entries | Build only; deployment remains separate. |
| Shared UI Storybook build | Passed; Dialog story chunk is 14.32 kB gzip | Build emits non-failing Radix `use client` and existing large Storybook iframe chunk warnings. |
| Next.js consumer build | `next build --webpack` passed | Default Turbopack build could not bind its internal local port, even outside the sandbox. |
| Repository lint | Passed | Eight existing informational literal-key diagnostics remain. |
| `git diff --check` | Passed | Whitespace check only. |

No hosted deployment or assistive-technology session was performed.

## Issue #26 acceptance review

| Criterion | Status | Evidence and limit |
| --- | --- | --- |
| Preserve verse loading/retry, pagination, word navigation, highlighting, attribution and missing labels | Covered | Existing reader composition remains in place; `quran-words.test.tsx` exercises selection/navigation/context, while the 46-test Playground suite passed. |
| Use a selected headless dialog primitive through shared UI, with vendor imports contained | Covered | `packages/ui/src/dialog.tsx` owns the Radix imports; UI package manifest and lockfile pin the dependency. |
| Use a mobile bottom sheet and desktop dialog with one responsive primitive | Covered | Same shared Dialog composition; browser geometry checks centered desktop and bottom-aligned mobile. |
| Preserve Arabic shaping, diacritics, language/direction and whole-verse fallback | Covered | Arabic content implementation and API contract remain unchanged; reader tests preserve the existing content behavior. |
| Preserve keyboard entry, Escape, modal focus containment, accessible naming, return focus and safe context teardown | Covered | Focused browser test covers keyboard entry, accessible name, focus loop, Escape and return to the last selected word; Vitest covers context invalidation and removed triggers. |
| Support narrow widths, landscape, long content, zoom, reduced motion, safe areas and fixed-navigation clearance | Partial | Chromium covers 320px, landscape, long content, 640px CSS reflow, reduced motion and fixed-navigation layering. Safe-area insets are authored in CSS but were not exercised on physical hardware; 200% was represented by its equivalent CSS viewport, not browser chrome zoom. |
| Split the oversized browser journey into focused browser checks; keep detailed behavior in Vitest and avoid fake responsive hooks | Covered | Focused dialog browser file covers browser focus/layout risks; content and state behavior remain in Vitest; viewport is controlled by Playwright, with no responsive hook added. |
| Update stories/docs, remove superseded styles, and record dependency, bundle cost and rollback | Covered | Dialog Storybook story, app/UI/style-guide docs, removed superseded dialog CSS in favor of Tailwind utilities, and this dependency/bundle/rollback record. |

Criterion 6 remains partial pending a physical-device safe-area check and a browser
zoom run; no issue status change is recorded from this local implementation review.
