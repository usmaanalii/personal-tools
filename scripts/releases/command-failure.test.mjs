import assert from "node:assert/strict";
import test from "node:test";
import { commandFailure } from "./command-failure.mjs";

// CLI output can contain credentials or downloaded settings. These checks make
// sure the release record gives us a useful reason without copying that output.
test("reports a known CLI failure without exposing its raw output", () => {
  const failure = commandFailure({
    code: 1,
    stderr:
      "Error: You do not have access to the specified team\nprivate-value",
    stdout: "another-private-value",
  });
  assert.deepEqual(failure, { exitCode: 1, reason: "cli-access-denied" });
});

test("recognises the pinned CLI's structured authentication error on either output stream", () => {
  for (const stream of ["stdout", "stderr"]) {
    const failure = commandFailure({
      code: 1,
      [stream]: JSON.stringify({
        status: "error",
        reason: "login_required",
        message: "The token in VERCEL_TOKEN is not valid.",
        hint: "private-value",
      }),
    });
    assert.deepEqual(failure, {
      exitCode: 1,
      reason: "cli-authentication-rejected",
    });
  }
});

test("distinguishes CLI setup failures and safely handles unknown errors", () => {
  for (const [error, expected] of [
    [
      { code: "ENOENT", stderr: "private path" },
      { exitCode: null, reason: "executable-not-found" },
    ],
    [
      { code: 2, stderr: "Error: --token contents are invalid. private-value" },
      { exitCode: 2, reason: "invalid-token-format" },
    ],
    [
      { code: 1, stderr: "No existing credentials found. private-value" },
      { exitCode: 1, reason: "missing-cli-authentication" },
    ],
    [
      { code: 1, stderr: "Could not retrieve Project Settings. private-value" },
      { exitCode: 1, reason: "project-settings-unavailable" },
    ],
    [
      {
        code: 1,
        stderr: "Unexpected error private-value",
        stdout: "private-value",
      },
      { exitCode: 1, reason: "command-failed" },
    ],
    [{}, { exitCode: null, reason: "command-failed" }],
  ])
    assert.deepEqual(commandFailure(error), expected);
});

test("retains recognised structured CLI reasons without messages or follow-up commands", () => {
  for (const reason of [
    "forbidden",
    "not_authorized",
    "scope_not_accessible",
    "project_not_found",
    "api_error",
    "network_error",
    "classic_token_required",
  ]) {
    for (const stream of ["stdout", "stderr"]) {
      assert.deepEqual(
        commandFailure({
          code: 1,
          [stream]: `Vercel CLI 65.8.0\n${JSON.stringify({
            status: "error",
            reason,
            message: "private-value",
            hint: "private-value",
            next: [{ command: "private-value" }],
          })}`,
        }),
        { exitCode: 1, reason: `cli-${reason}` },
      );
    }
  }
});

test("does not treat arbitrary output as a trusted CLI reason", () => {
  for (const stdout of [
    JSON.stringify({ status: "error", reason: "private-value" }),
    JSON.stringify({ status: "ok", reason: "forbidden" }),
    JSON.stringify({ message: { reason: "forbidden" } }),
    'unstructured output with "reason": "forbidden"',
  ]) {
    assert.deepEqual(commandFailure({ code: 1, stdout }), {
      exitCode: 1,
      reason: "command-failed",
    });
  }
});
