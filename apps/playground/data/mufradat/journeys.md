# Mufradāt word-reference states

Readers select a Quran word, then open Mufradāt in its existing word sheet.
Closing returns to the word. Previous and Next retain the sheet and select another word.
Grammar and contextual meaning remain available through their existing tabs.

No Figma design was supplied. Every state below is NO DESIGN and uses the existing sheet, tabs, buttons and semantic tokens.

| State | Visible outcome | Transition |
| --- | --- | --- |
| Closed | Mufradāt tab; no reference request | Activate tab |
| Loading | Loading announcement | Entry, missing, ambiguous or failure |
| Matched | Original Arabic excerpt, headword, source and licence | Read full entry |
| Expanded | Full Arabic entry in the sheet's scrolling area; selected word and navigation remain visible | Show shorter entry, change tab, change word or close |
| Missing | No verified match; contextual meaning stays visible | Change word or recover grammar |
| Ambiguous | Explicit ambiguity message; no arbitrary entry chosen | Change word |
| Failed | Separate failure message and retry | Retry, change word, grammar or close |
| Retry pending | Stable retry control and loading announcement | Entry, missing or failure |
| Word changed | Discard obsolete response; reset excerpt | Load new verified match |
| Reopened | Reuse successfully loaded entry within the mounted verse | Expand or close |
| Narrow, landscape or zoomed | Fluid text and independent scrolling; header and footer stay reachable | Scroll, keyboard navigation or close |

There is no account, form submission or mutation in this flow.
Tests allocate content and failure states to Vitest with MSW.
The browser check covers production assets under the deployment prefix, keyboard operation, native layout and axe.
