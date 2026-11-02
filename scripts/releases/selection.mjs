export function selectProjects(projects, paths) {
  const global = [
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "biome.json",
    ".nvmrc",
    ".npmrc",
    ".vercelignore",
  ];
  if (
    !paths ||
    paths.some(
      (path) =>
        global.includes(path) ||
        path.startsWith(".github/") ||
        path.startsWith("scripts/releases/"),
    )
  )
    return projects;
  return projects.filter((project) =>
    paths.some((path) =>
      project.affected.some((prefix) => path.startsWith(prefix)),
    ),
  );
}
