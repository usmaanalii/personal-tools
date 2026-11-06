import assert from "node:assert/strict";
import test from "node:test";
import { release } from "./release.mjs";

// These tests walk through the release rules without deploying anything.
// The platform below stands in for Vercel, GitHub and the browser commands.
// Passing here tells us the release makes the right decisions. The first real
// CI release still needs to prove that the credentials and Vercel calls work.
const sha = "a".repeat(40);
const project = {
  key: "next",
  teamId: "team_test",
  projectId: "prj_test",
  root: "apps/next",
  productionUrl: "https://next.vercel.app",
};
function platform(overrides = {}, configured = project) {
  // Keep a short record of uploads, browser checks and promotions. That lets us
  // check whether the public site would have changed, and in what order.
  const evidence = [];
  const deployment = {
    id: "dpl_new",
    url: "next-unique.vercel.app",
    projectId: configured.projectId,
    teamId: configured.teamId,
    target: "production",
    readyState: "READY",
    meta: { githubCommitSha: sha },
  };
  return {
    evidence,
    async project() {
      return {
        id: configured.projectId,
        accountId: configured.teamId,
        rootDirectory: configured.root,
        nodeVersion: configured.node
          ? `${configured.node.split(".")[0]}.x`
          : "22.x",
        link: null,
      };
    },
    async head() {
      return sha;
    },
    async current() {
      return "dpl_previous";
    },
    async stage() {
      evidence.push("staged");
      return deployment.id;
    },
    async deployment() {
      return deployment;
    },
    async smoke(url) {
      evidence.push(`smoke:${url}`);
    },
    async promote(id) {
      evidence.push(`promoted:${id}`);
    },
    async alias() {
      return deployment.id;
    },
    // Move straight to the next poll so timeout tests do not wait in real time.
    async pause() {},
    ...overrides,
  };
}

test("verifies a staged production build before promotion and verifies the public alias afterwards", async () => {
  // Visitors should see the new build only after its own URL passes the tests.
  // We then check the public URL too, and keep the old ID for possible recovery.
  const io = platform();
  const result = await release(project, sha, io);
  assert.equal(result.status, "verified");
  assert.equal(result.previous, "dpl_previous");
  assert.equal(result.deployment, "dpl_new");
  assert.deepEqual(io.evidence, [
    "staged",
    "smoke:https://next-unique.vercel.app",
    "promoted:dpl_new",
    "smoke:https://next.vercel.app",
  ]);
});

test("rejects foreign, untested, preview, or malformed deployments before browser credentials or promotion", async () => {
  // A URL alone is not enough to trust a deployment. Each case changes one
  // detail that must match before we send browser credentials or publish it.
  for (const patch of [
    { projectId: "prj_other" },
    { teamId: "team_other" },
    { target: "preview" },
    { meta: {} },
    { meta: { githubCommitSha: "b".repeat(40) } },
    { url: "evil.example" },
    { url: "next.vercel.app@evil.example" },
    { url: "next.vercel.app/path" },
    { id: "dpl_other" },
  ]) {
    const io = platform();
    const original = await io.deployment();
    io.deployment = async () => ({ ...original, ...patch });
    await assert.rejects(release(project, sha, io), /deployment/i);
    assert.deepEqual(io.evidence, ["staged"]);
  }
});

test("refuses a changed project, competing deployment owner, or stale commit before staging", async () => {
  // Catch setup mistakes and outdated runs before paying for a build or upload.
  // An active Git integration could publish independently, bypassing our tests.
  for (const changes of [
    { head: async () => "b".repeat(40) },
    { project: async () => ({ id: "wrong" }) },
    {
      project: async () => ({
        id: project.projectId,
        accountId: project.teamId,
        rootDirectory: project.root,
        nodeVersion: "22.x",
        link: { type: "github" },
      }),
    },
  ]) {
    const io = platform(changes);
    await assert.rejects(release(project, sha, io));
    assert.deepEqual(io.evidence, []);
  }
});

[
  { name: "rejects a failed build before promotion", state: "ERROR" },
  { name: "rejects a cancelled build before promotion", state: "CANCELED" },
  { name: "rejects a deployment that never becomes ready", state: "BUILDING" },
].forEach(({ name, state }) => {
  test(name, async () => {
    const io = platform();
    const original = await io.deployment();
    io.deployment = async () => ({ ...original, readyState: state });
    await assert.rejects(release(project, sha, io), /readiness|failed/i);
    assert.deepEqual(io.evidence, ["staged"]);
  });
});

test("promotes after a building deployment becomes ready", async () => {
  const io = platform();
  const original = await io.deployment();
  let calls = 0;
  // Also allow the ordinary case: the build needs another poll, then is ready.
  io.deployment = async () => ({
    ...original,
    readyState: ++calls === 1 ? "BUILDING" : "READY",
  });
  assert.equal((await release(project, sha, io)).status, "verified");
  assert.deepEqual(io.evidence, [
    "staged",
    "smoke:https://next-unique.vercel.app",
    "promoted:dpl_new",
    "smoke:https://next.vercel.app",
  ]);
});

test("a failed live check, advanced main, or changed production target cannot promote", async () => {
  // Things can change while browser tests run. Recheck the commit and public
  // deployment afterwards so an older run cannot overwrite newer work.
  for (const failure of ["smoke", "head", "current"]) {
    const io = platform();
    const originalSmoke = io.smoke;
    io.smoke = async (url) => {
      await originalSmoke(url);
      if (failure === "smoke") throw new Error("Live verification failed");
      if (failure === "head") io.head = async () => "b".repeat(40);
      if (failure === "current") io.current = async () => "dpl_newer";
    };
    await assert.rejects(release(project, sha, io));
    assert.equal(
      io.evidence.some((item) => item.startsWith("promoted:")),
      false,
    );
  }
});

test("a production alias mismatch fails verification after publication", async () => {
  // A successful promote command does not prove the public domain switched.
  // This failure happens after publication, so recovery needs the release record.
  const io = platform({ alias: async () => "dpl_other" });
  await assert.rejects(release(project, sha, io), /alias/i);
  assert.equal(io.evidence.includes("promoted:dpl_new"), true);
});

test("a second project uses identical release logic with independent identity, runtime and verification URL", async () => {
  // Give the second project its own team and settings without creating a real app.
  // Changing the Node version also catches assumptions tied to the first app.
  const second = {
    ...project,
    key: "second",
    projectId: "prj_second",
    teamId: "team_second",
    root: "apps/second",
    node: "24.0.0",
    productionUrl: "https://second.vercel.app",
  };
  const io = platform({}, second);
  const result = await release(second, sha, io);
  assert.equal(result.project, "second");
  assert.equal(result.status, "verified");
  assert.equal(io.evidence.at(-1), "smoke:https://second.vercel.app");
});

test("a deployment losing readiness after live verification cannot be promoted", async () => {
  // Do not rely on the readiness result from before the browser tests started.
  const io = platform();
  const original = await io.deployment();
  io.smoke = async () => {
    io.deployment = async () => ({ ...original, readyState: "ERROR" });
  };
  await assert.rejects(release(project, sha, io), /ready/i);
  assert.equal(
    io.evidence.some((item) => item.startsWith("promoted:")),
    false,
  );
});

test("does not promote when staging fails", async () => {
  const staging = platform({
    stage: async () => {
      throw new Error("Staging failed");
    },
  });
  await assert.rejects(release(project, sha, staging), /Staging failed/);
  assert.deepEqual(staging.evidence, []);
});

test("reports a failed public check after one promotion", async () => {
  const io = platform();
  const original = io.smoke;
  io.smoke = async (url) => {
    await original(url);
    if (url === project.productionUrl)
      throw new Error("Public verification failed");
  };
  await assert.rejects(release(project, sha, io), /Public verification failed/);
  assert.equal(
    io.evidence.filter((item) => item.startsWith("promoted:")).length,
    1,
  );
});
