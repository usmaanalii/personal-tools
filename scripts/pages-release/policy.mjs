const workspaceInputs = [
  "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", ".npmrc", ".nvmrc",
  ".github/workflows/deploy-pages.yml",
];
const backendInputs = [
  "supabase/functions/hello/", "supabase/functions/quran/", "packages/api-contracts/",
  "apps/playground/data/", "apps/playground/scripts/", "scripts/pages-release/",
];
const generatorDependencyPaths = ["pnpm-lock.yaml", "apps/playground/package.json"];

export function canPublish({ selection, build, backend, required }) {
  return selection === "success" && build === "success" &&
    ((required === "true" && backend === "success") ||
      (required === "false" && backend === "skipped"));
}

export function needsBackendRelease(paths) {
  return paths.some((path) =>
    path === "supabase/config.toml" ||
    (workspaceInputs.includes(path) && path !== "pnpm-lock.yaml") ||
    (backendInputs.some((prefix) => path.startsWith(prefix)) &&
      !path.endsWith("/README.md") && !path.endsWith(".test.mjs")),
  );
}

async function changedSinceVerified(environment, io) {
  try {
    const attempt = await io.latest(environment);
    if (attempt?.state === "success" && /^[a-f0-9]{40}$/.test(attempt.sha)) {
      return { base: attempt.sha, paths: await io.changedSince(attempt.sha) };
    }
  } catch {
    // A missing or untrusted baseline must select the release.
  }
  return null;
}

async function selectBackend(changes, revision, io) {
  if (!changes || needsBackendRelease(changes.paths)) return true;
  const paths = changes.paths.filter((path) => generatorDependencyPaths.includes(path));
  if (!paths.length) return false;
  try {
    const { generatorInputsChanged } = await import("./dependency-inputs.mjs");
    return await generatorInputsChanged({ base: changes.base, revision, paths, readAt: io.readAt });
  } catch {
    // If the asset-generator inputs cannot be compared, verify and deploy.
    return true;
  }
}

export async function selectRelease({ manual, forceBackend, revision }, io) {
  const [backend, pages] = await Promise.all([
    changedSinceVerified("supabase-production", io),
    changedSinceVerified("github-pages", io),
  ]);
  return {
    backend: Boolean(manual && forceBackend) || await selectBackend(backend, revision, io),
    pages: Boolean(manual) || pages === null || pages.paths.some((path) =>
      workspaceInputs.includes(path) ||
      ["apps/playground/", "packages/api-contracts/", "packages/design-tokens/", "packages/ui/"]
        .some((prefix) => path.startsWith(prefix)),
    ),
  };
}
