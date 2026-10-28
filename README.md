# Scratch Pages API Demo

A small GitHub Pages site with a button that calls a Supabase Edge Function using `GET`.

## Supabase setup

The function lives at `supabase/functions/hello/index.ts`. Deploy it to a Supabase project, then set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in `index.html` to that project's URL and publishable key. The key is intended for browser use; never put a Supabase secret or service-role key in this page.

The `hello` function is a public demo endpoint that returns `{ "message": "Hello from Supabase!", "ok": true }`. It does not read or write private data.

## GitHub Pages

The site publishes from the `main` branch root. Updates pushed to `main` trigger a Pages rebuild.
