# Quran morphology inputs

These are pinned inputs for issue #19. Keep source data separate from generated
display data. The source ZIP is unchanged.

| Input | Version | SHA-256 |
| --- | --- | --- |
| `source/quranic-corpus-morphology-0.4.zip` | Corpus 0.4 | `fda26f87cc58b42fc992a3ad666a562805b636f34bcecb46326d048337ca7999` |
| Decompressed corpus text | Corpus 0.4 | `a1d12923815341face765083805d2148ed2d9f5cc3f7d6665219d887675d8c46` |
| `foundation-chapters-1-2.json` | Owned v2 API snapshot, 2026-11-05 | `b7b6fdd8fd0994ebcad15a7432ed07abdae3cdf22fbe39514399a10a9b922ab6` |

The official corpus download is https://corpus.quran.com/download/.
The source file credits Kais Dukes, 2011, under the GNU General Public License.
Its original header also includes source-preservation and attribution terms.
The embedded Tanzil Uthmani text is version 1.0.2.
Its archived notice credits Tanzil.info, 2008-2009, under Creative Commons BY-ND
3.0 Unported. Preserve these archived notices rather than replacing them with
the current Tanzil website's different wording.

## Publication status

`publication.json` records the published website/application-use grant reviewed
on 2026-11-06 at https://corpus.quran.com/download/. Release relies on that grant
with clear source attribution, source links and reproduced notices. The source
ZIP stays unchanged. Generated annotation assets preserve the original Corpus
and Tanzil notices. The reader links to both sources and the verbatim notices.

The normal build passes `--require-publication` to the importer. Release builds
and backend packaging still stop if the recorded evidence is absent. Tests use
explicit approved and unapproved records so both outcomes remain checked.
Local generation, development and `build:preview` remain available. Preview
backend packages must not be deployed.

No source owner has been contacted as part of this change.

## Reference snapshot

`foundation-chapters-1-2.json` contains only public Quran word data and retrieval
metadata. It contains no request headers, credentials or contact email. It was
captured from the existing owned `/quran/v2/verses` API at
`2026-11-05T09:57:52.243Z`. All 16 verse pages for chapters 1 and 2 were read and
validated with the existing `VersesResponseSchema`. This is an HTTP data check,
not browser or full-Quran verification.

The snapshot object has `sourceUrl`, an ISO `retrievedAt` timestamp, and `words`.
Each word has positive integer `chapter`, `verse`, `position`, and non-empty
`arabic` text. Extra gloss/transliteration fields from the v2 response are
preserved in the saved snapshot but are not used for alignment. The importer
validates this boundary. To use another pinned snapshot, pass its path through
`quran:data --reference`. Normal builds read the checked-in snapshot offline.

## Import and comparison

- Run `pnpm --filter playground quran:data --output /tmp/quran-data` with Node 24 and `unzip` installed.
- The importer refuses a source ZIP whose checksum differs from the pin above.
- Locations supply chapter, verse, word and segment identities. Duplicate or
  nonconsecutive segments fail the import. Prefixes, stems and suffixes remain
  ordered. Multiple stems are retained.
- Extended Buckwalter conversion follows
  https://corpus.quran.com/java/buckwalter.jsp. Part-of-speech and feature labels
  follow the corpus documentation. Original forms, feature strings and segment
  identifiers remain in the generated records.
- Empty written suffixes are real source annotations, including `2:54:5:3`.
  The source form at `37:130:3:1` contains a space. Numeric lemma identifiers are
  kept in raw features; their numeric suffix is omitted from Arabic glyph
  display. These are representation rules, not alignment exceptions.
- Compare the occurrence key and Arabic spelling using NFC and removal of
  presentation tatweel only. Preserve diacritics and stop symbols. Never search
  for a similar word elsewhere to attach an analysis.
- Ambiguous reference keys are withheld from generated chapter data. Missing
  records and text mismatches remain explicit report entries. Every displayed
  word is checked again against its current Foundation Arabic text.
- Offline imports contain chapter JSON, `NOTICE.txt`, `manifest.json` and
  `coverage.json`. Keep full imports outside `public/`. App development and
  builds use `--notices-only`; the browser receives only `quran-data/NOTICE.txt`.
  Vite's deployment base owns its URL. Grammar arrives through the verse API.
- `pnpm --filter playground quran:backend --preview` creates local-only gzip
  chapters under `supabase/functions/quran/data/`. The backend manifest records
  compressed/decoded hashes and sizes as well as the original provenance.
  The command without `--preview` enforces the publication requirement.
- Re-running with identical inputs produces identical output. The complete
  report lists each missing, mismatched and ambiguous key. The command prints
  counts to keep routine build logs short.

The current source has 114 chapters, 77,429 words and 128,219 segments.
The reference snapshot contains 6,145 occurrences. There are 5,250 matches,
895 mismatches, no missing records and no ambiguous references. The remaining
72,179 corpus occurrences are not verified by this snapshot, including its
mismatches. Chapters beyond 1 and 2 have no snapshot verification. This does
not prevent a later current occurrence from passing the same runtime check.

## Checks and limits

Run `pnpm --filter playground test`, `typecheck`, `build:preview` and
`test:e2e`, plus root `pnpm lint`. The Node infrastructure tests check import,
source integrity, reproducibility, report denominators and the publication
gate. Backend HTTP tests own source matching, checksum validation, deadlines and
meaning preservation. The UI suite owns detailed reader behaviour. Browser
checks own notices URLs, request-free expansion, native focus, axe and fit.

Acceptance requires the live backend and website checks as well as local tests.
Physical-device and assistive-technology
checks are not established by Chromium/jsdom results.
