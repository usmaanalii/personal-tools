# Chapter browsing and bookmarks (#25)

Historical layout snapshot. The mobile reading-space update moves view choices
to the top header, removes the fixed bottom bar and lets short chapter lists
fit their content. See the [current app README](../../../README.md) for maintained behaviour.

Reader owns selected chapter, search text/open state, chapter view, chapter bookmark flag, saved verses, verse page and retries. ChapterLoader owns the abortable chapter request. Reader owns the abortable verse request and invalidates stale pages with its existing chapter/page/retry key. Refresh/unmount starts a new session; no persistence or URL state was added. The chapter bookmark flag continues to apply to the current chapter when selection changes, matching the previous implementation.

App-local views receive data and actions: `ChapterBrowser` composes the view choices, optional search and list slot; `ChapterList`/`BookmarkList` render choices; `ChapterRequestStatus` renders request feedback; `reader-chrome.tsx` owns screen chrome. They call no feature API. Shared UI owns Button/Input/ViewSwitcher styling and native semantics and imports no Quran code. There is no shared feature view-model.

| State | Presentation | Reach it in the reader | Storybook examples |
|---|---|---|---|
| Populated | Chapter number, name, meaning/place, Arabic name and verse count; selected chapter background and current state | Successful chapter response | Populated Mobile/Desktop |
| Loading | Busy region with “Loading chapters…” status | Open reader or retry chapters | Loading Mobile/Desktop |
| Failed/retry | Error announcement and Retry chapters action | Chapter request failure | Failed Mobile/Desktop; Retry shows the busy view |
| No results | Announced empty search result | Enter an unmatched chapter/meaning/number | No Results Mobile/Desktop |
| Empty bookmarks | Existing empty bookmark message | My bookmarks before saving, or remove the last saved verse | Empty Bookmarks Mobile/Desktop |
| Long names | Flexible row height and wrapped names/meanings | API supplies long chapter content | Long Name Mobile/Desktop |

The examples render the actual app views with demonstration data/actions; they do not prove API loading or retry integration. Those paths remain in Vitest with the real route and HTTP-level MSW.

## Intentional consistency and accessibility changes

- Shared default interface fonts, semantic colours, border/radius/shadow and spacing replace the bespoke chrome styling. Quran Arabic fonts, word shaping and verse text rules remain content-specific.
- Button actions and the search input have at least 44px height and visible token-based keyboard outlines. The search has a visible label; its toggle announces expanded state. Explicit Close clears the query and returns focus to the toggle. Toggling search visibility still retains the query.
- Chapter view choices use a labelled native button group with `aria-pressed`. Tab reaches each choice; Enter/Space activates it. They do not claim ARIA tablist/arrow-key semantics. Chapter selection exposes `aria-current`.
- Metadata is readable at shared text sizes, chapter rows grow for wrapped names, and no-results feedback is announced. The existing empty-bookmark wording is retained.
- Below 1024px, the verse panel precedes chapter browsing and bottom shortcuts remain fixed. At desktop widths, the sidebar and two content columns fit alongside each other. Narrow chapter navigation wraps onto separate rows when needed. The list has a bounded scroll region; focused controls have bottom scroll clearance.
- The compressed generic CSS for sidebar, header, chapter lists, view choices, search, bookmarks and navigation is removed. Remaining CSS covers a scoped page baseline, Quran text, verse presentation and word details. The previous inert “All chapters” sort-looking button is removed; the active chapter view already supplies that choice.

No Quran-specific branding decision is made. Existing prototype wording and identity remain pending the separate approved exploration.

## Verification responsibilities and limits

Vitest uses the real reader route with HTTP-level MSW to cover chapter selection/search, pressed bookmark state, saved verse pagination, request retry, query retention, focus return and unchanged URL state. Existing production smoke journeys exercise static routes, refresh, basic responsive fit and word details. Issue #28 expands the reader smoke's axe scan from migrated chrome to the whole loaded reader, including verse presentation. The open word dialog retains its scoped audit. See the [current adoption inventory](../../../../../docs/style-guide/adoption.md) for evidence limits and the retired generic verse styles.

Storybook demonstrates six visual states at mobile and desktop widths with real app views and demonstration data/actions. Component browser audits can check the rendered geometry and native keyboard focus; they do not substitute for request recovery tests. Shared UI changes must also pass the existing connection demos' checks and independent builds. Keep execution/acceptance records on issue #25 with commit references once committed.

The focused `reader-presentation.e2e.ts` checks generated styles separately from reader behavior: axe checks selected chapter-view text contrast while hovered, and a presentation-only check preserves desktop Arabic text at 27px (28px on phones) and verse viewport limits at 540px on tall desktops, 450px at desktop heights up to 900px, and no limit below 761px. These browser checks use content fixtures and do not prove live API connectivity.

The source stylesheet decreased from roughly 16 KB to 5 KB by removing migrated rules; generated Tailwind CSS is a separate build artifact, so this is not a network-transfer claim. Fixture-backed checks do not prove live backend connectivity. Existing public routes and Quick access links are unchanged; publishing follows an approved commit/push through Pages.
