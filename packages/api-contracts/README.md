# API contracts

`@scratch-pages/api-contracts` owns browser-safe Zod 4 schemas and inferred TypeScript types for the Supabase HTTP APIs. Both frontends and the edge handlers consume it. It contains no provider models, database access, secrets, runtime configuration, or server initialization. Source TypeScript is consumed directly; no build or code generation step is required.

Install from the repository root with `pnpm install`. Import only the relevant subpath:

```ts
import { HelloResponseSchema, type HelloResponse } from '@scratch-pages/api-contracts/hello'
import { ChaptersResponseSchema, VersesRequestSchema, VersesResponseSchema } from '@scratch-pages/api-contracts/quran'
import { ApiErrorSchema } from '@scratch-pages/api-contracts/error'
```

## Contracts

- `hello`: GET `/functions/v1/hello` returns `{ ok: true, message: string }`.
- `quran`: GET `/functions/v1/quran/v2/chapters` returns `{ chapters: Chapter[] }`. Chapter fields are `id`, `name`, `arabic`, `meaning`, `verses`, and `place` (`Meccan` or `Medinan`).
- `quran`: GET `/functions/v1/quran/v2/verses?chapter=1&page=1` returns `{ verses: [{ number, arabic, translationHtml }], translationName, nextPage }`. Chapter is 1–114; page is 1–15 and defaults to 1. A page contains 1–20 verses. `nextPage` is the next sequential page or null.
- `error`: application errors with JSON bodies use `{ error: string }` and the HTTP status. CORS rejection and preflight have empty bodies; platform-generated errors are outside this schema.

`translationHtml` is explicitly untrusted provider markup. Playground extracts inert text and removes script, style, and footnote nodes; never insert this field directly into HTML. Attribution and translation selection belong to the backend. Component display models may differ from wire DTOs.

Ordinary Zod objects accept and strip unknown response fields so additive server changes remain compatible. Do not use strict response objects. Removing fields, changing types, requiring new inputs, and expanding exhaustively handled enums require compatibility planning. Keep the legacy Quran routes available until their consumers have migrated; package versions alone do not protect existing browser builds.

## Verification and deployment

From the repository root:

```sh
pnpm test:all
pnpm typecheck:all
pnpm lint
pnpm --filter edge-functions test:coverage
pnpm --filter edge-functions check:deno # Deno 2.9.6
```

Handler tests validate real HTTP responses with MSW upstream fixtures. Frontend tests validate network responses, cancellation, and inert translation text. Deno checks exercise the actual entry-point import graphs with frozen per-function lockfiles. These checks do not prove hosted credentials or deployment bundling.

Node consumers resolve the workspace package via pnpm. Edge handlers use explicit relative `.ts` imports into this package, with `zod` mapped to the same pinned npm version in each function's `deno.json`. Deploy from the complete repository root with the Supabase CLI so the local import graph is bundled; uploading only `index.ts` and `handler.ts` is insufficient.

Quran v2 was deployed as function version 5 on 2026-10-30, with hello version 3. Live HTTP checks verified the shared-schema deployment, chapters, verse pages, attribution, legacy routes, and request restrictions. The corresponding frontend is published separately through Pages after this change is pushed. See [function release instructions](../../supabase/functions/quran/README.md). No new frontend environment variables are required.
