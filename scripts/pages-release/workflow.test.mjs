import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { load } from "js-yaml";

function releaseWorkflow() {
  return load(readFileSync(".github/workflows/deploy-pages.yml", "utf8"));
}

test("the Pages writer depends on the backend gate and new pushes leave production runs in progress", () => {
  const { jobs, concurrency } = releaseWorkflow();
  assert.equal(jobs.deploy.needs, "gate");
  assert.deepEqual(jobs.gate.needs, ["selection", "build", "backend"]);
  assert.deepEqual(jobs.backend.needs, ["selection", "build"]);
  assert.equal(concurrency["cancel-in-progress"], false);
});

test("selecting a backend release enables the production backend job", () => {
  const { jobs } = releaseWorkflow();
  // This production expression is a wiring contract. GitHub evaluates it on the runner.
  assert.equal(jobs.backend.if.replace(/\s+/g, " ").trim(),
    "github.ref == 'refs/heads/main' && github.run_attempt == 1 && needs.selection.outputs.backend == 'true'");
  assert.notEqual(jobs.backend["continue-on-error"], true);
  const deployAndSmoke = jobs.backend.steps.find((step) => step.run === "node scripts/pages-release/ci.mjs backend");
  assert.ok(deployAndSmoke);
  assert.notEqual(deployAndSmoke["continue-on-error"], true);
});

test("the production command cannot succeed without Supabase credentials", () => {
  const result = spawnSync(process.execPath, ["scripts/pages-release/ci.mjs", "backend"], {
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: "", SUPABASE_PROJECT_REF: "", VITE_SUPABASE_URL: "" },
    encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Invalid Supabase deployment credentials or target/);
});

function runBackend(t, {
  deployScript = 'printf "%s\\n" "$3" >> "$DEPLOYED"',
  quranJwtAfterDeploy = false,
} = {}) {
  const cwd = mkdtempSync(join(tmpdir(), "pages-release-"));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const deployed = join(cwd, "deployed");
  const summary = join(cwd, "summary");
  const project = "abcdefghijklmnopqrst";
  const sha = "a".repeat(40);
  writeFileSync(deployed, "");
  writeFileSync(join(cwd, "docker"), "#!/bin/sh\nexit 0\n", { mode: 0o700 });
  writeFileSync(join(cwd, "supabase"), `#!/bin/sh\n${deployScript}\n`, { mode: 0o700 });
  const result = spawnSync(process.execPath, ["--input-type=module", "--eval", `
    import { readFileSync } from "node:fs";
    import { http, HttpResponse } from "msw";
    import { setupServer } from "msw/node";
    const server = setupServer(
      http.get("https://api.github.com/repos/example/site/git/ref/heads/main", () =>
        HttpResponse.json({ object: { sha: "${sha}" } })),
      http.get("https://api.supabase.com/v1/projects/${project}/functions/:slug", ({ params }) => {
        const { slug } = params;
        const updated = readFileSync(process.env.DEPLOYED, "utf8").split("\\n").includes(slug);
        return HttpResponse.json({
          slug, status: updated || slug === "hello" ? "ACTIVE" : "THROTTLED",
          verify_jwt: slug === "quran" && (!updated || ${quranJwtAfterDeploy}), version: updated ? 17 : 16,
        });
      }),
      http.get("https://${project}.supabase.co/functions/v1/hello", () =>
        HttpResponse.json({}, { status: 503 })),
    );
    server.listen({ onUnhandledRequest: "error" });
    process.argv[2] = "backend";
    try { await import("./scripts/pages-release/ci.mjs"); }
    finally { server.close(); }
  `], {
    env: {
      PATH: `${cwd}:${process.env.PATH}`,
      DEPLOYED: deployed, GITHUB_STEP_SUMMARY: summary,
      GITHUB_REF: "refs/heads/main", GITHUB_RUN_ATTEMPT: "1",
      GITHUB_EVENT_NAME: "workflow_dispatch", GITHUB_SHA: sha, GITHUB_RUN_ID: "42",
      GITHUB_REPOSITORY: "example/site", GH_TOKEN: "fixture-github-token",
      SUPABASE_PROJECT_REF: project, VITE_SUPABASE_URL: `https://${project}.supabase.co`,
      SUPABASE_ACCESS_TOKEN: "fixture-supabase-token",
    },
    encoding: "utf8",
  });
  return { result, deployed, summary };
}

test("forced recovery replaces unhealthy hosted functions and verifies the new versions", (t) => {
  const { result, deployed, summary } = runBackend(t);
  assert.equal(readFileSync(deployed, "utf8"), "hello\nquran\n", result.stderr);
  assert.match(readFileSync(summary, "utf8"), /hello version 17\n- quran version 17/);
  assert.match(result.stderr, /Hosted smoke failed: Hello greeting/);
  assert.equal(result.status, 1);
});

test("deployment failures report a safe category without echoing CLI credentials", (t) => {
  const { result, deployed } = runBackend(t, {
    deployScript: 'printf "HTTP 403: %s\\n" "$SUPABASE_ACCESS_TOKEN" >&2; exit 1',
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /hello.*authorization.*exit 1/);
  assert.doesNotMatch(result.stdout + result.stderr, /fixture-supabase-token/);
  assert.equal(readFileSync(deployed, "utf8"), "");
});

test("recovery fails when the new Quran version still requires JWT verification", (t) => {
  const { result, deployed, summary } = runBackend(t, { quranJwtAfterDeploy: true });
  assert.equal(readFileSync(deployed, "utf8"), "hello\nquran\n");
  assert.match(readFileSync(summary, "utf8"), /hello version 17/);
  assert.doesNotMatch(readFileSync(summary, "utf8"), /quran version|Hosted smoke passed/);
  assert.match(result.stderr, /Invalid hosted metadata for quran/);
  assert.equal(result.status, 1);
});

function runPagesGate(backendResult) {
  const { jobs } = releaseWorkflow();
  const step = jobs.gate.steps.find(({ run }) => run?.endsWith("ci.mjs gate"));
  const needs = {
    selection: { result: "success", outputs: { backend: "true", pages: "true" } },
    build: { result: "success" },
    backend: { result: backendResult },
  };
  const env = Object.fromEntries(Object.entries(step.env).map(([key, expression]) => {
    const match = /^[$]\{\{\s*needs\.([\w.]+)\s*\}\}$/.exec(expression);
    const value = match ? match[1].split(".").reduce((context, segment) => context?.[segment], needs) : expression;
    assert.equal(typeof value, "string", `Unresolved gate input ${key}`);
    return [key, value];
  }));
  return spawnSync(step.run, { shell: true, env: { PATH: process.env.PATH, ...env }, encoding: "utf8" });
}

test("the workflow blocks Pages when backend smoke failed", () => {
  const blocked = runPagesGate("failure");
  assert.match(blocked.stderr, /Pages publication is blocked/);
  assert.equal(blocked.status, 1);
  assert.equal(runPagesGate("success").status, 0);
});
