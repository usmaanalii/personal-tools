import { execFile } from "node:child_process";
import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { promisify } from "node:util";
import { setTimeout } from "node:timers/promises";
import { project } from "./config.mjs";
import { release } from "./release.mjs";
import { commandFailure, settingsFailureMessage } from "./command-failure.mjs";

const exec = promisify(execFile);
const config = project(process.argv[2]);
const sha = process.env.GITHUB_SHA;
if (
  process.env.GITHUB_REF !== "refs/heads/main" ||
  !["push", "workflow_dispatch"].includes(process.env.GITHUB_EVENT_NAME) ||
  !/^[a-f0-9]{40}$/.test(sha ?? "") ||
  !/^[\w.-]+\/[\w.-]+$/.test(process.env.GITHUB_REPOSITORY ?? "")
) {
  throw new Error("Releases require an exact main-branch push or dispatch");
}
const baseEnv = {
  ...process.env,
  VERCEL_ORG_ID: config.teamId,
  VERCEL_PROJECT_ID: config.projectId,
  CI: "1",
};
const cli = ["vercel", "--non-interactive", "--scope", config.teamId];
const record = {
  project: config.key,
  sha,
  status: "started",
  previous: null,
  deployment: null,
  url: null,
};
mkdirSync("release-evidence", { recursive: true });
function save() {
  writeFileSync(
    "release-evidence/release.json",
    `${JSON.stringify(record, null, 2)}\n`,
  );
  console.log(`Release ${config.key} ${sha}: ${record.status}`);
}
save();

async function api(path, { github = false } = {}) {
  const origin = github ? "https://api.github.com" : "https://api.vercel.com";
  const url = new URL(path, origin);
  if (url.origin !== origin) throw new Error("Unexpected API origin");
  if (!github) url.searchParams.set("teamId", config.teamId);
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${github ? process.env.GH_TOKEN : process.env.VERCEL_TOKEN}`,
      Accept: "application/json",
    },
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok)
    throw new Error(`Platform metadata request failed (${response.status})`);
  return response.json();
}

async function command(
  args,
  { authenticated = false, bypass = false, extra = {} } = {},
) {
  const env = { ...baseEnv, ...extra };
  delete env.GH_TOKEN;
  delete env.GITHUB_TOKEN;
  if (!authenticated) delete env.VERCEL_TOKEN;
  if (!bypass) delete env.VERCEL_AUTOMATION_BYPASS_SECRET;
  try {
    return (
      await exec(args[0], args.slice(1), {
        env,
        timeout: 900_000,
        maxBuffer: 30 * 1024 * 1024,
      })
    ).stdout.trim();
  } catch (error) {
    // CLI output and browser diagnostics can contain environment values/cookies.
    // Keep raw output private. Only settings errors get a redacted message.
    record.commandFailure = commandFailure(error);
    if (record.status === "pulling-settings") {
      const secrets = Object.entries(baseEnv)
        .filter(([name]) => /TOKEN|SECRET|PASSWORD|KEY|AUTH/i.test(name))
        .map(([, value]) => value);
      const message = settingsFailureMessage(error, secrets);
      if (message) record.commandFailure.message = message;
    }
    throw new Error(
      `Release command failed in phase ${record.status}: ${record.commandFailure.reason}`,
    );
  }
}

async function alias() {
  const data = await api(
    `/v4/aliases/${new URL(config.productionUrl).hostname}`,
  );
  if (
    data.projectId !== config.projectId ||
    data.alias !== new URL(config.productionUrl).hostname ||
    !/^dpl_[\w]+$/.test(data.deploymentId)
  ) {
    throw new Error("Production alias identity mismatch");
  }
  return data.deploymentId;
}

try {
  if (
    !process.env.VERCEL_TOKEN ||
    !process.env.GH_TOKEN ||
    (config.requiresProtectionBypass &&
      !process.env.VERCEL_AUTOMATION_BYPASS_SECRET)
  ) {
    throw new Error(
      "Release credentials or project protection bypass are not configured",
    );
  }
  const result = await release(config, sha, {
    project: () => api(`/v9/projects/${config.projectId}`),
    head: async () =>
      (
        await api(
          `/repos/${process.env.GITHUB_REPOSITORY}/git/ref/heads/main`,
          { github: true },
        )
      ).object.sha,
    current: alias,
    stage: async () => {
      record.previous = await alias();
      record.status = "pulling-settings";
      save();
      await command([...cli, "pull", "--yes", "--environment=production"], {
        authenticated: true,
      });
      const linked = JSON.parse(readFileSync(".vercel/project.json", "utf8"));
      if (
        linked.projectId !== config.projectId ||
        linked.orgId !== config.teamId
      )
        throw new Error("Pulled project identity mismatch");
      record.status = "building";
      save();
      await command([...cli, "build", "--prod"]);
      record.status = "staging";
      save();
      const output = await command(
        [
          ...cli,
          "deploy",
          "--prebuilt",
          "--prod",
          "--skip-domain",
          "--yes",
          "--no-wait",
          "--meta",
          `githubCommitSha=${sha}`,
          "--meta",
          "githubCommitRef=main",
        ],
        { authenticated: true },
      );
      if (!/^https:\/\/[a-z0-9][a-z0-9-]*\.vercel\.app$/.test(output))
        throw new Error("Invalid deployment origin returned by CLI");
      const data = await api(`/v13/deployments/${new URL(output).hostname}`);
      record.deployment = data.id;
      // Do not publish unverified metadata in the evidence.
      record.status = "waiting";
      save();
      return data.id;
    },
    deployment: async (id) => {
      if (!/^dpl_[\w]+$/.test(id)) throw new Error("Invalid deployment ID");
      const data = await api(`/v13/deployments/${id}`);
      return { ...data, teamId: data.ownerId };
    },
    smoke: async (url) => {
      const production = url === config.productionUrl;
      record.url = production ? record.url : url;
      record.status = production ? "verifying-production" : "verifying-staged";
      save();
      await command(config.verify, {
        bypass: !production,
        extra: {
          PLAYWRIGHT_BASE_URL: url,
          VERCEL_VERIFIED_ORIGIN: production ? "" : url,
          RELEASE_SMOKE: "1",
        },
      });
    },
    promote: async (id) => {
      record.status = "promoting";
      save();
      await command([...cli, "promote", id, "--yes", "--timeout", "5m"], {
        authenticated: true,
      });
      record.status = "published";
      save();
    },
    alias,
    pause: () => setTimeout(10_000),
  });
  Object.assign(record, result);
} catch (error) {
  record.failedPhase = record.status;
  record.status = "failed";
  console.error(error instanceof Error ? error.message : "Release failed");
  process.exitCode = 1;
} finally {
  save();
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `\nRelease evidence:\n\n\`\`\`json\n${JSON.stringify(record, null, 2)}\n\`\`\`\n`,
    );
}
