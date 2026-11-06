import assert from "node:assert/strict";
import test from "node:test";
import { establishBypass } from "../../apps/next-vercel-supabase-app/tests/connection/protection.ts";

// These request/cookie contracts do not prove Vercel issues a cookie that a
// real browser can use; deployment smoke owns that integration.
function scopedCookie(overrides = {}) {
  return { name: "_vercel_jwt", secure: true, domain: "next.vercel.app", ...overrides };
}

function setupProtection({ cookies = [scopedCookie()], status = 302, location = "/" } = {}) {
  const calls = [];
  return {
    calls,
    context: {
      request: {
        async get(url, options) {
          calls.push({ url, options });
          return { status: () => status, headers: () => ({ location }) };
        },
      },
      async cookies() {
        return cookies;
      },
    },
  };
}

[
  { reason: "the target is another host", target: "https://evil.example", verified: "https://next.vercel.app" },
  { reason: "the origin has not been verified", target: "https://next.vercel.app", verified: "" },
  { reason: "the target uses HTTP", target: "http://next.vercel.app", verified: "http://next.vercel.app" },
  { reason: "the target includes a path", target: "https://next.vercel.app/path", verified: "https://next.vercel.app/path" },
].forEach(({ reason, target, verified }) => {
  test(`rejects the bypass before sending its secret when ${reason}`, async () => {
    const { context, calls } = setupProtection();

    await assert.rejects(establishBypass(context, target, "secret", verified), /verified/i);

    assert.deepEqual(calls, []);
  });
});

test("establishes deployment access with one secret-bearing request and redirects disabled", async () => {
  const { context, calls } = setupProtection();

  await establishBypass(context, "https://next.vercel.app", "secret", "https://next.vercel.app");

  assert.deepEqual(calls, [{
    url: "https://next.vercel.app",
    options: {
      headers: { "x-vercel-protection-bypass": "secret", "x-vercel-set-bypass-cookie": "true" },
      maxRedirects: 0,
    },
  }]);
});

test("rejects a bypass cookie for another deployment", async () => {
  const { context } = setupProtection({ cookies: [scopedCookie({ domain: "other.vercel.app" })] });

  await assert.rejects(establishBypass(context, "https://next.vercel.app", "secret", "https://next.vercel.app"), /scoped cookie/);
});

test("rejects an insecure bypass cookie", async () => {
  const { context } = setupProtection({ cookies: [scopedCookie({ secure: false })] });

  await assert.rejects(establishBypass(context, "https://next.vercel.app", "secret", "https://next.vercel.app"), /scoped cookie/);
});

test("rejects a cookie with a different name from the deployment bypass cookie", async () => {
  const { context } = setupProtection({ cookies: [scopedCookie({ name: "another_cookie" })] });

  await assert.rejects(establishBypass(context, "https://next.vercel.app", "secret", "https://next.vercel.app"), /scoped cookie/);
});

test("rejects deployment access when setup establishes no cookies", async () => {
  const { context } = setupProtection({ cookies: [] });

  await assert.rejects(establishBypass(context, "https://next.vercel.app", "secret", "https://next.vercel.app"), /scoped cookie/);
});

test("rejects an unsuccessful setup response even when a valid bypass cookie exists", async () => {
  const { context } = setupProtection({ status: 400 });

  await assert.rejects(establishBypass(context, "https://next.vercel.app", "secret", "https://next.vercel.app"), /scoped cookie/);
});

test("rejects a bypass redirect outside the verified deployment", async () => {
  const { context } = setupProtection({ location: "https://evil.example" });

  await assert.rejects(establishBypass(context, "https://next.vercel.app", "secret", "https://next.vercel.app"), /redirected/);
});
