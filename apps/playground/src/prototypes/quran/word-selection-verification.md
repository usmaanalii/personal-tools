# Word-selection separation (#23)

Verification on 1 November 2026 against the local change from `80f1e46`, updated
following the test-quality, naming and smoke-scope review rounds. Implementation
and the context-teardown focus policy are approved. Commit/push were authorized
after the review fixes; publication is a separate workflow result.

## Ownership

- `use-word-selection.ts` owns the selected position and verse-bounded navigation.
- `word-content.tsx` renders word details without the reader or dialog.
- `word-dialog.tsx` owns native modal lifecycle and accessible naming.
- `verse-words.tsx` composes them and owns occurrence refs, highlighting and
  explicit-dismissal focus. Reader owns the surviving chapter-heading fallback.
- Existing chapter/page/retry keys remove stale selection. Explicit dismissal
  focuses only the latest connected word. After teardown, retain surviving focus;
  if it was lost, focus the current chapter heading outside normal Tab order.

## Review changes applied

| Review finding | Resolution |
| --- | --- |
| Impossible Al-Fatihah page 2 / verse 21 | Removed the new browser payload; corrected the existing Vitest fixture to paginate Al-Baqarah. |
| Broad request handlers and copied untyped word records | Shared `buildWord` factory uses `QuranWord`; HTTP fixtures use `VersesResponse` and reject unsupported chapter/page pairs. |
| Repeated native lifecycle E2E cases | Removed both synthetic chapter/page browser cases and narrowed the large existing modal test to a primary smoke journey. |
| Duplicate standalone unavailable-label coverage | Removed the second standalone case; detailed missing-data behavior remains in the real page integration test. |
| Hidden content could pass presence assertions | Retained standalone test now checks visible word details and Arabic semantics. Page display assertions also check visibility. |
| Technical test descriptions | Descriptions now name user-facing actions and outcomes; harness limitations stay in comments and this record. |
| Combined navigation and close/focus rules | Split into separate page tests, with a direct assertion that Previous returns to the earlier word. |

Representative description changes:

| Before | After |
| --- | --- |
| Opens the selected occurrence with its meaning, transliteration and verse reference | Shows a word's details when it is selected |
| Moves only within the verse and restores focus to the last selected occurrence | Shows adjacent words in the same verse when Previous or Next is selected; returns to the last selected word when word details are closed |
| Focuses the reading heading when a context change removes the focused details | Focuses the new chapter heading when the selected word disappears |
| Renders word content independently with Arabic semantics, context and attribution | Shows a word's meaning with its pronunciation and source |
| Word details fit the viewport and contain keyboard focus after direct loading | Shows a word meaning when selected and returns to reading when closed |
| Returns native focus after programmatic context invalidation | Removed from E2E; application context/focus wiring stays in Vitest |

## Test allocation

| Behavior | Ongoing automated evidence |
| --- | --- |
| Selected fields, highlighting, previous/next and single-word boundaries | Vitest page integration with real application composition and HTTP-level MSW fixtures |
| Unavailable meaning/transliteration | Vitest page integration only |
| Close and cancellation clear selection and return focus | Vitest page integration; cancellation event models the application handler, not browser Escape dispatch |
| Chapter/page dismissal and focus fallback | Vitest page integration; synthetic transitions are explicitly limited to application wiring |
| Independently rendered details and Arabic semantics | One Vitest component test with visible full-fixture content |
| Production entries, deployment prefix, navigation, refresh and basic responsive fit | High-level Playwright smoke, desktop and mobile Chromium |
| Main word journey | Short Playwright smoke: select word → see meaning → close → resume reading |

E2E is smoke-only. It does not repeat detailed navigation, unavailable-data,
focus containment, rotation, font sizing or lifecycle contracts. Other existing
reader, Supabase demo and Next.js browser journeys were inspected and already
have high-level smoke scope; no Next.js source or configuration change was needed.

jsdom's native-dialog shim models visibility only. The context tests deliberately
model a Reader transition while details are open; they do not prove users can
click an inert modal background. Its cancellation test dispatches the event a
browser would produce rather than claiming jsdom handles Escape natively.

Native focus containment, initial focus, browser Escape dispatch and detailed
rendered geometry cannot be established by jsdom. The earlier broader browser
checks passed before this test-only cleanup, against unchanged production code;
those are historical scoped observations, not ongoing smoke-suite guarantees.
Future detailed native checks belong in a separately justified browser component
harness or scoped manual verification, not additional E2E cases. No new harness
or dependency was added merely to retain the removed checks.

## Final checks

Checks used temporary Node **24.22.2** and pnpm **9.5.0**. The independent Next.js
app retains its Node 22 requirement; no installed default runtime was changed.

| Check | Observed result | Limit |
| --- | --- | --- |
| `pnpm test` | 43 tests passed, 7 files | Vitest jsdom application/component behavior and Node static-server contract; not native browser behavior or layout. |
| `pnpm test:functions` | 52 tests passed, 3 files | Real handlers with mocked upstream HTTP; not hosted credentials or live provider connectivity. |
| `pnpm test:e2e` | 6 smoke checks passed, desktop/mobile Chromium | Production static assets with fixture content; not detailed component behavior or live backend connectivity. |
| `pnpm typecheck` | Passed | Playground TypeScript. |
| `pnpm build` | Passed | Playground TypeScript and all three Vite HTML entries. |
| `pnpm lint` | Passed | Repository Biome; five pre-existing informational literal-key suggestions remain. |
| `git diff --check` | Passed | Patch whitespace. |

No route, stylesheet, manifest, lockfile or deployment status changed. Root
README Quick access links still name the same four live surfaces. The initial
refactor's scoped screenshot comparison found no mobile pixel changes and only
53 changed desktop pixels around controls; screenshots are historical evidence,
not part of the revised smoke assertions.

## Test sensitivity

The fallback behavior had an intended failing regression before implementation.
After the review fixes, targeted manual mutations were applied only in an
isolated temporary copy, with the real focused Vitest suites. They cover stopped
Next navigation, wrong Previous neighbor, uncleared selection, omitted teardown
fallback, stolen valid focus, hidden word content and ignored cancellation.
All seven mutations failed the focused suites, and originals were restored between
runs. This is targeted sensitivity evidence,
not a comprehensive Stryker score. The repository has no Stryker setup and this
change remains intentionally uncommitted.

## Remaining evidence boundaries

- Deno is unavailable locally, so `check:deno` was not run. Backend source and
  entry points are unchanged; the existing CI Deno gate remains.
- No hosted deployment smoke, live provider check, full WCAG audit or
  assistive-technology session was performed.
- The approved push triggers Pages; local checks do not establish successful
  publication or live provider connectivity.
