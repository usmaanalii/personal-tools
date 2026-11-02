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

// Plain CI does not automatically enable the CLI's structured error mode.
// Exercise the real runner with fake platform responses and a CLI substitute;
// no token, network request, downloaded environment or deployment is involved.
test("the real runner requests structured CLI failures and keeps raw diagnostics private", () => {
  const cwd = mkdtempSync(join(tmpdir(), "issue32-cli-error-"));
  const runner = new URL("./run.mjs", import.meta.url).href;
  const config = new URL("./config.mjs", import.meta.url).href;
  const worker = `
    import childProcess from 'node:child_process';
    import { syncBuiltinESMExports } from 'node:module';
    import { project } from ${JSON.stringify(config)};
    const configured = project('next');
    globalThis.fetch = async (url) => {
      const path = new URL(url).pathname;
      let data;
      if (path.startsWith('/v9/projects/')) data = {
        id: configured.projectId, accountId: configured.teamId,
        rootDirectory: configured.root, nodeVersion: '22.x', link: null,
      };
      else if (path.endsWith('/git/ref/heads/main')) data = { object: { sha: process.env.GITHUB_SHA } };
      else if (path.startsWith('/v4/aliases/')) data = {
        projectId: configured.projectId,
        alias: new URL(configured.productionUrl).hostname,
        deploymentId: 'dpl_previous',
      };
      else throw new Error('Unexpected test API request');
      return { ok: true, json: async () => data };
    };
    childProcess.execFile = (file, args, options, callback) => {
      const error = Object.assign(new Error('CLI failed'), { code: 1 });
      const stdout = args.includes('--non-interactive')
        ? JSON.stringify({ status: 'error', reason: 'forbidden', message: 'Rejected credential fake-token', hint: 'private-value' })
        : '';
      const stderr = 'Unstructured CLI error: private-value';
      Object.assign(error, { stdout, stderr });
      callback(error, stdout, stderr);
    };
    syncBuiltinESMExports();
    process.argv[2] = 'next';
    await import(${JSON.stringify(runner)});
  `;
  try {
    assert.throws(
      () =>
        execFileSync(
          process.execPath,
          ["--input-type=module", "--eval", worker],
          {
            cwd,
            stdio: "pipe",
            env: {
              ...process.env,
              GITHUB_SHA: "a".repeat(40),
              GITHUB_REF: "refs/heads/main",
              GITHUB_EVENT_NAME: "push",
              GITHUB_REPOSITORY: "usmaanalii/personal-tools",
              VERCEL_TOKEN: "fake-token",
              GH_TOKEN: "fake-token",
              VERCEL_AUTOMATION_BYPASS_SECRET: "fake-bypass",
              GITHUB_STEP_SUMMARY: "",
            },
          },
        ),
      (error) => {
        assert.equal(error.status, 1);
        assert.doesNotMatch(`${error.stdout}${error.stderr}`, /private-value/);
        return true;
      },
    );
    const evidence = JSON.parse(
      readFileSync(join(cwd, "release-evidence/release.json"), "utf8"),
    );
    assert.equal(evidence.failedPhase, "pulling-settings");
    assert.deepEqual(evidence.commandFailure, {
      exitCode: 1,
      reason: "command-failed",
      message: "Rejected credential [REDACTED]",
    });
    assert.doesNotMatch(
      JSON.stringify(evidence),
      /private-value|fake-token|fake-bypass/,
    );
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
