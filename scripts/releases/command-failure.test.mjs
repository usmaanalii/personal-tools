import assert from "node:assert/strict";
import test from "node:test";
import { commandFailure, settingsFailureMessage } from "./command-failure.mjs";

// Keep process failure details separate from CLI output. Only the settings
// command can add an error message, after it has passed through redaction.
test("records command failure without classifying or copying private output", () => {
  for (const error of [
    {
      code: 1,
      stderr:
        "Error: You do not have access to the specified team private-value",
    },
    {
      code: 1,
      stdout: JSON.stringify({
        status: "error",
        reason: "forbidden",
        message: "private-value",
        hint: "private-hint",
      }),
    },
  ])
    assert.deepEqual(commandFailure(error), {
      exitCode: 1,
      reason: "command-failed",
    });
});

test("identifies a missing executable and preserves nonzero exit codes", () => {
  assert.deepEqual(commandFailure({ code: "ENOENT", stderr: "private path" }), {
    exitCode: null,
    reason: "executable-not-found",
  });
  assert.deepEqual(commandFailure({ code: 2, stdout: "private-value" }), {
    exitCode: 2,
    reason: "command-failed",
  });
  assert.deepEqual(commandFailure({}), {
    exitCode: null,
    reason: "command-failed",
  });
});

test("keeps the settings error while redacting credentials and discarding CLI hints", () => {
  assert.equal(
    settingsFailureMessage(
      {
        stdout: JSON.stringify({
          status: "error",
          message:
            "Request rejected for fake-token at https://example.test/?secret=unknown",
          hint: "private-hint",
        }),
      },
      ["fake-token"],
    ),
    "Request rejected for [REDACTED] at [URL]",
  );
  assert.equal(
    settingsFailureMessage(
      {
        stderr:
          "Vercel CLI 65.8.0\nError: Cannot access project with Bearer unknown-token\nprivate-next-line",
      },
      [],
    ),
    "Error: Cannot access project with Bearer [REDACTED]",
  );
  assert.equal(
    settingsFailureMessage({ stdout: "private arbitrary output" }, []),
    null,
  );
});
