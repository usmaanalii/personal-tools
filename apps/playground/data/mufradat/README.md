# Mufradāt source, review and matching

The selected text is al-Rāghib al-Iṣfahānī’s *المفردات في غريب القرآن*, OpenITI version `0502RaghibIsbahani.Mufradat.JK001150-ara1`.
The unchanged source and its original metadata are in [`source/`](source/).
The metadata has a `.yml.txt` suffix because OpenITI’s field format is not standard YAML; its bytes are unchanged.
The pinned OpenITI/0525AH commit is `6290621b58e063ed1aa47ffd0a6fc1630191e7cb`.
The source SHA-256 is `925bfcafa3cfe5ec467f7ac8c2b13228f8c34fc725b792c2d27e077fc17a88f9`.

## Edition review

The [source directory at the pinned revision](https://github.com/OpenITI/0525AH/tree/6290621b58e063ed1aa47ffd0a6fc1630191e7cb/data/0502RaghibIsbahani/0502RaghibIsbahani.Mufradat) contains five versions.
The review compared each version’s metadata and representative body passages on 2026-11-07.

| Version suffix | Evidence | Decision |
| --- | --- | --- |
| `JK001150-ara1` | Metadata marks `PRIMARY_VERSION, CLEANED_VERSION`. It records removal of paratext by HRH and MGR during OpenITI Clean in 2023. The text header identifies editor Muḥammad Sayyid Kīlānī and Dār al-Maʿrifa, Lebanon; year is unspecified. | Selected for bounded entry extraction. |
| `ShamAY0034092-ara1` | Placeholder annotation/collation metadata. Its اله and حمد passages resemble JK, but its header includes a modern biographical note. | No documented cleaning advantage over JK. |
| `Shia002552-ara1` | Placeholder annotation/collation metadata; text header gives 1404, with editor and publisher unspecified. The إله and حمد passages use different spelling/punctuation. | No documented cleaning or edition advantage over JK. |
| `Shamela0023636-ara1` | Header names Ṣafwān ʿAdnān al-Dāwūdī and Dār al-Qalam/Dār al-Shāmiyya. Body includes `مقدمة المحقق` at line 40 and repeated حمد headings at lines 6560 and 6591. Annotation metadata remains placeholder. | Modern editorial material remains; unsuitable for direct distribution. |
| `Masaha003644-ara1` | Header names al-Dāwūdī, Dār al-ʿIlm/Dār al-Shāmiyya and 1412. Body includes `مقدمة المحقق` at line 16. The رحم and سما material uses different heading conventions. | Modern editorial material remains; unsuitable for direct distribution. |

JK has no `.completed` or `.mARkdown` suffix.
Its annotator, date and collation fields remain placeholders.
OpenITI’s cleaning record establishes a documented editorial-removal step; it does not establish completed structural annotation or full proofreading.
The source README and questionnaire contain no completed review.
No scan collation or external scholarly review is claimed.

The distributed entries were inspected from their opening through the next headword.
The reviewed ranges contain lexical explanation, Quran quotations and, in سما, verse citations in poetry.
They contain no separate modern introduction, footnote apparatus or editorial section.
The original author’s opening material is outside every imported range.
The importer uses explicit reviewed ranges because this version often has plain paragraph markers instead of structural headword tags.
It does not infer every entry boundary from a colon or merge adjacent headings.

## Licence and attribution

Attribute al-Rāghib al-Iṣfahānī, the named edition and OpenITI, with the exact version and commit above.
OpenITI publishes its corpus under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).
The source, extracted Arabic data and reviewed mapping adaptation retain those terms.
Use must be non-commercial, attribution must be retained, and shared adaptations must use the same licence.
The importer writes these notices into the backend bundle and the browser’s `quran-mufradat/NOTICE.txt`.
The reader displays the source, entry link, page markers and licence.

OpenITI’s [licence and copyright guidance](https://openiti.org/documentation/#how-can-i-use-openiti-what-license-is-used) requires removal of modern copyrighted editorial input.
The selected version’s cleaning metadata is preserved alongside the source.
The other editions are comparison inputs only and are not included in the repository or application.
No published English translation, generated definition or English summary of an entry is included.

## Verified mappings and limits

[`mappings.json`](mappings.json) preserves the original four inspected entries, three exact root keys and two lemma exceptions.
[`expanded-mappings.json`](expanded-mappings.json) adds 242 inspected spans and their association notes.
Normal pnpm imports combine both files, preserving original overrides.
The combined catalogue contains 246 entries, 238 root keys and eight lemma keys.
These counts describe the reviewed mapping set, not Quran-wide occurrence coverage.

| Corpus key | Source headword and ID | Reviewed range; next headword |
| --- | --- | --- |
| Root رحم | رحم · `jk-l5840` | 5840–5860; رخا |
| Root حمد | حمد · `jk-l3990` | 3990–4004; حمر |
| Root سمو, lemma ٱسْم | سما · `jk-l7446` | 7446–7489; سنن |
| Lemma ٱللَّه | اله · `jk-l575` | 575–593; إلى |

The سما entry explicitly explains الاسم through سمو.
The name lemma therefore maps to سما, without matching بسم about smiling.
The Allah lemma explicitly maps to اله.
The reader presents this source’s lexical explanation separately from Quran Foundation’s contextual gloss.
These source relationships do not establish historical etymology.

Only available, occurrence-verified grammar stem annotations supply lookup keys.
Exact lemma mappings take precedence over root mappings, including an explicitly empty lemma mapping.
No diacritic removal, surface guessing or fuzzy matching is used.
Multiple candidate IDs produce an explicit ambiguous result without selecting an entry.
Distinct successful matches from different verified stems are displayed as separate entries.
Unreviewed keys and unavailable grammar produce a missing result.

The additions include كتب, رزق, نفق and علم from Al-Baqarah.
Explicit source-backed aliases cover امن→أمن, صلو→صلا, هدي→هدى and يقن→يقين.
Rootless particles include إِلَىٰ, ثُمّ, حَتَّىٰ, لَم, لَا and هَل.
Additional reviewed headwords map by exact equality with QAC root keys.
Each association has a complete inspected source range and next-headword boundary.
These spans contain lexical discussion and citations without a separate modern editorial section.
This bounded inspection does not clear the rest of the book for import.

Colon-prefixed paragraphs are not an entry catalogue.
Internal قيل at line 149, ومثله at 6280 and الخامس at 12769 remain within their containing entries.
The heading حزن at 4488 discusses الخزن and is excluded.
The final ياء at 17109–17110 requires an explicit EOF boundary.
The importer validates ordered non-overlapping ranges and accepts `next: null` only at the actual EOF.
Genuine colonless headings use exact `opening` or `nextOpening` source anchors.
Both بعد entries at 1592–1604 and 1605 are preserved separately.
The complete-result API makes both readable; the legacy API retains its ambiguous response.

## Reproducible import and delivery

Use Python 3 with its standard library:

```sh
pnpm --filter playground mufradat:data
pnpm --filter playground mufradat:data --output /tmp/mufradat-review
pnpm --filter playground mufradat:data --notices-only
```

Imports are offline and verify the pinned source checksum before publishing data.
They validate the reviewed start/next headings, non-overlapping ranges and all mapping references.
Each entry retains its exact raw source span, source line range, stable ID and source link.
Page markers include the page active at the beginning and markers occurring within the entry.
The reading text unwraps continuation lines, removes technical `#`, `~~`, `@QB@`, `@QE@`, `ms`, poetry `%` and pipe markers, and moves page markers to the displayed provenance.
Arabic wording, punctuation and source errors remain unchanged.
Expansion restores the whole entry after the labelled initial excerpt.

The default output is `supabase/functions/quran/mufradat-data/` with `index.json`, `entries/{entryId}.json`, `coverage.json`, `manifest.json` and `NOTICE.txt`.
The pnpm command enables `--expanded`; direct Python invocation without it reproduces the original four-entry set.
The manifest includes source/version/checksum/licence and per-file SHA-256 checksums.
`--source` and `--mappings` support explicit input verification.
Changing a mapping requires inspecting the complete source span and its next boundary.
Changing the source requires a new edition, editorial-removal and checksum review.

The offline report audits every raw QAC word and records unresolved keys explicitly.
`sourceOnly` counts use source keys without requiring occurrence verification.
`verified` and `baqarah` use the pinned chapters 1–2 reference and the actual morphology check.
The inspected expansion associates 1,258 of 5,221 verified Al-Baqarah words, compared with 279 at baseline.
Production access beyond those chapters remains unverified.
Generate cross-dictionary overlap after regenerating both reports:

```sh
python3 apps/playground/scripts/quran-data/lexicon.py \
  --lane supabase/functions/quran/lane-data/coverage.json \
  --mufradat supabase/functions/quran/mufradat-data/coverage.json \
  --output /tmp/lexicon-overlap.json
```

The comparison verifies shared input identity and records report hashes.
Coverage reports stay outside the function's `static_files` selection and browser build.

The owner’s implementation direction on #21 adopts the existing Supabase API pattern.
It supersedes the issue’s proposed static GitHub Pages entry assets.
The frontend calls `GET /functions/v1/quran/v2/mufradat/entries?root=…&lemma=…` on demand.
It accepts the original matched/missing/ambiguous shapes plus `multiple` with distinct verified `entries`.
The original `/v2/mufradat` route and response remain available to older clients.
The inspected catalogue's largest group has two entries, so it needs no continuation.
Backend data is bundled through `static_files`, checksum-verified before parsing and cached after successful reads.
Frontend results are cached while the verse remains mounted.
Failures remain retryable and isolated from meaning, grammar and Lane.
No new API account, database table, Storage bucket, dependency or browser environment variable is needed.

Generate the morphology release package, Lane data and Mufradāt data before deploying the complete Quran function with the Docker bundler.
Deploy and verify the backend before publishing the frontend.
Backend version 10 includes the four entries; frontend publication follows the
approved push through Pages.
Version 11 supersedes it with the inspected expansion and complete-result route.
Live responses for the four new Al-Baqarah examples, both بعد entries and the original name/Allah selections matched the pinned imports.
Publish the #44 reader through the Pages workflow after the backend checks.
The [state inventory](journeys.md) records the reading journeys and responsive states.

## Verification boundaries

Vitest import tests use the real pinned source and independent temporary output directories.
They compare every generated entry against the complete reviewed text and provenance
in `reviewed-entries.test-data.ts`. That fixture also supplies schema-validated UI
examples. Independent imports compare every output file byte for byte.
Other cases cover boundaries, spelling exceptions and invalid inputs.
Function-owned HTTP tests exercise real generated assets and the owned Request/Response contract.
UI tests use application components and MSW at HTTP boundaries.
Playwright uses production assets under `/personal-tools/` and the actual local Deno route, with fixture verse content.
It checks direct loading/refresh, on-demand requests, narrow/landscape layout, keyboard scrolling and axe.
These checks do not establish hosted bundle inclusion, provider connectivity, physical-phone use or assistive-technology behavior.
