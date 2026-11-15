import assert from "node:assert/strict";
import test from "node:test";
import { latestAttempt, verifyCurrentMain } from "./github.mjs";

const sha = "a".repeat(40);

test("reads the latest deployment status even when the attempt previously looked successful", async () => {
  const replies = new Map([
    ["deployments?environment=supabase-production&per_page=1", [{ id: 2, sha }]],
    ["deployments/1/statuses?per_page=1", [{ state: "success" }]],
    ["deployments/2/statuses?per_page=1", [{ state: "failure" }, { state: "success" }]],
  ]);
  const github = async (path) => {
    assert.ok(replies.has(path), `Unexpected GitHub request ${path}`);
    return replies.get(path);
  };
  assert.deepEqual(await latestAttempt("supabase-production", github), { sha, state: "failure" });
});

test("rejects stale commits and partial reruns before production writes", async () => {
  const github = async () => ({ object: { sha } });
  const active = { ref: "refs/heads/main", attempt: "1", sha, event: "push" };
  await verifyCurrentMain(active, github);
  await assert.rejects(verifyCurrentMain({ ...active, attempt: "2" }, github), /fresh run/);
  await assert.rejects(verifyCurrentMain({ ...active, sha: "b".repeat(40) }, github), /main has advanced/);
  await assert.rejects(verifyCurrentMain({ ...active, event: "pull_request" }, github), /fresh run/);
});
