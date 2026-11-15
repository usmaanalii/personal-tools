export async function verifyCurrentMain({ ref, attempt, sha, event }, github) {
  if (ref !== "refs/heads/main" || attempt !== "1" || !["push", "workflow_dispatch"].includes(event)) {
    throw new Error("Production requires a fresh run on main");
  }
  const head = await github("git/ref/heads/main");
  if (head.object?.sha !== sha) throw new Error("Stale release: main has advanced");
}

export async function latestAttempt(environment, github) {
  const [deployment] = await github(`deployments?environment=${encodeURIComponent(environment)}&per_page=1`);
  if (!deployment || !Number.isSafeInteger(deployment.id)) return null;
  const [status] = await github(`deployments/${deployment.id}/statuses?per_page=1`);
  return { sha: deployment.sha, state: status?.state };
}
