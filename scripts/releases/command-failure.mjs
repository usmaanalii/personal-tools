// These are fixed reason codes from the pinned CLI's non-interactive errors.
// Never copy an arbitrary reason, message, hint or suggested command into logs.
const cliReasons = new Set([
  "login_required",
  "forbidden",
  "not_authorized",
  "permission_denied",
  "payment_required",
  "rate_limited",
  "network_error",
  "api_error",
  "missing_scope",
  "scope_not_accessible",
  "project_settings_required",
  "not_linked",
  "not_found",
  "project_not_found",
  "invalid_arguments",
  "invalid_configuration",
  "classic_token_required",
  "token_user_scope_required",
  "missing_arguments",
  "confirmation_required",
  "interactive_confirmation_required",
]);

function structuredReason(error) {
  for (const stream of [error.stdout, error.stderr]) {
    if (typeof stream !== "string") continue;
    // stderr can contain the CLI version banner before the JSON object.
    const start = stream.indexOf("{");
    if (start < 0) continue;
    try {
      const payload = JSON.parse(stream.slice(start));
      if (payload?.status === "error" && cliReasons.has(payload.reason))
        return payload.reason === "login_required"
          ? "cli-authentication-rejected"
          : `cli-${payload.reason}`;
    } catch {
      // Unstructured output is handled by the fixed legacy categories below.
    }
  }
}

// Only fixed categories can leave this boundary. Raw CLI output stays private.
export function commandFailure(error) {
  // Current CLI errors can be JSON, and may use either output stream.
  const output = `${error.stderr ?? ""}\n${error.stdout ?? ""}`;
  const structured = structuredReason(error);
  let reason = "command-failed";
  if (error.code === "ENOENT") reason = "executable-not-found";
  else if (structured) reason = structured;
  else if (/--token.*contents are invalid|invalid-token-value/i.test(output))
    reason = "invalid-token-format";
  else if (/No existing credentials|not logged in/i.test(output))
    reason = "missing-cli-authentication";
  else if (/The token in VERCEL_TOKEN is not valid/i.test(output))
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
