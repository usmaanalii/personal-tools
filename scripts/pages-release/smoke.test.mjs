import assert from "node:assert/strict";
import test from "node:test";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { verifyHostedBackend } from "./smoke.mjs";

const origin = "https://usmaanalii.github.io";
const publicUrl = "https://example.supabase.co";
const functionsUrl = `${publicUrl}/functions/v1`;
const cors = {
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "apikey, content-type",
};

function verses(status = "available") {
  return {
    verses: Array.from({ length: 7 }, (_, index) => {
      const number = index + 1;
      return {
        number, arabic: "بسم", translationHtml: "In the name",
        words: [{
          chapter: 1, verse: number, position: 1, arabic: "بسم",
          meaning: "In the name", transliteration: "bismi",
          grammar: status === "available" ? {
            status,
            segments: [{ kind: "stem", arabic: "اسم", partOfSpeech: "Noun", root: "سمو", lemma: "اسم", features: [] }],
          } : { status },
        }],
      };
    }),
    translationName: "Test attribution", nextPage: null,
  };
}

function hostedFixtures(t, overrides = {}) {
  const coverage = { status: "indexed", count: 1, basis: "root" };
  const entry = {
    id: "n1", headword: "كتب", root: "كتب", file: "kataba.xml",
    sourceUrl: `https://github.com/alpheios-project/lan/blob/${"a".repeat(40)}/db/lexica/ara/lan/kataba.xml`,
    blocks: [{ kind: "sense", label: "", runs: [{ text: "He wrote", lang: "en", emphasis: false }] }],
  };
  const routes = {
    "/hello": [200, { ok: true, message: "Hello from Supabase!" }],
    "/quran/v2/chapters": [200, { chapters: [{ id: 1, name: "Al-Fatihah", arabic: "الفاتحة", meaning: "The Opening", verses: 7, place: "Meccan" }] }],
    "/quran/v2/verses?chapter=1": [200, verses()],
    "/quran/v2/dictionary/entries?root=كتب": [200, { entries: [{ id: entry.id, entry }], entryIds: [entry.id], revision: "b".repeat(64), nextCursor: null }],
    "/quran/v2/mufradat/entries?root=رحم": [200, {
      status: "matched",
      entry: {
        id: "jk-l1", headword: "رحم", startLine: 1, endLine: 1, raw: "رحم", paragraphs: ["رحم"], pages: [],
        sourceUrl: `https://github.com/OpenITI/0525AH/blob/${"c".repeat(40)}/data/0502RaghibIsbahani/0502RaghibIsbahani.Mufradat/0502RaghibIsbahani.Mufradat.JK001150-ara1#L1-L1`,
      },
    }],
    "/quran/v2/coverage/lookup?mode=root&query=كتب": [200, { mode: "root", root: "كتب", total: 1, lane: coverage, mufradat: coverage }],
    "/quran/chapters": [200, { chapters: [{ id: 1, name_simple: "Al-Fatihah" }] }],
    "/quran/verses?chapter=1": [200, { verses: [{ verse_number: 1, text_uthmani: "بسم" }], pagination: {} }],
    "/quran/v2/verses?chapter=115": [400, { error: "Invalid chapter or page." }],
    ...overrides,
  };
  const server = setupServer(
    ...["/hello", "/quran/v2/chapters"].map((path) =>
      http.options(functionsUrl + path, ({ request }) => {
        assert.equal(request.headers.get("origin"), origin);
        assert.equal(request.headers.get("access-control-request-method"), "GET");
        assert.equal(request.headers.get("access-control-request-headers"), "apikey");
        return new HttpResponse(null, { status: 204, headers: cors });
      })),
    http.get(`${functionsUrl}/*`, ({ request }) => {
      const url = new URL(request.url);
      const route = decodeURI(url.href.slice(functionsUrl.length));
      assert.ok(Object.hasOwn(routes, route), `Unexpected function request ${route}`);
      if (route === "/quran/v2/chapters" && request.headers.get("origin") === "https://invalid.example") {
        return new HttpResponse(null, { status: 403 });
      }
      assert.equal(request.headers.get("origin"), origin);
      const [status, body] = routes[route];
      return HttpResponse.json(body, { status, headers: cors });
    }),
  );
  server.listen({ onUnhandledRequest: "error" });
  t.after(() => server.close());
}

test("records all public release checks against the configured Supabase project", async (t) => {
  hostedFixtures(t);
  const checks = await verifyHostedBackend(publicUrl);
  assert.deepEqual(checks, [
    "Hello greeting", "Hello preflight", "Quran preflight", "Quran v2 chapters",
    "Quran v2 verses and morphology", "Lane dictionary entries", "Mufradat dictionary entries",
    "Quran coverage index", "Legacy Quran chapters", "Legacy Quran verses", "Quran invalid chapter",
    "Quran disallowed origin",
  ]);
});

for (const [label, route, response] of [
  ["Quran v2 verses and morphology", "/quran/v2/verses?chapter=1", [200, verses("temporarily_unavailable")]],
  ["Lane dictionary entries", "/quran/v2/dictionary/entries?root=كتب", [200, { entries: [] }]],
  ["Mufradat dictionary entries", "/quran/v2/mufradat/entries?root=رحم", [200, { status: "missing" }]],
  ["Quran coverage index", "/quran/v2/coverage/lookup?mode=root&query=كتب", [503, { error: "Coverage lookup temporarily unavailable." }]],
]) {
  test(`fails hosted smoke when the ${label} probe fails`, async (t) => {
    hostedFixtures(t, { [route]: response });
    await assert.rejects(verifyHostedBackend(publicUrl), { message: `Hosted smoke failed: ${label}` });
  });
}
