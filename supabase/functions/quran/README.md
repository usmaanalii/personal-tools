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
4. Verify the live chapter catalogue contains all 114 chapters, the selected production translation (131) is available, and verses outside chapters 1 and 2 load correctly. Update the optional live browser test's pre-live expectations before using it as a production check.

The current pre-live catalogue offers English translation 85 (M.A.S. Abdel Haleem), not 131. The function therefore selects 85 in pre-live and 131 in production, and the reader displays attribution from the returned resource. Production access and content have not yet been verified. Pushing the frontend to GitHub Pages does not grant production API access; while `QF_ENV=prelive`, the deployed prototype remains limited to two chapters.

## API contract

The entry point is `index.ts`, with `handler.ts` as its only dependency. Deploy both files to the existing `scratch-pages-hello-world` project as function `quran`. This is a deliberately public reading endpoint; `verify_jwt=false` allows visitors without user sessions. Do not reuse that setting for private data endpoints. The browser sends its public `apikey` header, but the handler does not treat this public value as authentication.

- `GET /functions/v1/quran/chapters`: chapter metadata, `language=en`.
- `GET /functions/v1/quran/verses?chapter=<1–114>&page=<1–15>`: one page of up to 20 verses, Uthmani text, translation 85 (M.A.S. Abdel Haleem) in pre-live or 131 (Dr. Mustafa Khattab, The Clear Quran) in production. Page defaults to 1.
- `OPTIONS`: CORS preflight for allowed browser origins.
- Unknown routes/parameters, duplicate parameters, and out-of-range inputs return 400; other methods return 405. Disallowed or absent Origin returns 403. Missing/invalid server configuration returns 503. Upstream failures return a generic 502, or 429 for upstream throttling.

Responses are `no-store`; chapter and verse content are not cached. Access tokens remain server-side, are reused within a warm function instance, and are re-requested 30 seconds before expiry. Concurrent token acquisition shares one promise. A content 401 invalidates that token and retries once; a repeated failure is surfaced safely. Environments have separate function configurations and token state.

## Security and operational limits

Fixed HTTPS upstream hosts and two allowlisted operations prevent arbitrary URL forwarding. Secrets/tokens stay in server memory and outbound auth headers; no upstream error bodies or auth headers are returned or logged. Requests reject redirects and each upstream fetch has an 8-second timeout. The frontend validates response shapes and renders translation content as inert text rather than injecting HTML.

CORS only controls which browser origins may read responses. It does not authenticate callers: non-browser callers can supply an allowed Origin. The aggregate budget of 60 valid requests per minute **per warm function instance** bounds local work, but is not a distributed rate limit and resets when an instance restarts. Shared token requests reduce duplicate authentication only inside one instance. This does not provide global denial-of-service or quota protection. Review project usage and upstream quotas before broader public rollout; add a distributed limiter if required by observed traffic or provider limits.

No tables or database privileges are introduced. If private bookmarks or progress are added later, they need separate user authorization and RLS policies.

## Deployment status

Function `quran` version 4 was deployed on 2026-10-30 with credentials configured. Live HTTP checks confirmed 2 pre-live chapters, all 7 Al-Fatihah verses, Al-Baqarah page 2 (2:21–2:40), and its final page (2:281–2:286), including Arabic text and translation 85. The resource catalogue confirmed that pre-live provides English translation 85 rather than 131; a temporary diagnostic was removed in version 4. Desktop and mobile browser checks passed against the live services with the local production build mounted at the website origin. The Pages workflow publishes the frontend integration when these changes are pushed to `main`; this backend deployment does not publish the static website.

## Verification and release

From the repository root using Node 24:

```sh
pnpm --filter playground test
pnpm --filter playground typecheck
pnpm --filter playground build
pnpm --filter playground test:e2e
pnpm lint
```

Vitest exercises this handler through its Request/Response interface with MSW upstream responses. Browser tests use fixture content; neither proves real provider credentials. After credentials are saved and the function deployed, separately verify live chapters and verses, preflight, invalid-input rejection, and generic error responses. Never print token responses or request auth headers. Verify the frontend build contains no QF credentials before publishing. Commit/push and GitHub Pages release require the repository owner's approval.

Official references: [Content quickstart](https://api-docs.quran.foundation/docs/quickstart/), [token lifecycle](https://api-docs.quran.foundation/docs/quickstart/token-management/), [Supabase secrets](https://supabase.com/docs/guides/functions/secrets), [public function authentication](https://supabase.com/docs/guides/functions/auth).
