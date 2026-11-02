export function deploymentOutput(output) {
  let result;
  try {
    result = JSON.parse(output);
  } catch {
    throw new Error("Invalid deployment result returned by CLI");
  }
  const candidate = result?.deployment;
  if (
    result?.status !== "ok" ||
    candidate?.target !== "production" ||
    !/^dpl_[\w]+$/.test(candidate?.id ?? "") ||
    !/^https:\/\/[a-z0-9][a-z0-9-]*\.vercel\.app$/.test(candidate?.url ?? "")
  )
    throw new Error("Invalid deployment result returned by CLI");
  return { id: candidate.id, url: candidate.url };
}
