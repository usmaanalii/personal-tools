import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

// Vercel uses gitignore-style rules. Check their effect on representative paths
// in an empty repository, without reading any real credential files.
test("uploads the traced public example while excluding credentials and local output", () => {
  const cwd = mkdtempSync(join(tmpdir(), "issue32-upload-"));
  const rules = fileURLToPath(new URL("../../.vercelignore", import.meta.url));
  const excluded = [
    "apps/next-vercel-supabase-app/.env",
    "apps/next-vercel-supabase-app/.env.local",
    "apps/next-vercel-supabase-app/.env.production",
    ".vercel/.env.production.local",
    "apps/next-vercel-supabase-app/.next/cache/file",
    "release-evidence/release.json",
  ];
  const example = "apps/next-vercel-supabase-app/.env.example";
  try {
    execFileSync("git", ["init", "--quiet"], { cwd });
    const ignored = execFileSync(
      "git",
      [
        "-c",
        `core.excludesFile=${rules}`,
        "check-ignore",
        "--no-index",
        "--stdin",
      ],
      {
        cwd,
        input: `${[...excluded, example].join("\n")}\n`,
        encoding: "utf8",
      },
    )
      .trim()
      .split("\n");
    assert.deepEqual(ignored, excluded);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
