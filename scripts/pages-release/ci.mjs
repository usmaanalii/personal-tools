import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { releaseBackend } from "./backend.mjs";
import { latestAttempt, verifyCurrentMain } from "./github.mjs";
import { canPublish, selectRelease } from "./policy.mjs";
import { verifyHostedBackend } from "./smoke.mjs";

const env = process.env;
const revision = {
  ref: env.GITHUB_REF, attempt: env.GITHUB_RUN_ATTEMPT, sha: env.GITHUB_SHA,
  event: env.GITHUB_EVENT_NAME,
};

async function api(url, token) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Release API request failed (HTTP ${response.status})`);
  return response.json();
}

function github(path) {
  return api(`https://api.github.com/repos/${env.GITHUB_REPOSITORY}/${path}`, env.GH_TOKEN);
}

function assertCurrent() {
  return verifyCurrentMain(revision, github);
}

function deployDiagnostic(error) {
  if (error.code === "ETIMEDOUT") return "timeout";
  if (error.code === "ENOENT") return "CLI executable unavailable";
  const stderr = error.stderr?.toString() ?? "";
  const exit = Number.isInteger(error.status) ? `, exit ${error.status}` : "";
  if (/\b(401|403|unauthori[sz]ed|forbidden)\b/i.test(stderr)) return `authorization${exit}`;
  if (/\b(docker|bundl(?:e|ing))\b/i.test(stderr)) return `bundle or Docker failure${exit}`;
  return `CLI failure${exit}`;
}

async function select() {
  await assertCurrent();
  const result = await selectRelease({
    manual: revision.event === "workflow_dispatch", forceBackend: env.FORCE_BACKEND === "true",
    revision: revision.sha,
  }, {
    latest: (environment) => latestAttempt(environment, github),
    readAt: (sha, path) => execFileSync("git", ["show", `${sha}:${path}`], { encoding: "utf8" }),
    changedSince: (base) => {
      execFileSync("git", ["merge-base", "--is-ancestor", base, revision.sha], { stdio: "ignore" });
      return execFileSync("git", ["diff", "--no-renames", "--name-only", "-z", base, revision.sha], {
        encoding: "utf8",
      }).split("\0").filter(Boolean);
    },
  });
  appendFileSync(env.GITHUB_OUTPUT, `backend=${result.backend}\npages=${result.pages}\n`);
  console.log(`Release selection: backend=${result.backend}, pages=${result.pages}`);
}

async function backend() {
  const projectRef = env.SUPABASE_PROJECT_REF;
  const publicUrl = env.VITE_SUPABASE_URL;
  const accessToken = env.SUPABASE_ACCESS_TOKEN;
  const summary = (line) => appendFileSync(env.GITHUB_STEP_SUMMARY, `${line}\n`);
  await releaseBackend({ projectRef, publicUrl, accessToken }, {
    assertCurrent: async () => {
      await assertCurrent();
      execFileSync("docker", ["info"], { stdio: "ignore" });
      summary(`### Supabase release\n\nCommit ${revision.sha}. Run ${env.GITHUB_RUN_ID}, attempt ${revision.attempt}.\n`);
    },
    version: async (slug, { requirePublic = false } = {}) => {
      const data = await api(`https://api.supabase.com/v1/projects/${projectRef}/functions/${slug}`, accessToken);
      if (data.slug !== slug || (requirePublic && (data.status !== "ACTIVE" || data.verify_jwt !== false)) ||
          !Number.isSafeInteger(data.version) || data.version < 1) {
        throw new Error(`Invalid hosted metadata for ${slug}`);
      }
      return data.version;
    },
    deploy: (slug) => {
      try {
        execFileSync("supabase", ["functions", "deploy", slug, `--remote=${projectRef}`, "--yes"], {
          stdio: ["ignore", "ignore", "pipe"], timeout: 300_000,
        });
      } catch (error) {
        throw new Error(`Supabase deploy failed for ${slug} (${deployDiagnostic(error)}). Check live versions before recovery.`);
      }
    },
    record: (slug, version) => summary(`- ${slug} version ${version}`),
    smoke: async () => {
      try {
        const checks = await verifyHostedBackend(publicUrl);
        summary(`\nHosted smoke passed\n\n${checks.map((label) => `- ${label}`).join("\n")}`);
      } catch (error) {
        summary(`\n${error.message}`);
        throw error;
      }
    },
  });
}

try {
  switch (process.argv[2]) {
    case "select":
      await select();
      break;
    case "backend":
      await backend();
      break;
    case "current":
      await assertCurrent();
      break;
    case "gate":
      if (!canPublish({
        selection: env.SELECTION_RESULT, build: env.BUILD_RESULT,
        required: env.BACKEND_REQUIRED, backend: env.BACKEND_RESULT,
      })) throw new Error("Pages publication is blocked by the release gate.");
      break;
    default:
      throw new Error("Unknown release command");
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
