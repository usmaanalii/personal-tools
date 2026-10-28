# Scratch Pages API Demo

A small React + TypeScript GitHub Pages site with a button that calls a Supabase Edge Function using `GET`.

**Live site:** [Open the Supabase API demo](https://usmaanalii.github.io/scratch-pages/)

## Supabase setup

The function lives at `supabase/functions/hello/index.ts`. The page calls the configured Supabase project's public `hello` endpoint. The project URL and publishable key live in `src/config.ts`; both values are public and intended for browser use. Never put a Supabase secret or service-role key in the page.

The `hello` function is a public demo endpoint that returns `{ "message": "Hello from Supabase!", "ok": true }`. It does not read or write private data.

## Local development

```sh
npm ci
npm run dev
```

Run the React component tests and production build with:

```sh
npm test
npm run typecheck
npm run build
```

## GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` builds the site and deploys `dist` to GitHub Pages when changes reach `main`. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**.
