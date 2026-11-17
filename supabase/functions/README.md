# Edge Functions

This workspace owns the `hello`, `quran` and `account-deletion` Edge Functions and their API-contract tests. Install dependencies from the repository root with `pnpm install`.

## Tests

```sh
pnpm test:functions
pnpm --filter edge-functions test:coverage
pnpm --filter edge-functions check:deno # requires Deno 2.9.6
```

Vitest runs in Node with real Web Request/Response objects. Quran Foundation OAuth/content responses are intercepted by MSW at the HTTP boundary; application handlers remain real. Unexpected outbound requests fail the suite. No hosted credentials or running Supabase project are required.

```text
hello/handler.ts              # public greeting HTTP contract
hello/index.ts                # Deno server registration
quran/handler.ts              # Quran proxy HTTP contract
quran/index.ts                # Deno environment and server registration
tests/hello/handler.test.ts   # GET, preflight, method rejection and response headers
tests/quran/handler.test.ts   # validation, tokens, retries, pagination, limits and errors
tests/setup.ts               # shared Node/MSW lifecycle only
```

Coverage includes both handlers, the Quran provider adapter and grammar enrichment, source validation and bundled-file reading. It excludes Deno entry points, platform authentication, deployed CORS/environment configuration and real provider credentials. A high coverage percentage does not prove those runtime boundaries. The app deployment smoke tests exercise actual deployed assets and service responses; they do not repeat every backend error case.

The existing Playground E2E workflow runs these tests independently of the frontend tests and triggers on all `supabase/functions/**` changes. The Pages build also runs the backend suite. `pnpm test:all` includes this workspace.

## Development and deployment

`hello` returns a public demo greeting for GET, answers OPTIONS, and rejects other methods. It needs no environment variables. Its browser CORS origin is `https://usmaanalii.github.io`.

`quran` requires server-only Quran Foundation credentials and an allowed browser origin list; see [Quran setup and deployment](quran/README.md). Never put provider credentials in frontend configuration or test fixtures.

### Account deletion

The backend for [issue #40](https://github.com/usmaanalii/personal-tools/issues/40) validates the bearer with Supabase Auth and checks the provider session in Postgres. It accepts four POST actions. `begin` sends a PKCE link to the account's confirmed email for an app callback configured on the server. `verify` consumes the code and revokes the temporary proof session. `cancel` invalidates an unclaimed intent. Only `confirm` can hard-delete an account. The service role is used only inside the Edge Function.

Deletion email requests are limited to one per account per minute. Unclaimed intents expire after ten minutes. Requesting a new link replaces the previous unclaimed intent. Confirmation requires a verified, unexpired intent from the initiating session. The database allows one active claim per account. A duplicate confirmation, cancellation after a claim, or an uncertain provider outcome returns `202`. Hard deletion removes the account's temporary intent records.

Set `ACCOUNT_DELETION_PLAYGROUND_CALLBACK` and `ACCOUNT_DELETION_NEXT_CALLBACK` as Edge Function settings for the apps being tested. Add the exact callback destinations to the Supabase Auth redirect allowlist. The function adds `deletion_intent` to the callback URL. The configured Playground callback supplies the allowed browser origin. The Next.js integration will send account commands from its server. Supabase provides the URL, anon key and service-role key to the function runtime.

Route deletion links to the deletion verifier before handling ordinary sign-in. Send the proof code and intent with the session that requested the link. When verification succeeds, show the final confirmation and preserve the existing app session. Only explicit confirmation can start deletion.

Run the HTTP tests with `pnpm --filter edge-functions test tests/account-deletion`. Run the database tests with `supabase test db` against a local Supabase stack after applying both account-deletion migrations. The database tests roll back their fixtures.

The [Playground integration](../../apps/playground/README.md#account-deletion) is available for controlled local builds. Next.js integration, reconciliation, auditing, expired-intent cleanup and hosted rollout are pending.

The [Pages release workflow](../../.github/workflows/README.md#edge-function-releases) deploys both functions from the repository root with pinned Supabase CLI 3.0.0. It checks the hosted API before Pages publication. Keep each function's `deno.json` and `deno.lock` with its entry point and retain the relative imports into `packages/api-contracts`.

For an approved manual recovery, check out the compatible revision and generate all four bundles from the repository root:

```sh
pnpm --filter playground quran:backend
pnpm --filter playground lane:data
pnpm --filter playground mufradat:data
pnpm --filter playground exec node scripts/quran-data/coverage-index.mjs ../../supabase/functions/quran/coverage-data
```

Use the Docker bundler and the explicit target with CLI 3.0.0. Deploy each named function from the complete repository root using `supabase functions deploy <function> --remote=<existing-project-ref> --yes`. Docker includes the assets declared in `supabase/config.toml`. Keep the attribution and notices from the guarded generators. Use the recovery workflow to reconcile release history after a manual deploy.


## Shared contracts

[`packages/api-contracts`](../../packages/api-contracts/README.md) owns public request/response schemas and inferred types. The frontend imports schemas through workspace subpaths; handlers use relative `.ts` imports for Deno. Provider schemas and mappings remain private in `quran/provider.ts`. The Next app and Playground share the same hello response schema.

Quran v2 responses are validated before transmission; legacy routes retain their previous response format for existing clients. Client response validation remains necessary across independent deployments. Application errors use the shared error schema, while preflight/CORS rejection may have no body.

The E2E and Pages workflows run frozen Deno entry-point checks with Deno 2.9.6 and Node handler tests. Shared-contract changes trigger both app workflows and select an Edge Function release. Hosted smoke checks public CORS, legacy and v2 contracts, representative enrichment and all four asset sets.

Release verification on 2026-10-30: Quran version 5 and hello version 3 were deployed with complete import graphs through the Supabase connector. Live checks passed for hello GET/OPTIONS/method rejection and Quran v2 content, pagination, attribution, legacy responses, CORS and invalid inputs. Provider access remains pre-live.
