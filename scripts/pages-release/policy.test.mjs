import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canPublish, needsBackendRelease, selectRelease } from "./policy.mjs";

test("Pages requires successful checks and a verified or explicitly unaffected backend", () => {
  const ready = { selection: "success", build: "success", backend: "success", required: "true" };
  assert.equal(canPublish(ready), true);
  assert.equal(canPublish({ ...ready, required: "false", backend: "skipped" }), true);
  for (const change of [
    { backend: "failure" }, { backend: "cancelled" }, { backend: "skipped" },
    { required: "" }, { selection: "failure" }, { build: "failure" },
    { required: "false", backend: "failure" },
  ]) assert.equal(canPublish({ ...ready, ...change }), false, JSON.stringify(change));
});

const verified = { sha: "a".repeat(40), state: "success" };

test("a no-op revision schedules neither production job", async () => {
  const result = await selectRelease({}, {
    latest: async () => verified, changedSince: async () => ["README.md"],
  });
  assert.deepEqual(result, { backend: false, pages: false });
});

test("controlled manual recovery can redeploy the backend at the current revision", async () => {
  const io = { latest: async () => verified, changedSince: async () => [] };
  assert.deepEqual(await selectRelease({ manual: true, forceBackend: true }, io), {
    backend: true, pages: true,
  });
  assert.deepEqual(await selectRelease({ manual: true }, io), {
    backend: false, pages: true,
  });
});

test("unusable deployment history cannot suppress required work", async () => {
  const result = await selectRelease({}, {
    latest: async (environment) => environment === "supabase-production" ? null : verified,
    changedSince: async () => { throw new Error("Missing ancestor"); },
  });
  assert.deepEqual(result, { backend: true, pages: true });
});

test("a newer failed backend attempt forces reconciliation even after a source revert", async () => {
  const result = await selectRelease({}, {
    latest: async (environment) =>
      environment === "supabase-production" ? { ...verified, state: "failure" } : verified,
    changedSince: async () => [],
  });
  assert.deepEqual(result, { backend: true, pages: false });
});

test("a frontend-only revision publishes without a backend release", async () => {
  const result = await selectRelease({}, {
    latest: async () => verified,
    changedSince: async () => ["apps/playground/src/main.tsx"],
  });
  assert.deepEqual(result, { backend: false, pages: true });
});

test("a frontend dependency bump leaves the verified Edge Functions in place", async () => {
  const revision = "b".repeat(40);
  const manifest = "apps/playground/package.json";
  const lock = "pnpm-lock.yaml";
  const oldManifest = readFileSync(manifest, "utf8");
  const oldLock = readFileSync(lock, "utf8");
  const result = await selectRelease({ revision }, {
    latest: async () => verified,
    changedSince: async () => [manifest, lock],
    readAt: (sha, path) => {
      const contents = path === manifest ? oldManifest : oldLock;
      return sha === revision ? contents.replaceAll("19.3.1", "19.3.2") : contents;
    },
  });
  assert.deepEqual(result, { backend: false, pages: true });
});

test("a changed Zod resolution selects the backend even when only the lockfile changed", async () => {
  const revision = "b".repeat(40);
  const lock = readFileSync("pnpm-lock.yaml", "utf8");
  const result = await selectRelease({ revision }, {
    latest: async () => verified,
    changedSince: async () => ["pnpm-lock.yaml"],
    readAt: (sha) => sha === revision ? lock.replaceAll("4.6.7", "4.6.8") : lock,
  });
  assert.deepEqual(result, { backend: true, pages: true });
});

test("unreadable generator dependencies require a backend release", async () => {
  const result = await selectRelease({ revision: "b".repeat(40) }, {
    latest: async () => verified,
    changedSince: async () => ["pnpm-lock.yaml"],
    readAt: () => "unknown lockfile layout",
  });
  assert.deepEqual(result, { backend: true, pages: true });
});

test("frontend and unrelated changes reuse the verified backend", () => {
  assert.equal(needsBackendRelease(["apps/playground/src/main.tsx", "README.md"]), false);
});

test("backend README and policy-test changes do not redeploy a verified bundle", () => {
  assert.equal(needsBackendRelease(["supabase/functions/quran/README.md", "scripts/pages-release/policy.test.mjs"]), false);
});

test("each shipped backend input selects a backend release", () => {
  for (const path of [
    "supabase/config.toml", "supabase/functions/quran/deno.lock",
    "supabase/functions/hello/index.ts", "packages/api-contracts/src/hello.ts",
    "apps/playground/data/quran/publication.json", "apps/playground/data/lane/source.zip",
    "apps/playground/data/mufradat/source.xml", "apps/playground/scripts/quran-data/coverage-index.mjs",
    "apps/playground/scripts/lane-data/import.py", "apps/playground/scripts/mufradat-data/import.py",
    ".github/workflows/deploy-pages.yml",
  ]) assert.equal(needsBackendRelease([path]), true, path);
});
