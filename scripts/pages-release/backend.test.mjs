import assert from "node:assert/strict";
import test from "node:test";
import { releaseBackend } from "./backend.mjs";

const ref = "abcdefghijklmnopqrst";
const config = {
  projectRef: ref, publicUrl: `https://${ref}.supabase.co`, accessToken: "test-token",
};

function releaseIo(overrides = {}) {
  const calls = [];
  const io = {
    assertCurrent: async () => calls.push("current"),
    version: async (slug) => calls.includes(slug) ? 2 : 1,
    deploy: async (slug) => calls.push(slug),
    record: (slug, version) => calls.push(`${slug}@${version}`),
    smoke: async () => calls.push("smoke"),
    ...overrides,
  };
  return { calls, io };
}

test("verifies and records both function versions before hosted smoke", async () => {
  const { calls, io } = releaseIo();
  await releaseBackend(config, io);
  assert.deepEqual(calls, ["current", "hello", "hello@2", "quran", "quran@2", "smoke"]);
});

test("a failed smoke rejects the release after recording both deployed versions", async () => {
  const { calls, io } = releaseIo({
    smoke: async () => { throw new Error("Hosted smoke failed: Quran coverage index"); },
  });
  await assert.rejects(releaseBackend(config, io), /Hosted smoke failed/);
  assert.deepEqual(calls, ["current", "hello", "hello@2", "quran", "quran@2"]);
});

test("stops when Supabase cannot verify a newly deployed function", async () => {
  const { calls, io } = releaseIo({ version: async () => undefined });
  await assert.rejects(releaseBackend(config, io), /Unverified hello deployment version/);
  assert.deepEqual(calls, ["current", "hello"]);
});

test("rejects the same version without explicit confirmation that the bundle matches", async () => {
  const { calls, io } = releaseIo({ version: async () => 1 });
  await assert.rejects(releaseBackend(config, io), /Unverified hello deployment version/);
  assert.deepEqual(calls, ["current", "hello"]);
});

test("rejects missing credentials or a mismatched project before accessing production", async () => {
  for (const change of [{ accessToken: "" }, { projectRef: "" }, { publicUrl: "https://wrong.supabase.co" }]) {
    await assert.rejects(releaseBackend({ ...config, ...change }, {}), /deployment credentials or target/);
  }
});
