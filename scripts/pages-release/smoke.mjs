const origin = "https://usmaanalii.github.io";

export async function verifyHostedBackend(publicUrl, fetchResponse = fetch) {
  const passed = [];
  async function check(label, path, { status = 200, method = "GET", body, allowed = true } = {}) {
    try {
      const response = await fetchResponse(new URL(`/functions/v1${path}`, publicUrl), {
        method,
        headers: {
          Origin: allowed ? origin : "https://invalid.example",
          ...(method === "OPTIONS" && {
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "apikey",
          }),
        },
        signal: AbortSignal.timeout(20_000),
        redirect: "error",
      });
      if (response.status !== status ||
          response.headers.get("Access-Control-Allow-Origin") !== (allowed ? origin : null) ||
          (method === "OPTIONS" &&
            (!response.headers.get("Access-Control-Allow-Methods")?.includes("GET") ||
             !response.headers.get("Access-Control-Allow-Headers")?.toLowerCase().includes("apikey"))) ||
          (body && !body(await response.json()))) {
        throw new Error("Unexpected hosted response");
      }
    } catch {
      throw new Error(`Hosted smoke failed: ${label}`);
    }
    passed.push(label);
  }

  await check("Hello greeting", "/hello", { body: (data) => data.ok === true && data.message === "Hello from Supabase!" });
  await check("Hello preflight", "/hello", { method: "OPTIONS", status: 204 });
  await check("Quran preflight", "/quran/v2/chapters", { method: "OPTIONS", status: 204 });
  await check("Quran v2 chapters", "/quran/v2/chapters", {
    body: (data) => data.chapters?.some((chapter) => chapter.id === 1 && chapter.verses === 7),
  });
  await check("Quran v2 verses and morphology", "/quran/v2/verses?chapter=1", {
    body: (data) => Boolean(data.translationName) && data.nextPage === null &&
      data.verses?.length === 7 && data.verses.every((verse, index) =>
        verse.number === index + 1 && verse.arabic && verse.translationHtml) &&
      data.verses[0].words?.some((word, index) =>
        word.position === index + 1 && word.grammar?.status === "available" && word.grammar.segments?.length > 0),
  });
  await check("Lane dictionary entries", "/quran/v2/dictionary/entries?root=كتب", {
    body: (data) => data.entries?.some(({ entry }) => entry?.blocks?.length > 0),
  });
  await check("Mufradat dictionary entries", "/quran/v2/mufradat/entries?root=رحم", {
    body: (data) => data.status === "matched" && Boolean(data.entry?.raw) ||
      data.status === "multiple" && data.entries?.some((entry) => Boolean(entry.raw)),
  });
  await check("Quran coverage index", "/quran/v2/coverage/lookup?mode=root&query=كتب", {
    body: (data) => data.mode === "root" && data.root === "كتب" && data.total > 0,
  });
  await check("Legacy Quran chapters", "/quran/chapters", {
    body: (data) => data.chapters?.some((chapter) => chapter.id === 1 && chapter.name_simple),
  });
  await check("Legacy Quran verses", "/quran/verses?chapter=1", {
    body: (data) => Boolean(data.pagination) &&
      data.verses?.some((verse) => verse.verse_number === 1 && verse.text_uthmani),
  });
  await check("Quran invalid chapter", "/quran/v2/verses?chapter=115", {
    status: 400, body: (data) => typeof data.error === "string",
  });
  await check("Quran disallowed origin", "/quran/v2/chapters", { status: 403, allowed: false });
  return passed;
}
