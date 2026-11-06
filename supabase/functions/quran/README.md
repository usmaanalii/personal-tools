# Quran content function

Read-only bridge between Playground and the current Quran Foundation Content API. It uses native fetch and the documented OAuth2 Client Credentials flow; no database, service-role client, or user login is needed. The official SDK 3.15.1 was evaluated: its token cache handles early renewal but its Content path lacks in-flight token coordination and a 401 retry. The two-route HTTP integration implements the documented lifecycle directly instead of adding SDK-specific workarounds.

## Configuration

Set these in Supabase Dashboard → Edge Functions → Secrets:

| Variable | Value |
| --- | --- |
| `QF_CLIENT_ID` | Backend/server client ID for the selected environment |
| `QF_CLIENT_SECRET` | Corresponding secret; never a browser variable |
| `QF_ENV` | `prelive` (default) or `production` |
| `QF_ALLOWED_ORIGINS` | Optional comma-separated origins; default `https://usmaanalii.github.io` |

Local template: `../.env.example`; copy to the gitignored `../.env`. Do not commit credentials, print them in logs, or paste them into chat. Store the one-time client secret in a password manager. Pre-live only contains chapters 1 and 2. Switch credentials and environment together after production permission is approved. Rotate a compromised secret in Quran Foundation, replace the Supabase secret, and redeploy to replace instances holding the old token.

## Production access

New Quran Foundation apps start in **pre-live**, a testing environment containing only Al-Fatihah (1) and Al-Baqarah (2). The full Quran requires approved production Content API access. This is the provider's access policy; it is not a restriction imposed by Supabase or this reader. The provider's [official quickstart](https://api-docs.quran.foundation/docs/quickstart/) documents the limitation but does not explain the reason for it. Our live checks confirmed that the configured pre-live credentials return exactly those two chapters.

To enable the complete Quran:

1. Open the existing Backend/server app in the [Quran Foundation Developer Console](https://api-docs.quran.foundation/request-access/) and request production `content` permission.
2. Once approved, save the matching production `QF_CLIENT_ID` and `QF_CLIENT_SECRET` directly in Supabase Edge Function secrets, and set `QF_ENV=production`. Never commit the credentials. The function selects the matching production OAuth and content hosts from this setting; changing the environment alone cannot upgrade pre-live credentials.
3. Redeploy the function to replace any instances using the previous configuration or token.
4. Verify the live chapter catalogue contains all 114 chapters, the selected production translation (131) is available, and verses outside chapters 1 and 2 load correctly. Run the deployment browser smoke against the actual website after publishing the corresponding frontend.

The current pre-live catalogue offers English translation 85 (M.A.S. Abdel Haleem), not 131. The function therefore selects 85 in pre-live and 131 in production, and the reader displays attribution from the returned resource. Production access and content have not yet been verified. Pushing the frontend to GitHub Pages does not grant production API access; while `QF_ENV=prelive`, the deployed prototype remains limited to two chapters.

## API contract

The entry point is `index.ts`, which imports `handler.ts`, the private `provider.ts` adapter, and schemas from `packages/api-contracts`. Deploy function `quran` to the existing `scratch-pages-hello-world` project from the complete repository root using the Supabase CLI; it must bundle all relative imports. Keep the function-specific `deno.json` and `deno.lock`. Uploading only the two former source files is insufficient. This is a deliberately public reading endpoint; `verify_jwt=false` allows visitors without user sessions. Do not reuse that setting for private data endpoints. The browser sends its public `apikey` header, but the handler does not treat this public value as authentication.

- `GET /functions/v1/quran/chapters`: chapter metadata, `language=en`.
- `GET /functions/v1/quran/verses?chapter=<1–114>&page=<1–15>`: one page of up to 20 verses, Uthmani text, translation 85 (M.A.S. Abdel Haleem) in pre-live or 131 (Dr. Mustafa Khattab, The Clear Quran) in production. Page defaults to 1.
- `OPTIONS`: CORS preflight for allowed browser origins.
- Unknown routes/parameters, duplicate parameters, and out-of-range inputs return 400; other methods return 405. Disallowed or absent Origin returns 403. Missing/invalid server configuration returns 503. Upstream failures return a generic 502, or 429 for upstream throttling.

Responses are `no-store`; chapter and verse content are not cached. Access tokens remain server-side, are reused within a warm function instance, and are re-requested 30 seconds before expiry. Concurrent token acquisition shares one promise. A content 401 invalidates that token and retries once; a repeated failure is surfaced safely. Environments have separate function configurations and token state.

## Security and operational limits

Fixed HTTPS upstream hosts and two allowlisted operations prevent arbitrary URL forwarding. Secrets/tokens stay in server memory and outbound auth headers; no upstream error bodies or auth headers are returned or logged. Requests reject redirects and each upstream fetch has an 8-second timeout. The frontend validates response shapes and renders translation content as inert text rather than injecting HTML.

CORS only controls which browser origins may read responses. It does not authenticate callers: non-browser callers can supply an allowed Origin. The aggregate budget of 60 valid requests per minute **per warm function instance** bounds local work, but is not a distributed rate limit and resets when an instance restarts. Shared token requests reduce duplicate authentication only inside one instance. This does not provide global denial-of-service or quota protection. Review project usage and upstream quotas before broader public rollout; add a distributed limiter if required by observed traffic or provider limits.

No tables or database privileges are introduced. If private bookmarks or progress are added later, they need separate user authorization and RLS policies.

## Owned v2 contract and migration

The new frontend calls `GET /functions/v1/quran/v2/chapters` and `GET /functions/v1/quran/v2/verses?chapter=<1–114>&page=<1–15>`. Page defaults to 1. See the [shared contract package](../../../packages/api-contracts/README.md) for exact schemas. Responses expose application-owned chapter/verse fields, translation attribution, and pagination. Provider field names and translation IDs remain in `provider.ts`. The explicit `translationHtml` field carries untrusted markup; the frontend extracts inert text.

Existing `/chapters` and `/verses` routes retain their previous upstream-shaped bodies for deployed clients. They are superseded by `/v2/chapters` and `/v2/verses` and must remain until older consumers have migrated. Both versions retain the same CORS, methods, request restrictions, token lifecycle, and shared per-instance budget. Malformed upstream v2 payloads and nonsequential pagination return a generic 502 without validation details.

Quran v2 was deployed as function version 5 on 2026-10-30 using the Supabase connector with the complete source/import graph, including function-specific Deno configuration and shared schemas. Live checks confirmed two pre-live chapters, Al-Fatihah verses 1–7, Al-Baqarah page 2 (21–40) and page 15 (281–286), translation attribution, unchanged legacy response formats, CORS, preflight, and invalid-input rejection. The frontend publishes separately through Pages after push. For future releases, deploy backend first:

1. Run the backend suite and `pnpm --filter edge-functions check:deno` with Deno 2.9.6, then the frontend checks.
2. With the CLI linked to the existing project, run `supabase functions deploy quran` from the repository root. Preserve the existing public-function configuration and server-only secrets.
3. Verify real v2 chapters, verse pages, attribution, invalid inputs, and CORS; verify the legacy routes still return their original shape. Check the deployed bundle contains the provider adapter and shared schemas.
4. Only after v2 is verified, approve the frontend commit/push to publish Pages. Run `test:smoke` against the deployed website after publication.

This release deployed the backend without changing credentials or upgrading provider access; the project remains in pre-live.

## Word data addition (#18)

Version 6, deployed 2026-11-01: v2 verse requests add `words=true`,
`word_fields=text_uthmani`, and `language=en` to the existing chapter operation.
Translation selection (85/131), authentication, token coordination, timeout,
retry, origin/request restrictions and legacy upstream requests are unchanged.

The provider adapter validates word text, type, position and annotations and
publishes optional application-owned words with chapter/verse/position identity,
Arabic, nullable English meaning and nullable transliteration. Records are
ordered by provider position. Duplicate/missing positions, invalid text and
unknown character types discard enrichment for that verse, preserving the whole
verse. End markers are excluded; absent annotations produce null. English glosses
are accepted only when their language is English. Source credit is Quran
Foundation word data, independent of full-verse translation attribution.

Backend fixtures in `../tests/quran/words.test.ts` cover request selectors,
mapping, invalid/missing enrichment and legacy compatibility. Frontend fixtures
prove display behaviour separately. Live HTTP checks on 2026-11-01 using current
credentials verified 29 words across all 7 Al-Fatihah verses, 230 words on
Al-Baqarah page 1, 370 on page 2 and 279 on page 15 (6 verses). Every sampled
verse had sequential occurrence positions, Arabic, English glosses and
transliteration. Translation 85, legacy responses, CORS/preflight, invalid input
and disallowed origins also passed. These samples do not establish full-Quran
coverage; the catalogue still contains only chapters 1 and 2 in pre-live.

For future releases, deploy the complete compatible backend first. Using the existing
credentials, check v2 Al-Fatihah page 1 and Al-Baqarah pages 1, 2 and 15 for real
words, positions, English glosses, transliteration, non-selectable end markers and
translation attribution. Verify legacy responses, CORS and invalid-input
rejection. If enrichment is absent, inspect the actual provider schema before
publishing the frontend; do not count whole-verse fallback as a word-data pass.
Then publish the approved frontend commit/push and verify the live reader. No credential
or environment change is required for this pre-live slice.

References: [Word fields](https://api-docs.quran.foundation/docs/api/field-reference/),
[Chapter operation](https://api-docs.quran.com/docs/content_apis_versioned/4.0.0/verses-by-chapter-number/),
[Native dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog).

## Grammar enrichment (#19, local implementation)

V2 verse pages automatically receive optional grammar outcomes beside word
meanings. `morphology.ts` matches chapter, verse, position and Arabic text against
the pinned corpus. Only NFC and presentation-tatweel removal are permitted.
Missing or mismatched occurrences return `unavailable`. Read, checksum, schema
and deadline failures return `temporarily_unavailable` while retaining verses
and meanings. Legacy routes are unchanged.

`bundled-morphology.ts` reads one gzip chapter per verse-page request. It checks
compressed and decoded hashes and sizes before source validation. Decoded data
is bounded to its manifest size, with a 3 MB maximum. No chapter cache, database,
Storage bucket or browser corpus is needed. Public segments omit source IDs,
forms and raw annotation tokens.

Enrichment has a provisional 200 ms added-work budget after verse mapping.
Cancellation reaches decompression. Timers cannot interrupt synchronous parsing,
so elapsed time is also checked before validation and after matching. A late
result falls back to temporary unavailability. This budget is not a hosted SLO.

Generate the complete local package from the repository root:

```sh
pnpm --filter playground quran:backend
```

The output is gitignored `supabase/functions/quran/data/`. Its manifest records
gzip hashes, decoded sizes, pinned provenance, reference identity and preview
status. `supabase/config.toml` includes the explicit nested gzip glob and notices
for bundling. Use `pnpm --filter playground quran:backend` for a release package.
That command refuses to write data while publication evidence is absent.
Preview packages must not be deployed. The raw Supabase CLI does not enforce
this project guard; always regenerate through the guarded release command.
Deploy with the Docker bundler. Do not use `--use-api`: its successful upload
does not include the static assets needed by this reader. Verify an available
grammar response after every deployment.

Publication evidence in `apps/playground/data/quran/publication.json` records
the published website/application-use grant reviewed on 2026-11-06. The original
source ZIP and notices are preserved. Package and deploy the backend first. Verify aligned and
unavailable occurrences, real latency, CORS and legacy responses before frontend
publication. A local Colima worker check does not replace those live checks.

## Lane dictionary (#20, local implementation)

`GET /functions/v1/quran/v2/dictionary?root=سمو&lemma=ٱسْم` serves Lane entries
on demand through this existing function. The browser supplies verified grammar
stem annotations. The backend owns exact, reviewed root/lemma mappings and
exceptions; surface matching is not supported. The route does not contact Quran
Foundation or require provider credentials. It reuses CORS, read-only methods,
safe JSON errors, `no-store` responses and the per-isolate request budget.

`packages/api-contracts` owns the bounded request and structured response schemas.
`bundled-lane.ts` hides the mapping/index and file representations behind a single
lookup operation. It verifies file checksums before parsing and caches successful
reads within the function instance. A failed entry returns `entry: null` while
other matches remain distinct; index/read failures produce a safe 503 response.
No match returns an empty array. Existing chapters, verses and legacy routes
retain their contracts.

Generate both backend datasets before a release:

```sh
pnpm --filter playground quran:backend
pnpm --filter playground lane:data
```

The Lane command uses Python 3 and the pinned, unchanged archive offline.
It writes `lane-data/index.json`, `lane-data/lane/{entryId}.json`, a checksum
manifest and attribution notices. `supabase/config.toml` includes these files in
the existing function bundle. Use the Docker bundler, as for morphology; a
successful server-side upload does not establish static-file inclusion.
Backend-owned tests cover the HTTP contract, actual source matches, checksum
failure and caching. Deno entry-point checks cover imports and types. Playwright
calls the real local Deno route using bundled Lane files and fixture verse data.
These checks do not establish hosted Supabase bundling or physical-device use.

Initial coverage is eight entries through three root mappings and two lemma
exceptions. See [source, licence and coverage](../../../apps/playground/data/lane/README.md).
Deploy and verify name/Allah matches, multiple mercy entries, no-match and retry
outcomes, CORS and existing content before frontend publication.
The #20 route is not part of the deployed version recorded below.

## Deployed history

Current deployment: function `quran` version 8, released on 2026-11-06 with
bundled grammar and unchanged credentials/access environment. Live HTTP checks
confirmed all 29 Al-Fatihah analyses and available/unavailable outcomes on
Al-Baqarah pages 1, 2, 13 and 15. Meanings, legacy responses and CORS checks
passed. The account still provides only the two pre-live chapters.
The complete 114-chapter corpus is bundled, but this is not live full-Quran
alignment evidence. Frontend publication uses the separate Pages workflow.

Version 7 used server-side bundling and returned temporary grammar failures
because its static assets were absent. Version 8 supersedes that deployment.

Function `quran` version 4 was deployed on 2026-10-30 with credentials configured. Live HTTP checks confirmed 2 pre-live chapters, all 7 Al-Fatihah verses, Al-Baqarah page 2 (2:21–2:40), and its final page (2:281–2:286), including Arabic text and translation 85. The resource catalogue confirmed that pre-live provides English translation 85 rather than 131; a temporary diagnostic was removed in version 4. Desktop and mobile browser checks passed against the live services with the local production build mounted at the website origin. The Pages workflow publishes the frontend integration when these changes are pushed to `main`; this backend deployment does not publish the static website.

## Verification and release

From the repository root using Node 24:

```sh
pnpm test:functions
pnpm --filter edge-functions test:coverage
pnpm --filter playground test
pnpm --filter playground typecheck
pnpm --filter playground build
pnpm --filter playground test:e2e
pnpm lint
```

The backend-owned tests in `../tests/quran/handler.test.ts` exercise this handler through its Request/Response interface with MSW upstream responses. Coverage measures the handler, not the Deno environment/server entry point. Production static-site/layout browser checks use fixture content; neither proves real provider credentials. The separate deployment smoke uses the deployed website and real service responses. After credentials are saved and the function deployed, separately verify live chapters and verses, preflight, invalid-input rejection, and generic error responses. Never print token responses or request auth headers. Verify the frontend build contains no QF credentials before publishing. Commit/push and GitHub Pages release require the repository owner's approval.

Official references: [Content quickstart](https://api-docs.quran.foundation/docs/quickstart/), [token lifecycle](https://api-docs.quran.foundation/docs/quickstart/token-management/), [Supabase secrets](https://supabase.com/docs/guides/functions/secrets), [public function authentication](https://supabase.com/docs/guides/functions/auth).
