# Lane dictionary sources and matching

The reader uses the [Alpheios/Perseus Lane digitisation](https://github.com/alpheios-project/lan) at commit `7dd04e1182c13a4b0883978867d2a3b04616542a`.
The unchanged source archive is `source/lane-7dd04e1.tar.gz`.
Its SHA-256 is `633b60ec3dbccb8c5214dcb0dcdfb5979f26610789093dc18c32780ce2bb6b05`.

Lexicon entries come from `db/lexica/ara/lan/*.xml`.
The source index is `db/indexes/ara-lan-index.xml`, whose SHA-256 is `f96508d055b2abe0341f37b9aa6658d32970a57cb02d828f1712b8dec07b2584`.
The index contains several spellings for an entry. Its normalised search keys do not establish a verified match for a Quran occurrence.

## Attribution and licence

Edward William Lane, *An Arabic-English Lexicon*, London: Williams and Norgate, 1863.
Original digitisation: Perseus Digital Library at Tufts University, supported by the U.S. Department of Education and the Max Planck Society.
Digitisation corrections: Alpheios Project, Ltd.
The source README specifies [CC BY-SA 3.0 United States](https://creativecommons.org/licenses/by-sa/3.0/us/).

The archive preserves the original README.
Generated `NOTICE.txt` reproduces it and identifies the adaptation.
The structured dictionary data and lookup mappings are distributed under the same CC BY-SA terms.
The adaptation retains text, Arabic language spans, emphasis, forms, sense boundaries and source page markers.
Only page numbers actually present in the selected XML are displayed.
Source abbreviations and textual cross-references remain verbatim; no page numbers or definitions are supplied from inference.

## Matching and coverage

[`mappings.json`](mappings.json) owns the inspected source mappings and their exception notes.
The current set contains eight distinct entries, three root keys and two lemma keys:

| Corpus key | Matching policy | Lane entries |
| --- | --- | --- |
| Root سمو | Source root group; name lemma takes precedence | n20811, n20831 |
| Root رحم | Verb and two divine epithets remain distinct | n15076, n15091, n15096 |
| Root حمد | Verb and noun remain distinct | n9032, n9039 |
| Lemma ٱسْم | Explicit match to اِسْمٌ under سمو | n20831 |
| Lemma ٱللَّه | Explicit match to اللّٰهُ under اله | n1123 |

The name exception prevents بِسْمِ from matching Lane's بسم entries about smiling.
The Allah lemma selects its entry without choosing a contextual sense from other deity-related entries.
Lemma mappings take precedence over root mappings, including an explicitly empty lemma mapping.
Keys are compared exactly. Surface text, fuzzy search and diacritic removal are not matching rules.
The browser supplies only roots/lemmas from available, occurrence-verified grammar stem segments.
The backend owns all Lane mapping decisions.

These are source-inspected mappings, not a claim of external scholarly review or complete Quran coverage.
Unreviewed roots, rootless/unmapped lemmas and unavailable grammar show an explicit unavailable state.
Dictionary senses remain separate from the contextual verse gloss.
Root group membership does not establish historical etymology.

## Reproducible import

Use Python 3 with its standard library and install workspace dependencies from the repository root.
Normal imports are offline and reject a changed source archive.

```sh
pnpm --filter playground lane:data
pnpm --filter playground lane:data --output /tmp/lane-data
pnpm --filter playground lane:data --notices-only
```

The full import defaults to `supabase/functions/quran/lane-data/`.
It produces `index.json`, `lane/{entryId}.json`, `manifest.json` and `NOTICE.txt`.
The manifest records the pinned commit, archive checksum, licence and individual output checksums.
Imports validate IDs against both the source index and lexicon XML, validate root-group membership, and remove stale generated entries.
The `--source` and `--mappings` options allow explicit input checks; changing the source requires reviewing and updating its checksum pin.

App development and builds use `--notices-only`.
Its default browser output is `public/quran-lexicons/NOTICE.txt`; it rejects other files in that directory.
Full dictionary assets belong only in the function bundle.
No source download, dictionary table, Storage bucket or additional npm package is needed.

## Runtime ownership and release

Issue #20 originally proposed GitHub Pages entry assets.
The owner's implementation instruction supersedes that delivery proposal: use the existing Supabase Quran function and its bundled-file pattern.
`GET /functions/v1/quran/v2/dictionary?root=سمو&lemma=ٱسْم` performs the reviewed lookup and returns structured entries.
It makes no Quran Foundation request and leaves the existing verse response unchanged.
The public request/response schemas live in `packages/api-contracts`.
The function verifies checksums before parsing data and caches only successful reads for its instance lifetime.
The browser caches successful results while the verse remains mounted, including closing/reopening word details.
Failures remain retryable and do not replace successful entries or contextual word meaning.

Generate the Lane assets and the existing guarded morphology release package before deploying the complete Quran function with the Docker bundler.
The `static_files` configuration includes both datasets.
Deploy and verify the backend addition before publishing the frontend.
The local implementation is not a hosted deployment.
See [function release instructions](../../../../supabase/functions/quran/README.md).

## User journeys and verification boundaries

No Figma frames were supplied. These states use the existing word-dialog controls and semantic design tokens; all are `NO DESIGN` in the supplied design material.

| State | Reader sees | Transition |
| --- | --- | --- |
| Closed | Expand dictionary beside grammar | Open for the selected word |
| Loading | Loading announcement and pending retry control | Complete, fail, close or change word |
| Matched | Distinct entry IDs, Arabic headwords and source links | Expand an entry or collapse the section |
| Long entry | Full structured text with a sticky selected-word reference | Scroll independently or return to the excerpt |
| Unavailable | No verified entry for the current word | Change word or recover grammar |
| Failure | Retryable dictionary error; existing meaning and successful entries remain | Retry in place |
| Word/grammar change | Reset disclosure; discard an obsolete response | Open the new selection |
| Narrow/landscape | Scrollable reading area with selected-word context | Keyboard or touch scrolling; Close/Previous/Next remain reachable |

Vitest in Node checks real source imports, reproducibility and the HTTP contract.
Vitest in jsdom checks disclosure, caching, failure/retry, stale requests and inert rendering.
Playwright opens production frontend assets under `/personal-tools/` and calls the actual local Deno dictionary route; verse content is a fixture.
Its browser evidence covers request timing, focus, scrolling, viewport fit and axe checks.
It does not prove hosted Supabase bundling, live provider access, physical-device safe areas or assistive-technology use.
