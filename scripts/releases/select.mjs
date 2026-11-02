import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { projects } from "./config.mjs";
import { selectProjects } from "./selection.mjs";

const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
const sha = process.env.GITHUB_SHA;
const repository = process.env.GITHUB_REPOSITORY;
if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || !/^[a-f0-9]{40}$/.test(sha))
  throw new Error("Invalid repository or commit");

async function github(path) {
  const response = await fetch(
    `https://api.github.com/repos/${repository}/${path}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GH_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) throw new Error("Change baseline lookup failed");
  return response.json();
}

// Use each project's last successful environment deployment, rather than just
// push.before: failed, superseded and skipped runs must not lose pending changes.
async function baseline(config) {
  if (process.env.GITHUB_EVENT_NAME === "pull_request")
    return event.pull_request.base.sha;
  if (process.env.GITHUB_EVENT_NAME !== "push") return null;
  const deployments = await github(
    `deployments?environment=${encodeURIComponent(config.environment)}&per_page=30`,
  );
  for (const deployment of deployments) {
    const statuses = await github(
      `deployments/${deployment.id}/statuses?per_page=100`,
    );
    if (statuses.some((status) => status.state === "success"))
      return deployment.sha;
  }
  return null;
}

const selected = [];
for (const config of projects()) {
  let paths = null;
  try {
    const base = await baseline(config);
    if (base && /^[a-f0-9]{40}$/.test(base)) {
      const output = execFileSync(
        "git",
        ["diff", "--name-only", "-z", base, sha],
        { encoding: "utf8" },
      );
      paths = output.split("\0").filter(Boolean);
    }
  } catch {
    console.error(
      `Change detection unavailable for ${config.key}; running all its checks and release gates.`,
    );
  }
  if (selectProjects([config], paths).length)
    selected.push({
      key: config.key,
      environment: config.environment,
      node: config.node,
    });
}
appendFileSync(
  process.env.GITHUB_OUTPUT,
  `matrix=${JSON.stringify({ include: selected })}\nany=${selected.length > 0}\n`,
);
