# Edge Functions

This workspace owns the `hello` and `quran` backend handlers and their API-contract tests. Install dependencies from the repository root with `pnpm install`.

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

Coverage includes both `handler.ts` files and the Quran provider adapter. It excludes Deno entry points, platform authentication, deployed CORS/environment configuration and real provider credentials. A high coverage percentage does not prove those runtime boundaries. The app deployment smoke tests exercise actual deployed assets and service responses; they do not repeat every backend error case.

The existing Playground E2E workflow runs these tests independently of the frontend tests and triggers on all `supabase/functions/**` changes. The Pages build also runs the backend suite. `pnpm test:all` includes this workspace.

## Development and deployment

`hello` returns a public demo greeting for GET, answers OPTIONS, and rejects other methods. It needs no environment variables. Its browser CORS origin is `https://usmaanalii.github.io`.

`quran` requires server-only Quran Foundation credentials and an allowed browser origin list; see [Quran setup and deployment](quran/README.md). Never put provider credentials in frontend configuration or test fixtures.

Deploy each function separately from the complete repository root with the Supabase CLI, which bundles its relative imports from `packages/api-contracts`. Keep each function’s `deno.json` and `deno.lock` alongside its entry point. Uploading only individual handler files no longer includes the complete import graph. These local test/configuration changes do not deploy a function or change the public website. No database schema changes are introduced.


## Shared contracts

[`packages/api-contracts`](../../packages/api-contracts/README.md) owns public request/response schemas and inferred types. The frontend imports schemas through workspace subpaths; handlers use relative `.ts` imports for Deno. Provider schemas and mappings remain private in `quran/provider.ts`. The Next app and Playground share the same hello response schema.

Quran v2 responses are validated before transmission; legacy routes retain their previous response format for existing clients. Client response validation remains necessary across independent deployments. Application errors use the shared error schema, while preflight/CORS rejection may have no body.

The E2E workflow runs frozen Deno entry-point checks with Deno 2.9.6 as well as Node handler tests. Shared-contract changes trigger both app workflows and Pages. Deno checks establish import/type compatibility, not hosted Supabase execution; separately verify the deployed endpoints before publishing the frontend.

Release verification on 2026-10-30: Quran version 5 and hello version 3 were deployed with complete import graphs through the Supabase connector. Live checks passed for hello GET/OPTIONS/method rejection and Quran v2 content, pagination, attribution, legacy responses, CORS and invalid inputs. Provider access remains pre-live.
