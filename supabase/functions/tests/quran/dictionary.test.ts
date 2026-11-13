import { expect, it, vi } from 'vitest'
import { createQuranHandler } from '../../quran/handler.ts'
import { LaneResponseSchema, LanePageResponseSchema } from '../../../../packages/api-contracts/src/quran.ts'
import { createBundledLaneReader, LaneIndexSchema } from '../../quran/bundled-lane.ts'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const origin = 'https://usmaanalii.github.io'
function createHandler(overrides: Partial<Parameters<typeof createQuranHandler>[0]> = {}) {
  return createQuranHandler({ clientId: '', clientSecret: '', environment: 'prelive', origins: [origin], ...overrides })
}
function request(query = 'root=%D8%B3%D9%85%D9%88&lemma=%D9%B1%D8%B3%D9%92%D9%85') {
  return new Request(`https://example.com/functions/v1/quran/v2/dictionary?${query}`, { headers: { Origin: origin } })
}

async function withLaneData(run: (reader: ReturnType<typeof createBundledLaneReader>, directory: string) => Promise<void>, expanded = false, lemmas?: Record<string, string[]>) {
  const directory = await mkdtemp(join(tmpdir(), 'lane-backend-'))
  try {
    const mappingPath = join(directory, 'reviewed-mappings.json')
    if (lemmas) {
      const mappings = LaneIndexSchema.parse(JSON.parse(await readFile(new URL('../../../../apps/playground/data/lane/mappings.json', import.meta.url), 'utf8')))
      await writeFile(mappingPath, JSON.stringify({ ...mappings, lemmas: { ...mappings.lemmas, ...lemmas } }))
    }
    if (expanded) execFileSync('pnpm', ['--filter', 'playground', 'lane:data', '--output', directory, ...(lemmas ? ['--mappings', mappingPath] : [])], { stdio: 'pipe' })
    else execFileSync('python3', [new URL('../../../../apps/playground/scripts/lane-data/import.py', import.meta.url).pathname, '--output', directory])
    await run(createBundledLaneReader(readFile, pathToFileURL(`${directory}/`)), directory)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

it.each([
  { root: 'سمو', lemma: 'ٱسْم', id: 'n20831' },
  { root: 'اله', lemma: 'ٱللَّه', id: 'n1123' },
])('identifies the reviewed $lemma selection on the complete HTTP route before considering roots', async ({ root, lemma, id }) => {
  await withLaneData(async reader => {
    const handler = createHandler({ readDictionaryPage: reader.page })
    const response = await handler(new Request(`https://example.com/functions/v1/quran/v2/dictionary/entries?${new URLSearchParams({ root, lemma })}`, { headers: { Origin: origin } }))
    expect(response.status).toBe(200)
    const result = LanePageResponseSchema.parse(await response.json())
    expect(result.entries.map(({ id, match }) => ({ id, match }))).toEqual([{ id, match: { kind: 'lemma', key: lemma } }])
  }, true)
}, 30_000)

it('withholds unresolved roots and explicitly empty lemma overrides without falling back to a mapped root', async () => {
  await withLaneData(async reader => {
    const handler = createHandler({ readDictionaryPage: reader.page })
    const results = await Promise.all([
      { root: 'وقي' },
      { root: 'سمو', lemma: 'ٱسْم' },
    ].map(async query => {
      const response = await handler(new Request(`https://example.com/functions/v1/quran/v2/dictionary/entries?${new URLSearchParams(query)}`, { headers: { Origin: origin } }))
      expect(response.status).toBe(200)
      return LanePageResponseSchema.parse(await response.json())
    }))
    expect(results.map(({ entries, entryIds, nextCursor }) => ({ entries, entryIds, nextCursor }))).toEqual([
      { entries: [], entryIds: [], nextCursor: null },
      { entries: [], entryIds: [], nextCursor: null },
    ])
  }, true, { 'ٱسْم': [] })
}, 30_000)

it('registers the deployed entry point with expanded dictionary delivery', async () => {
  await withLaneData(async (_reader, directory) => {
    const registered = Promise.withResolvers<(request: Request) => Promise<Response>>()
    const packaged = new URL('../../quran/lane-data/', import.meta.url)
    vi.stubGlobal('Deno', {
      env: { get: () => undefined },
      serve: (handler: (request: Request) => Promise<Response>) => registered.resolve(handler),
      readFile: (path: URL) => {
        if (!path.href.startsWith(packaged.href)) throw new Error('Unexpected asset path')
        return readFile(new URL(path.href.slice(packaged.href.length), pathToFileURL(`${directory}/`)))
      },
    })
    try {
      vi.resetModules()
      await import('../../quran/index.ts')
      const response = await (await registered.promise)(new Request('https://example.com/functions/v1/quran/v2/dictionary/entries?root=نفق', { headers: { Origin: origin } }))
      expect(response.status).toBe(200)
      expect(LanePageResponseSchema.parse(await response.json()).entries).toEqual(expect.arrayContaining([expect.objectContaining({ entry: expect.objectContaining({ root: 'نفق' }) })]))
    } finally {
      vi.unstubAllGlobals()
    }
  }, true)
}, 30_000)

it('serves every entry in a large expanded root through bounded pages while retaining the legacy response', async () => {
  await withLaneData(async reader => {
    const handler = createHandler({ readDictionary: reader, readDictionaryPage: reader.page })
    const firstResponse = await handler(new Request('https://example.com/functions/v1/quran/v2/dictionary/entries?root=كتب&lemma=كِتَٰب', { headers: { Origin: origin } }))
    expect(firstResponse.status).toBe(200)
    const first = LanePageResponseSchema.parse(await firstResponse.json())
    expect(first.entries).toHaveLength(12)
    expect(first.entryIds.length).toBeGreaterThan(12)
    expect(first.nextCursor).not.toBeNull()
    expect(first.entries.map(item => item.match)).toEqual(Array.from({ length: 12 }, () => ({ kind: 'root', key: 'كتب' })))
    async function remaining(cursor: string | null): Promise<string[]> {
      if (!cursor) return []
      const response = await handler(new Request(`https://example.com/functions/v1/quran/v2/dictionary/entries?${new URLSearchParams({ root: 'كتب', lemma: 'كِتَٰب', cursor })}`, { headers: { Origin: origin } }))
      expect(response.status).toBe(200)
      const page = LanePageResponseSchema.parse(await response.json())
      expect(page.revision).toBe(first.revision)
      expect(page.entries.every(item => item.match?.kind === 'root' && item.match.key === 'كتب')).toBe(true)
      return [...page.entries.map(item => item.id), ...await remaining(page.nextCursor)]
    }
    expect([...first.entries.map(item => item.id), ...await remaining(first.nextCursor)]).toEqual(first.entryIds)
    expect(first.entries.every(item => item.entry?.root === 'كتب')).toBe(true)
    const legacy = await handler(request('root=رحم'))
    expect(LaneResponseSchema.parse(await legacy.json()).entries.map(item => item.id)).toEqual(['n15076', 'n15091', 'n15096'])
  }, true)
}, 30_000)

it('rejects dictionary continuations belonging to another lookup or dataset revision', async () => {
  await withLaneData(async reader => {
    const handler = createHandler({ readDictionaryPage: reader.page })
    const response = await handler(new Request('https://example.com/functions/v1/quran/v2/dictionary/entries?root=كتب', { headers: { Origin: origin } }))
    const first = LanePageResponseSchema.parse(await response.json())
    const cursor = first.nextCursor
    if (!cursor) throw new Error('The real root must require continuation')
    const responses = await Promise.all([
      { root: 'علم', cursor },
      { root: 'كتب', cursor: cursor.replace(/^[^.]+/, '0'.repeat(64)) },
      { root: 'كتب', cursor: 'invalid' },
      { root: 'كتب', cursor: '' },
      { root: 'كتب', cursor: `${cursor}.extra` },
    ].map(query => handler(new Request(`https://example.com/functions/v1/quran/v2/dictionary/entries?${new URLSearchParams(query)}`, { headers: { Origin: origin } }))))
    expect(responses.map(result => result.status)).toEqual([400, 400, 400, 400, 400])
  }, true)
}, 30_000)

it('serves owned Lane entries on demand without requesting Quran Foundation content', async () => {
  const handler = createHandler({
    readDictionary: async query => {
      expect(query).toEqual({ root: 'سمو', lemma: 'ٱسْم' })
      return { entries: [{ id: 'n20831', entry: {
        id: 'n20831', headword: 'اِسْمٌ', root: 'سمو', file: 'us0.xml',
        sourceUrl: 'https://github.com/alpheios-project/lan/blob/7dd04e1182c13a4b0883978867d2a3b04616542a/db/lexica/ara/lan/us0.xml',
        blocks: [{ kind: 'text', label: '', runs: [{ text: 'The name of a thing.', lang: null, emphasis: false }] }],
      } }] }
    },
  })
  const response = await handler(request())
  expect(response.status).toBe(200)
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin)
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  expect(LaneResponseSchema.parse(await response.json()).entries[0]?.entry?.headword).toBe('اِسْمٌ')
})

it.each([
  { reason: 'the root has 15 characters', query: `root=${'ر'.repeat(15)}`, status: 200 },
  { reason: 'the root reaches its 16-character limit', query: `root=${'ر'.repeat(16)}`, status: 200 },
  { reason: 'the root exceeds 16 characters', query: `root=${'ر'.repeat(17)}`, status: 400 },
  { reason: 'the lemma has 79 characters', query: `lemma=${'ر'.repeat(79)}`, status: 200 },
  { reason: 'the lemma reaches its 80-character limit', query: `lemma=${'ر'.repeat(80)}`, status: 200 },
  { reason: 'the lemma exceeds 80 characters', query: `lemma=${'ر'.repeat(81)}`, status: 400 },
  { reason: 'no dictionary term is supplied', query: '', status: 400 },
  { reason: 'the root is empty', query: 'root=', status: 400 },
  { reason: 'the lemma is empty', query: 'lemma=', status: 400 },
  { reason: 'the root parameter is repeated', query: 'root=سمو&root=رحم', status: 400 },
  { reason: 'surface matching is requested', query: 'lemma=ٱسْم&surface=بسم', status: 400 },
  { reason: 'an external URL is supplied', query: 'url=https://untrusted.example', status: 400 },
])('returns HTTP $status when $reason', async ({ query, status }) => {
  const handler = createHandler({ readDictionary: async () => ({ entries: [] }) })
  const response = await handler(request(query))
  expect(response.status).toBe(status)
  expect(await response.json()).toEqual(status === 200 ? { entries: [] } : { error: expect.any(String) })
})

it.each([
  { reason: 'the origin is untrusted', method: 'GET', requestOrigin: 'https://untrusted.example', status: 403 },
  { reason: 'the method writes content', method: 'POST', requestOrigin: origin, status: 405 },
])('rejects a dictionary request when $reason', async ({ method, requestOrigin, status }) => {
  const response = await createHandler()(new Request(request().url, { method, headers: { Origin: requestOrigin } }))

  expect(response.status).toBe(status)
})

it('allows a dictionary preflight from a trusted origin', async () => {
  const response = await createHandler()(new Request(request().url, { method: 'OPTIONS', headers: { Origin: origin } }))

  expect(response.status).toBe(204)
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin)
  expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS')
})

it('returns a safe error when reading dictionary data fails', async () => {
  const handler = createHandler({ readDictionary: async () => { throw new Error('Private server filename') } })
  const response = await handler(request())
  expect(response.status).toBe(503)
  expect(await response.json()).toEqual({ error: 'Dictionary temporarily unavailable.' })
})

it('reuses validated bundled data within a function instance and returns no match for unreviewed roots', async () => {
  await withLaneData(async (reader, directory) => {
    const query = { lemma: 'ٱسْم' }
    const original = await reader(query, new AbortController().signal)
    expect(await reader({ root: 'بسم' }, new AbortController().signal)).toEqual({ entries: [] })
    await writeFile(join(directory, 'index.json'), 'changed index')
    await writeFile(join(directory, 'lane/n20831.json'), 'changed entry')
    expect(await reader(query, new AbortController().signal)).toEqual(original)
    const fresh = createBundledLaneReader(readFile, pathToFileURL(`${directory}/`))
    await expect(fresh(query, new AbortController().signal)).rejects.toThrow('Lane asset checksum mismatch')
  })
})

it('withholds a changed bundled entry while keeping the other relevant entries distinguishable', async () => {
  await withLaneData(async (reader, directory) => {
    const path = join(directory, 'lane/n15091.json')
    const source: unknown = JSON.parse(await readFile(path, 'utf8'))
    const parsed = LaneResponseSchema.parse({ entries: [{ id: 'n15091', entry: source }] }).entries[0]?.entry
    await writeFile(path, JSON.stringify({ ...parsed, headword: 'Changed source text' }))
    const result = await reader({ root: 'رحم' }, new AbortController().signal)
    expect(result.entries.map(item => [item.id, item.entry?.headword ?? null])).toEqual([
      ['n15076', 'رَحِمَهُ'], ['n15091', null], ['n15096', 'رَحِيمُ'],
    ])
  })
})

it('matches the reviewed name exception from real pinned Lane data and retains source structure', async () => {
  await withLaneData(async reader => {
    const result = LaneResponseSchema.parse(await reader({ root: 'سمو', lemma: 'ٱسْم' }, new AbortController().signal))
    expect(result.entries.map(item => item.id)).toEqual(['n20831'])
    const entry = result.entries[0]?.entry
    expect(entry).toMatchObject({
      headword: 'اِسْمٌ', root: 'سمو', file: 'us0.xml',
      sourceUrl: 'https://github.com/alpheios-project/lan/blob/7dd04e1182c13a4b0883978867d2a3b04616542a/db/lexica/ara/lan/us0.xml',
      blocks: expect.arrayContaining([
        expect.objectContaining({ kind: 'form', runs: expect.arrayContaining([{ text: 'اِسْمٌ', lang: 'ar', emphasis: false }]) }),
        { kind: 'text', label: '', runs: [{ text: 'name', lang: null, emphasis: true }] },
        { kind: 'sense', label: '2', runs: [] },
        { kind: 'text', label: '', runs: [{ text: ', (S, M, Msb, K,) with the conjunctive ', lang: null, emphasis: false }] },
      ]),
    })
    const readingOrder = entry?.blocks.filter(block =>
      block.kind === 'sense' ||
      (block.kind === 'form' && block.runs.some(run => run.text === 'اِسْمٌ')) ||
      block.runs.some(run => run.text === 'name'),
    ).map(({ kind, label }) => ({ kind, label }))
    expect(readingOrder).toEqual([
      { kind: 'form', label: '' }, { kind: 'text', label: '' }, { kind: 'sense', label: '2' },
    ])
  })
})
