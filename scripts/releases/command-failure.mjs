// Only fixed categories can leave this boundary. Raw CLI output stays private.
export function commandFailure(error) {
  // Current CLI errors can be JSON, and may use either output stream.
  const output = `${error.stderr ?? ""}\n${error.stdout ?? ""}`;
  let reason = "command-failed";
  if (error.code === "ENOENT") reason = "executable-not-found";
  else if (/--token.*contents are invalid|invalid-token-value/i.test(output))
    reason = "invalid-token-format";
  else if (/No existing credentials|not logged in/i.test(output))
    reason = "missing-cli-authentication";
  else if (
    /"reason"\s*:\s*"login_required"|The token in VERCEL_TOKEN is not valid/i.test(
      output,
    )
  )
    reason = "cli-authentication-rejected";
  else if (
    /do not have access to the specified (account|team)|scope-not-accessible/i.test(
      output,
    )
  )
    reason = "cli-access-denied";
  else if (
    /Could not retrieve Project Settings|cannot-load-project-settings/i.test(
      output,
    )
  )
    reason = "project-settings-unavailable";
  return {
    exitCode: typeof error.code === "number" ? error.code : null,
    reason,
  };
}
