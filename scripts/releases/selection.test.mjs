import assert from "node:assert/strict";
import test from "node:test";
import { selectProjects } from "./selection.mjs";

// These two pretend apps share a UI package. They let us check which apps need
// work without adding an unused app or provisioning another Vercel project.
// The tests cover file selection; they do not call GitHub's deployment-history API.
const projects = [
  { key: "next", affected: ["apps/next/", "packages/ui/"] },
  { key: "second", affected: ["apps/second/", "packages/ui/"] },
];

test("selects only the app whose source changed", () => {
  // Editing one app should not rebuild the other one.
  assert.deepEqual(selectProjects(projects, ["apps/next/page.tsx"]), [
    projects[0],
  ]);
});

test("selects shared consumers, ignores unrelated work, and releases all when detection is unavailable", () => {
  // Shared code and the lockfile can affect both apps. Unrelated docs affect
  // neither. null means we could not detect changes, so run both to be safe;
  // an empty list means detection worked and found nothing to do.
  assert.deepEqual(
    selectProjects(projects, ["packages/ui/button.tsx"]),
    projects,
  );
  assert.deepEqual(selectProjects(projects, ["docs/guide.md"]), []);
  assert.deepEqual(selectProjects(projects, ["pnpm-lock.yaml"]), projects);
  assert.deepEqual(selectProjects(projects, null), projects);
  assert.deepEqual(selectProjects(projects, []), []);
});
