# Playground adoption

Status: implemented. Design: current `/supabase/` page; no Figma source.

- Replace only demonstrated control and repeated visual values with shared ownership. Keep the direct public Edge Function request, JSON display, status wording and local state.
- Verify idle, pending disabled state, success, failure, repeat request and malformed response with real app composition and MSW. Add a focused failing test first for any behaviour that changes; existing tests cover most paths.
- Inspect `/`, `/quran/` and `/supabase/` after CSS integration for unintended resets, focus changes and overflow. Preserve the static direct-entry route and deployment prefix.
- Keep browser E2E to direct load, refresh, navigation and one short action. Use targeted browser/manual evidence if actual focus or rendered geometry needs proving.

Build sequence: record baseline; adopt shared styles/control; run Playground tests, typecheck, build and smoke; review visual differences against the agreed contract.
