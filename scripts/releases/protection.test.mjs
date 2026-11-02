import assert from "node:assert/strict";
import test from "node:test";
import { establishBypass } from "../../apps/next-vercel-supabase-app/tests/connection/protection.ts";

// We simulate Playwright's request and cookie APIs here to check where the
// bypass secret could go. A real hosted run must still confirm that Vercel
// issues the expected cookie and that the browser can use it.
test("deployment bypass rejects unverified targets before sending its secret", async () => {
  // If any rejected address reaches get(), the test fails: the secret would
  // already have been sent before we knew the destination was safe.
  const context = {
    request: {
      async get() {
        throw new Error("Secret was sent");
      },
    },
  };
  for (const [target, verified] of [
    ["https://evil.example", "https://next.vercel.app"],
    ["https://next.vercel.app", ""],
    ["http://next.vercel.app", "http://next.vercel.app"],
    ["https://next.vercel.app/path", "https://next.vercel.app/path"],
  ])
    await assert.rejects(
      establishBypass(context, target, "secret", verified),
      /verified/i,
    );
});

test("protection setup sends the secret once with redirects disabled and requires the scoped secure cookie", async () => {
  // Send the raw secret only for setup at the verified host. Following a
  // redirect could send it elsewhere; later browser requests should use a cookie.
  const calls = [];
  const context = {
    request: {
      async get(url, options) {
        calls.push({ url, options });
        return { status: () => 302, headers: () => ({ location: "/" }) };
      },
    },
    async cookies() {
      return [{ name: "_vercel_jwt", secure: true, domain: "next.vercel.app" }];
    },
  };
  await establishBypass(
    context,
    "https://next.vercel.app",
    "secret",
    "https://next.vercel.app",
  );
  assert.deepEqual(calls, [
    {
      url: "https://next.vercel.app",
      options: {
        headers: {
          "x-vercel-protection-bypass": "secret",
          "x-vercel-set-bypass-cookie": "true",
        },
        maxRedirects: 0,
      },
    },
  ]);
  context.cookies = async () => [
    { name: "_vercel_jwt", secure: true, domain: "other.vercel.app" },
  ];
  // A cookie for another deployment does not give this browser access.
  await assert.rejects(
    establishBypass(
      context,
      "https://next.vercel.app",
      "secret",
      "https://next.vercel.app",
    ),
    /cookie/,
  );
  context.request.get = async () => ({
    status: () => 302,
    headers: () => ({ location: "https://evil.example" }),
  });
  // Even a successful-looking setup response must not redirect to another site.
  await assert.rejects(
    establishBypass(
      context,
      "https://next.vercel.app",
      "secret",
      "https://next.vercel.app",
    ),
    /redirected/,
  );
});
