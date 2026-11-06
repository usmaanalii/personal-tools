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

[
  { name: "selects both apps when their shared package changes", changed: ["packages/ui/button.tsx"], expected: projects },
  { name: "selects no apps for unrelated documentation", changed: ["docs/guide.md"], expected: [] },
  { name: "selects every app when the lockfile changes", changed: ["pnpm-lock.yaml"], expected: projects },
  { name: "selects every app when change detection is unavailable", changed: null, expected: projects },
  { name: "selects no apps when no files changed", changed: [], expected: [] },
].forEach(({ name, changed, expected }) => {
  test(name, () => {
    assert.deepEqual(selectProjects(projects, changed), expected);
  });
});
