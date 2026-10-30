# Edge Functions

This workspace owns the `hello` and `quran` backend handlers and their API-contract tests. Install dependencies from the repository root with `pnpm install`.

## Tests

```sh
pnpm test:functions
pnpm --filter edge-functions test:coverage
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

Coverage includes both `handler.ts` files. It excludes Deno entry points, platform authentication, deployed CORS/environment configuration and real provider credentials. A high coverage percentage does not prove those runtime boundaries. The app deployment smoke tests exercise actual deployed assets and service responses; they do not repeat every backend error case.

The existing Playground E2E workflow runs these tests independently of the frontend tests and triggers on all `supabase/functions/**` changes. The Pages build also runs the backend suite. `pnpm test:all` includes this workspace.

## Development and deployment

`hello` returns a public demo greeting for GET, answers OPTIONS, and rejects other methods. It needs no environment variables. Its browser CORS origin is `https://usmaanalii.github.io`.

`quran` requires server-only Quran Foundation credentials and an allowed browser origin list; see [Quran setup and deployment](quran/README.md). Never put provider credentials in frontend configuration or test fixtures.

Deploy each function directory separately through Supabase; this workspace provides tests, not a deployment script. These local test/configuration changes do not deploy a function or change the public website. No database schema changes are introduced.
