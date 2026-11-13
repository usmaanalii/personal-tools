# Quran word availability (#47)

Open **Quran word availability** from the local Playground homepage, or go directly to `/personal-tools/quran-word-availability/` with the default base path. Select a word to read its three source statuses.

## Captured verses

The snapshots preserve the Arabic word strings and availability statuses from hosted Supabase `quran` version 13 on 13 November 2026. The prototype uses these captures offline. [Availability contract and status definitions](../../../../../supabase/functions/quran/README.md#word-source-availability-46)

| Sample | What to inspect |
| --- | --- |
| Al-Fatihah 1:1 | Four words with all three sources represented and multiple Lane candidates for the last two. |
| Al-Baqarah 2:4 | Word 11 has grammar without a root or lemma and no match in either dictionary. Word 10 has no aligned Corpus analysis and unknown dictionary availability. |
| Al-Baqarah 2:20 | A dense 25-word sample with pause marks, diacritics, and mixed availability. |
| Al-Baqarah 2:27 | Word 6 has multiple indexed candidates in both dictionaries. |
| Al-Baqarah 2:1 | A second request captured Corpus temporarily unavailable and both dictionary statuses unknown. This is a point-in-time sample. |

## Selected treatment

Three positions always represent Corpus, Lane and Mufradāt from left to right. A filled circle means data is available. Grammar-only Corpus data and multiple indexed dictionary matches both count as available. A hollow circle means unavailable, including missing, unknown and temporarily unavailable results. Accessible word descriptions and the selected-word details use the same two states.

The initial comparison included dots, a source count, under-word marks and a hidden mode. The count combined distinct source combinations. The under-word strokes were harder to distinguish at phone size. The owner chose circles with a single availability decision per source, and the style selector was removed.

## Verification

- Vitest and Testing Library in jsdom check grammar-only data, multiple matches, missing and unknown data, temporary failure, the legend and selected-word details.
- Playwright checks direct loading and refresh of the built route. At a 320 × 568 CSS-pixel viewport, all 25 word controls in 2:20 fit without horizontal overflow and measure at least 44 × 44 CSS pixels. The test also checks keyboard selection, focus and axe violations. Physical-device and screen-reader checks remain open.
