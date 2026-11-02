import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

// Run the actual command-line entry point in a temporary folder. With its
// credentials removed, it must stop before contacting the deployment service
// and still leave a useful failure record. This does not test a real upload.
test("the real runner rejects missing credentials before staging and retains sanitised failure evidence", () => {
  const cwd = mkdtempSync(join(tmpdir(), "issue32-runner-"));
  const env = {
    ...process.env,
    GITHUB_SHA: "a".repeat(40),
    GITHUB_REF: "refs/heads/main",
    GITHUB_EVENT_NAME: "push",
    GITHUB_REPOSITORY: "usmaanalii/personal-tools",
    GITHUB_STEP_SUMMARY: join(cwd, "summary.md"),
  };
  // Do not let credentials from the developer's shell reach this subprocess.
  delete env.VERCEL_TOKEN;
  delete env.GH_TOKEN;
  delete env.VERCEL_AUTOMATION_BYPASS_SECRET;
  try {
    assert.throws(
      () =>
        execFileSync(
          process.execPath,
          [fileURLToPath(new URL("./run.mjs", import.meta.url)), "next"],
          { cwd, env, stdio: "pipe" },
        ),
      (error) => {
        assert.equal(error.status, 1);
        assert.match(error.stderr.toString(), /credentials/);
        return true;
      },
    );
    // An operator needs the project, commit and failed step even when setup is
    // incomplete. No deployment URL or ID should exist at this point.
    const evidence = JSON.parse(
      readFileSync(join(cwd, "release-evidence/release.json"), "utf8"),
    );
    assert.deepEqual(evidence, {
      project: "next",
      sha: env.GITHUB_SHA,
      status: "failed",
      previous: null,
      deployment: null,
      url: null,
      failedPhase: "started",
    });
  } finally {
    // Remove only this test's temporary files, including its release record.
    rmSync(cwd, { recursive: true, force: true });
  }
});
