import { isDeepStrictEqual } from "node:util";
import { load } from "js-yaml";

const generators = ["quran:backend", "lane:data", "mufradat:data"];
// The Node generators use Zod directly and through the shared/function sources.
// Hosted runtime dependencies are pinned separately by the function Deno locks.
const generatorWorkspaces = ["apps/playground", "packages/api-contracts", "supabase/functions"];

function manifestInputs(text) {
  const manifest = JSON.parse(text);
  const scripts = Object.fromEntries(generators.map((name) => [name, manifest.scripts?.[name]]));
  if (!Object.values(scripts).every((command) => typeof command === "string") ||
      typeof manifest.dependencies?.zod !== "string") {
    throw new Error("Unknown asset-generator manifest");
  }
  return { scripts, zod: manifest.dependencies.zod, type: manifest.type, engines: manifest.engines };
}

function lockInputs(text) {
  const { importers, packages, snapshots, ...settings } = load(text);
  if (settings.lockfileVersion !== "9.0") throw new Error("Unknown pnpm lockfile format");
  const zod = generatorWorkspaces.map((workspace) => {
    const dependency = importers?.[workspace]?.dependencies?.zod;
    const key = `zod@${dependency?.version}`;
    const resolved = packages?.[key];
    const snapshot = snapshots?.[key];
    if (!resolved || !snapshot || Object.keys(snapshot).length > 0) {
      throw new Error("Unknown Zod lockfile resolution");
    }
    return { dependency, resolved };
  });
  return { settings, zod };
}

export async function generatorInputsChanged({ base, revision, paths, readAt }) {
  const changes = await Promise.all(paths.map(async (path) => {
    const readInputs = path === "pnpm-lock.yaml" ? lockInputs : manifestInputs;
    const [before, after] = await Promise.all([readAt(base, path), readAt(revision, path)]);
    return !isDeepStrictEqual(readInputs(before), readInputs(after));
  }));
  return changes.some(Boolean);
}
