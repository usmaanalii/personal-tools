# Word meaning journeys (#18)

No Figma design was supplied for any of these states. The implementation uses
the existing reader's green palette and Arabic font, with a native modal dialog
styled as a bottom sheet at mobile widths. No new dependency is required.

| State | Reader experience | Entry and exit |
| --- | --- | --- |
| Loading | Existing chapter/verse loading messages; no selectable stale words | Direct load, chapter/page change → ready or retry |
| Populated | Each provider word is a keyboard-operable target; end marker stays text | Tap, Enter or Space → word details |
| Open, desktop | Centered dialog with Arabic, reference, English gloss, available transliteration and independent source credit | Close or Escape → selected word receives focus |
| Open, mobile | Full-width bottom sheet above fixed navigation, with safe-area padding | Same actions as desktop; scroll inside for long content |
| First/last word | Previous/next disabled at verse boundaries | Enabled control → adjacent occurrence; no cross-verse navigation |
| Rapid selection | Content and selected highlight change together from already-loaded word data | Previous/next → current occurrence only |
| Partial annotations | Explicit unavailable labels for missing meaning/transliteration | Other details stay available |
| Missing/invalid words | Existing whole Arabic verse and translation remain readable | No invented word splitting or selectable subset |
| Failed verse request | Existing safe error and retry controls | Retry → ready or error |
| Reading context change | Details close; old page's selected words disappear | Chapter, verse page or retry → loading |
| Long content | Text wraps, sheet/dialog scrolls, controls remain reachable | Close → reading context |

Design gaps were resolved using these states and the local UI/UX search for
keyboard focus in modals; they do not require a separate visual redesign.
Vitest with HTTP fixtures checks data and reader transitions. Playwright against
production static files checks the deployment prefix, direct refresh, 320px
layout, native keyboard activation, focus containment and restoration. Neither
fixture harness proves live provider responses; those require a separate check
after an approved compatible backend deployment.
