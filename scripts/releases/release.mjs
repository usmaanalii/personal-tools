// The workflow owns quality gates and a non-cancelling per-project lock.
// io contains only external platform/CLI/browser operations.
function verifyDeployment(deployment, id, project, sha) {
  if (
    deployment.id !== id ||
    deployment.projectId !== project.projectId ||
    deployment.teamId !== project.teamId ||
    deployment.target !== "production" ||
    deployment.meta?.githubCommitSha !== sha ||
    !/^[a-z0-9][a-z0-9-]*\.vercel\.app$/.test(deployment.url ?? "")
  ) {
    throw new Error(
      "Deployment identity does not match the authorised release",
    );
  }
}

export async function release(project, sha, io) {
  const settings = await io.project();
  if (
    settings.id !== project.projectId ||
    settings.accountId !== project.teamId ||
    settings.rootDirectory !== project.root ||
    settings.nodeVersion !== `${(project.node ?? "22").split(".")[0]}.x` ||
    (settings.link &&
      settings.gitProviderOptions?.createDeployments !== "disabled")
  ) {
    throw new Error("Project settings or deployment owner mismatch");
  }
  if ((await io.head()) !== sha)
    throw new Error("Stale release: main has advanced");
  const previous = await io.current();
  const id = await io.stage();
  let deployment;
  for (let attempt = 0; attempt < 60; attempt++) {
    deployment = await io.deployment(id);
    verifyDeployment(deployment, id, project, sha);
    if (deployment.readyState === "READY") break;
    if (["ERROR", "CANCELED", "BLOCKED"].includes(deployment.readyState))
      throw new Error("Deployment failed");
    if (attempt === 59) throw new Error("Deployment readiness timeout");
    await io.pause();
  }
  const url = `https://${deployment.url}`;
  await io.smoke(url);
  if ((await io.head()) !== sha)
    throw new Error("Stale release: main advanced during verification");
  if ((await io.current()) !== previous)
    throw new Error("Production changed during verification");
  const candidate = await io.deployment(id);
  verifyDeployment(candidate, id, project, sha);
  if (candidate.readyState !== "READY")
    throw new Error("Deployment is no longer ready");
  await io.promote(id);
  for (let attempt = 0; ; attempt++) {
    if ((await io.alias()) === id) break;
    if (attempt === 29)
      throw new Error("Production alias verification timeout");
    await io.pause();
  }
  await io.smoke(project.productionUrl);
  return {
    project: project.key,
    sha,
    previous,
    deployment: id,
    url,
    status: "verified",
  };
}
