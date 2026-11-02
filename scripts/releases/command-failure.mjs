import { stripVTControlCharacters } from "node:util";

// Process errors can contain full command output. Copy only these fixed fields.
export function commandFailure(error) {
  return {
    exitCode: typeof error.code === "number" ? error.code : null,
    reason: error.code === "ENOENT" ? "executable-not-found" : "command-failed",
  };
}

// Only used for the settings command, before any application build or browser
// code runs. Keep one error message, never the CLI's full output or suggestions.
export function settingsFailureMessage(error, secrets) {
  let message;
  for (const stream of [error.stdout, error.stderr]) {
    if (typeof stream !== "string") continue;
    const output = stripVTControlCharacters(stream);
    try {
      const payload = JSON.parse(output.slice(output.indexOf("{")));
      if (payload?.status === "error" && typeof payload.message === "string")
        message = payload.message;
    } catch {
      // Plain CI errors may be a single Error: line rather than JSON.
    }
    message ??= output.split(/\r?\n/).find((line) => /^\w*Error:/i.test(line));
    if (message) break;
  }
  if (!message) return null;
  for (const secret of secrets.filter(
    (value) => typeof value === "string" && value.length,
  )) {
    for (const variant of [secret, encodeURIComponent(secret)])
      message = message.split(variant).join("[REDACTED]");
  }
  return message
    .replace(
      /-----BEGIN [\s\S]*?PRIVATE KEY-----[\s\S]*?-----END [\s\S]*?PRIVATE KEY-----/g,
      "[REDACTED]",
    )
    .replace(/\b(?:https?|postgres(?:ql)?):\/\/[^\s"'<>]+/gi, "[URL]")
    .replace(/\bBearer\s+[\w.~+/-]+/gi, "Bearer [REDACTED]")
    .replace(/\b(?:vcp_|sb_secret_|sb_publishable_)[\w-]+/g, "[REDACTED]")
    .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+\b/g, "[REDACTED]")
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[EMAIL]")
    .replace(/[\r\n]+/g, " ")
    .slice(0, 1000);
}
