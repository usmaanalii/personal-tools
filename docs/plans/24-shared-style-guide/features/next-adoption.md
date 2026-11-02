# Next adoption

Status: implemented. Design: current `/` page; no Figma source.

- Adopt the shared light default, control and token contract in the connection page while leaving page composition in the Server Component and interaction in `ConnectionCheck`. The current dark page changes appearance.
- Keep `/api/supabase`, uncached fetch, server-only environment variables, safe failure responses and client-local retry state.
- Existing page integration tests cover success, error/retry, Enter and disabled loading. Add RED tests only for newly changed behaviour; preserve API coverage gates.
- Verify long greeting/error content, keyboard focus, reduced motion and mobile fit in rendered output. Keep the E2E journey short and distinct from Vitest states.

Build sequence: record baseline; adopt shared styles/control; run Next `check`, independent build and production browser smoke; review visual differences against the agreed contract.
