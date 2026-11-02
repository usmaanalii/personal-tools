import assert from "node:assert/strict";
import test from "node:test";
import { deploymentOutput } from "./deployment-output.mjs";

// --non-interactive returns an envelope, including when --no-wait leaves the
// deployment queued. Only its identity may reach the metadata verification step.
test("reads the pinned CLI's non-interactive deployment result", () => {
  assert.deepEqual(
    deploymentOutput(
      JSON.stringify({
        status: "ok",
        deployment: {
          id: "dpl_candidate",
          url: "https://next-candidate.vercel.app",
          target: "production",
          readyState: "QUEUED",
        },
        next: [{ command: "untrusted suggested command" }],
      }),
    ),
    { id: "dpl_candidate", url: "https://next-candidate.vercel.app" },
  );
});

test("rejects failed, preview, malformed and foreign-origin CLI results", () => {
  const candidate = {
    id: "dpl_candidate",
    url: "https://next-candidate.vercel.app",
    target: "production",
  };
  for (const output of [
    "not JSON",
    JSON.stringify(null),
    JSON.stringify({ status: "error", deployment: candidate }),
    JSON.stringify({
      status: "ok",
      deployment: { ...candidate, target: "preview" },
    }),
    JSON.stringify({
      status: "ok",
      deployment: { ...candidate, id: "../foreign" },
    }),
    ...[
      "http://next.vercel.app",
      "https://next.vercel.app.evil.test",
      "https://next.vercel.app/path",
      "https://user:password@next.vercel.app",
    ].map((url) =>
      JSON.stringify({ status: "ok", deployment: { ...candidate, url } }),
    ),
  ])
    assert.throws(() => deploymentOutput(output), /Invalid deployment result/);
});
