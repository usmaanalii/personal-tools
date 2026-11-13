import { expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../server'
import { createQuranHandler } from '../../quran/handler'
import { importCorpus } from '../../../../apps/playground/scripts/quran-data/corpus.ts'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { gzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import { createBundledMorphologyReader } from '../../quran/bundled-morphology.ts'
import { LanePageResponseSchema, VersesResponseSchema } from '../../../../packages/api-contracts/src/quran.ts'
import { createBundledLaneReader } from '../../quran/bundled-lane.ts'
import { createBundledMufradatReader } from '../../quran/bundled-mufradat.ts'

const origin = 'https://usmaanalii.github.io'
function bismiChapter() {
  const chapter = importCorpus('(1:1:1:1)\tbi\tP\tPREFIX|bi+\n(1:1:1:2)\tsomi\tN\tSTEM|POS:N|LEM:{som|ROOT:smw|M|GEN').chapters['1']
  if (!chapter) throw new Error('Expected the source example to import')
  return chapter
}
function chapterAssets() {
  const raw = Buffer.from(JSON.stringify(bismiChapter()))
  const compressed = gzipSync(raw)
  return { raw, compressed, manifest: { version: 1, compression: 'gzip', chapters: [
    { chapter: 1, sha256: createHash('sha256').update(raw).digest('hex'), compressedSha256: createHash('sha256').update(compressed).digest('hex'), decodedBytes: raw.length, compressedBytes: compressed.length },
  ] } }
}
async function withChapterAssets(run: (directory: string, assets: ReturnType<typeof chapterAssets>) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'quran-grammar-'))
  try {
    const assets = chapterAssets()
    await mkdir(join(directory, 'morphology'))
    await writeFile(join(directory, 'morphology/1.json.gz'), assets.compressed)
    await writeFile(join(directory, 'manifest.json'), JSON.stringify(assets.manifest))
    await run(directory, assets)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}
function word(position = 1) {
  return { position, text_uthmani: 'بِسْمِ', char_type_name: 'word', translation: { text: 'In (the) name', language_name: 'english' }, transliteration: { text: "bis'mi", language_name: 'english' } }
}
function provider(words: unknown = [word(), { position: 2, text_uthmani: '١', char_type_name: 'end' }], verse = 1) {
  return { verses: [{ verse_number: verse, text_uthmani: 'بِسْمِ', translations: [{ resource_id: 85, text: 'In the name' }], words }], pagination: { next_page: null } }
}
function providerRequests(payload: unknown, legacy = false) {
  server.use(
    http.post('https://prelive-oauth2.quran.foundation/oauth2/token', () => HttpResponse.json({ access_token: 'test-token', expires_in: 3600 })),
    http.get('https://apis-prelive.quran.foundation/content/api/v4/verses/by_chapter/1', ({ request }) => {
      const params = new URL(request.url).searchParams
      if (!legacy) {
        expect(params.get('words')).toBe('true')
        expect(params.get('word_fields')).toBe('text_uthmani')
        expect(params.get('language')).toBe('en')
      }
      expect(params.get('translations')).toBe('85')
      return HttpResponse.json(payload)
    }),
  )
}
async function read(payload: unknown, legacy = false, readMorphology?: (chapter: number, signal: AbortSignal) => Promise<unknown>, overrides: Partial<Parameters<typeof createQuranHandler>[0]> = {}) {
  providerRequests(payload, legacy)
  const handler = createQuranHandler({ clientId: 'test-client', clientSecret: 'test-secret', environment: 'prelive', origins: [origin], readMorphology, ...overrides })
  return handler(new Request(`https://example.com/functions/v1/quran/${legacy ? '' : 'v2/'}verses?chapter=1`, { headers: { Origin: origin } }))
}

function indexAssets<T>(filename: string, data: T) {
  const index = Buffer.from(JSON.stringify(data))
  const manifest = Buffer.from(JSON.stringify({ files: { [filename]: createHash('sha256').update(index).digest('hex') } }))
  return vi.fn(async (path: URL) => {
    if (path.pathname.endsWith('/manifest.json')) return manifest
    if (path.pathname.endsWith(`/${filename}`)) return index
    throw new Error('Article assets are unavailable')
  })
}

it('reports dictionary index matches without loading articles', async () => {
  const laneAssets = indexAssets('catalogue.json', { roots: { سمو: ['n1', 'n2'] }, lemmas: { 'ٱسْم': ['n3'] }, entryFiles: {} })
  const mufradatAssets = indexAssets('index.json', { roots: { سمو: ['jk-l1', 'jk-l2'] }, lemmas: { 'ٱسْم': ['jk-l3'] } })
  const lane = createBundledLaneReader(laneAssets)
  const mufradat = createBundledMufradatReader(mufradatAssets)
  const response = await read(provider(), false, async () => bismiChapter(), { lane, mufradat })
  expect(response.status).toBe(200)
  expect(VersesResponseSchema.parse(await response.json()).verses[0]?.words?.[0]?.availability)
    .toEqual({ corpus: 'lexical', lane: 'indexed', mufradat: 'indexed' })
  expect(laneAssets.mock.calls.map(([path]) => path.pathname.split('/').at(-1))).toEqual(['manifest.json', 'catalogue.json'])
  expect(mufradatAssets.mock.calls.map(([path]) => path.pathname.split('/').at(-1))).toEqual(['manifest.json', 'index.json'])
})

it('uses the same Lane catalogue for verse availability and the article route', async () => {
  providerRequests(provider())
  const assets = indexAssets('catalogue.json', { roots: {}, lemmas: { 'ٱسْم': ['n1'] }, entryFiles: {} })
  const lane = createBundledLaneReader(assets)
  const handler = createQuranHandler({
    clientId: 'test-client', clientSecret: 'test-secret', environment: 'prelive', origins: [origin],
    readMorphology: async () => bismiChapter(), lane,
  })
  const request = (path: string) => new Request(`https://example.com/functions/v1/quran/v2/${path}`, { headers: { Origin: origin } })
  const verses = await handler(request('verses?chapter=1'))
  expect(VersesResponseSchema.parse(await verses.json()).verses[0]?.words?.[0]?.availability?.lane).toBe('indexed')

  const articles = await handler(request(`dictionary/entries?${new URLSearchParams({ lemma: 'ٱسْم' })}`))
  expect(LanePageResponseSchema.parse(await articles.json()).entryIds).toEqual(['n1'])
  expect(assets.mock.calls.map(([path]) => path.pathname.split('/').at(-1))).toEqual(['manifest.json', 'catalogue.json'])
})

it('reports multiple root entries and honors an empty lemma override', async () => {
  const lane = createBundledLaneReader(indexAssets('catalogue.json', { roots: { سمو: ['n1', 'n2'] }, lemmas: {}, entryFiles: {} }))
  const mufradat = createBundledMufradatReader(indexAssets('index.json', { roots: { سمو: ['jk-l1'] }, lemmas: { 'ٱسْم': [] } }))
  const response = await read(provider(), false, async () => bismiChapter(), { lane, mufradat })
  expect(VersesResponseSchema.parse(await response.json()).verses[0]?.words?.[0]?.availability)
    .toEqual({ corpus: 'lexical', lane: 'multiple', mufradat: 'missing' })
})

it('reports one indexed entry when repeated stems select the same article', async () => {
  const chapter = importCorpus('(1:1:1:1)\tsomi\tN\tSTEM|POS:N|LEM:{som|ROOT:smw\n(1:1:1:2)\tsomi\tN\tSTEM|POS:N|LEM:{som|ROOT:smw').chapters['1']
  const lane = createBundledLaneReader(indexAssets('catalogue.json', { roots: { سمو: ['n1'] }, lemmas: {}, entryFiles: {} }))
  const response = await read(provider([{ ...word(), text_uthmani: 'سْمِسْمِ' }]), false, async () => chapter, { lane })
  expect(VersesResponseSchema.parse(await response.json()).verses[0]?.words?.[0]?.availability?.lane).toBe('indexed')
})

it('isolates a dictionary index failure and keeps the other source and verses available', async () => {
  const laneAssets = indexAssets('catalogue.json', { roots: { سمو: ['n1'] }, lemmas: {}, entryFiles: {} })
  const readLane = vi.fn(laneAssets)
    .mockImplementationOnce(laneAssets)
    .mockResolvedValueOnce(Buffer.from('{}'))
  const lane = createBundledLaneReader(readLane)
  const mufradat = createBundledMufradatReader(indexAssets('index.json', { roots: { سمو: ['jk-l1'] }, lemmas: {} }))
  const response = await read(provider(), false, async () => bismiChapter(), {
    lane, mufradat,
  })
  expect(response.status).toBe(200)
  expect(VersesResponseSchema.parse(await response.json()).verses[0]?.words?.[0])
    .toMatchObject({ meaning: 'In (the) name', grammar: { status: 'available' }, availability: { corpus: 'lexical', lane: 'temporarily_unavailable', mufradat: 'indexed' } })
  const retry = await read(provider(), false, async () => bismiChapter(), { lane, mufradat })
  expect(VersesResponseSchema.parse(await retry.json()).verses[0]?.words?.[0]?.availability?.lane).toBe('indexed')
})

it('returns a verses page at the dictionary deadline even if an index read stalls', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
  try {
    const started = Promise.withResolvers<void>()
    const laneAssets = indexAssets('catalogue.json', { roots: {}, lemmas: {}, entryFiles: {} })
    const stalledRead = () => {
      started.resolve()
      return new Promise<Uint8Array>(() => {})
    }
    const lane = createBundledLaneReader(path => path.pathname.endsWith('/catalogue.json') ? stalledRead() : laneAssets(path))
    const mufradat = createBundledMufradatReader(indexAssets('index.json', { roots: { سمو: ['jk-l1'] }, lemmas: {} }))
    const pending = read(provider(), false, async () => bismiChapter(), {
      lane, mufradat,
    })
    await started.promise
    // Let the independent index finish its checksum before advancing the stalled read's deadline.
    await mufradat.loadIndex()
    await vi.advanceTimersByTimeAsync(200)
    const response = await Promise.race([pending, Promise.resolve(null)])
    expect(response).not.toBeNull()
    expect(VersesResponseSchema.parse(await response?.json()).verses[0]?.words?.[0]?.availability)
      .toEqual({ corpus: 'lexical', lane: 'temporarily_unavailable', mufradat: 'indexed' })
  } finally {
    vi.useRealTimers()
  }
})

it('retries a stalled dictionary index on the next verses request', async () => {
  const laneAssets = indexAssets('catalogue.json', { roots: { سمو: ['n1'] }, lemmas: {}, entryFiles: {} })
  const readCatalogue = vi.fn((path: URL) => laneAssets(path)).mockReturnValueOnce(new Promise(() => {}))
  const lane = createBundledLaneReader(path => path.pathname.endsWith('/catalogue.json') ? readCatalogue(path) : laneAssets(path))
  providerRequests(provider())
  const handler = createQuranHandler({
    clientId: 'test-client', clientSecret: 'test-secret', environment: 'prelive', origins: [origin],
    readMorphology: async () => bismiChapter(), lane,
  })
  const requestPage = () => handler(new Request('https://example.com/functions/v1/quran/v2/verses?chapter=1', { headers: { Origin: origin } }))

  const first = await requestPage()
  expect(VersesResponseSchema.parse(await first.json()).verses[0]?.words?.[0]?.availability?.lane).toBe('temporarily_unavailable')

  const retry = await requestPage()
  expect(VersesResponseSchema.parse(await retry.json()).verses[0]?.words?.[0]?.availability?.lane).toBe('indexed')
})

it('ends a cancelled dictionary request while the shared catalogue is still loading', async () => {
  const laneAssets = indexAssets('catalogue.json', { roots: {}, lemmas: {}, entryFiles: {} })
  const started = Promise.withResolvers<void>()
  const catalogue = Promise.withResolvers<Uint8Array>()
  const lane = createBundledLaneReader(path => {
    if (!path.pathname.endsWith('/catalogue.json')) return laneAssets(path)
    started.resolve()
    return catalogue.promise
  })
  const handler = createQuranHandler({
    clientId: 'test-client', clientSecret: 'test-secret', environment: 'prelive', origins: [origin], lane,
  })
  const controller = new AbortController()
  const requestDictionary = (signal?: AbortSignal) => handler(new Request(
    'https://example.com/functions/v1/quran/v2/dictionary/entries?root=سمو', { headers: { Origin: origin }, signal },
  ))

  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
  try {
    const cancelled = requestDictionary(controller.signal)
    await started.promise
    const remaining = requestDictionary()
    controller.abort()
    await vi.advanceTimersByTimeAsync(0)
    expect((await Promise.race([cancelled, Promise.resolve(null)]))?.status).toBe(503)

    catalogue.resolve(await laneAssets(new URL('file:///catalogue.json')))
    const response = await remaining
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ entries: [], nextCursor: null })
  } finally {
    vi.useRealTimers()
  }
})

it('shares cold dictionary index reads across concurrent verses requests and caches the result', async () => {
  const laneAssets = indexAssets('catalogue.json', { roots: { سمو: ['n1'] }, lemmas: {}, entryFiles: {} })
  const mufradatAssets = indexAssets('index.json', { roots: { سمو: ['jk-l1'] }, lemmas: {} })
  const lane = createBundledLaneReader(laneAssets)
  const mufradat = createBundledMufradatReader(mufradatAssets)
  const requestPage = () => read(provider(), false, async () => bismiChapter(), {
    lane, mufradat,
  })
  const responses = await Promise.all([requestPage(), requestPage()])
  for (const response of [...responses, await requestPage()]) {
    expect(VersesResponseSchema.parse(await response.json()).verses[0]?.words?.[0]?.availability)
      .toEqual({ corpus: 'lexical', lane: 'indexed', mufradat: 'indexed' })
  }
  expect(laneAssets).toHaveBeenCalledTimes(2)
  expect(mufradatAssets).toHaveBeenCalledTimes(2)
})

it('publishes all three source statuses from the Edge Function entry point', async () => {
  await withChapterAssets(async directory => {
    providerRequests(provider())
    const laneAssets = indexAssets('catalogue.json', { roots: {}, lemmas: { 'ٱسْم': ['n1'] }, entryFiles: {} })
    const mufradatAssets = indexAssets('index.json', { roots: {}, lemmas: { 'ٱسْم': ['jk-l1'] } })
    const registered = Promise.withResolvers<(request: Request) => Promise<Response>>()
    const config = new Map([['QF_CLIENT_ID', 'test-client'], ['QF_CLIENT_SECRET', 'test-secret']])
    vi.stubGlobal('Deno', {
      env: { get: (key: string) => config.get(key) },
      serve: (handler: (request: Request) => Promise<Response>) => registered.resolve(handler),
      readFile: (path: URL) => {
        if (path.pathname.includes('/lane-data/')) return laneAssets(path)
        if (path.pathname.includes('/mufradat-data/')) return mufradatAssets(path)
        return readFile(join(directory, path.pathname.split('/data/')[1]))
      },
    })
    try {
      vi.resetModules()
      await import('../../quran/index.ts')
      const response = await (await registered.promise)(new Request('https://example.com/functions/v1/quran/v2/verses?chapter=1', { headers: { Origin: origin } }))
      expect(response.status).toBe(200)
      expect(VersesResponseSchema.parse(await response.json()).verses[0]?.words?.[0]?.availability)
        .toEqual({ corpus: 'lexical', lane: 'indexed', mufradat: 'indexed' })
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

it('publishes validated words with occurrence identity and excludes verse-end markers', async () => {
  const response = await read(provider())
  expect(response.status).toBe(200)
  const body = await response.json()
  expect(body).toMatchObject({ verses: [{ number: 1, words: [{ chapter: 1, verse: 1, position: 1, arabic: 'بِسْمِ', meaning: 'In (the) name', transliteration: "bis'mi" }] }] })
  expect(body.verses[0].words).toHaveLength(1)
})

it.each([
  { reason: 'word data is null', words: null },
  { reason: 'the word list is empty', words: [] },
  { reason: 'a word position is zero', words: [{ ...word(), position: 0 }] },
  { reason: 'word positions are duplicated', words: [word(), word()] },
  { reason: 'word positions do not start at one', words: [word(2)] },
  { reason: 'the Arabic word is empty', words: [{ ...word(), text_uthmani: '' }] },
  { reason: 'the word has an unknown character type', words: [{ ...word(), char_type_name: 'unknown' }] },
])('returns the verse without selectable words when $reason', async ({ words }) => {
  const response = await read(provider(words))
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ verses: [{ number: 1, arabic: 'بِسْمِ', translationHtml: 'In the name' }], translationName: 'M.A.S. Abdel Haleem', nextPage: null })
})

it('retains words with missing glosses and transliteration without inventing English meanings', async () => {
  const response = await read(provider([{ ...word(), translation: { text: 'اسم', language_name: 'arabic' }, transliteration: null }]))
  expect(await response.json()).toMatchObject({ verses: [{ words: [{ meaning: null, transliteration: null }] }] })
})

it('preserves the legacy provider response including its original word fields', async () => {
  const payload = provider()
  expect(await (await read(payload, true)).json()).toEqual(payload)
})

it('keeps repeated words as distinct occurrences ordered by provider position', async () => {
  const body = await (await read(provider([word(2), word(1)]))).json()
  expect(body.verses[0].words.map((item: { position: number }) => item.position)).toEqual([1, 2])
})

it('attaches source grammar to a validated occurrence while retaining its meaning', async () => {
  const response = await read(provider(), false, async () => bismiChapter())
  expect(response.status).toBe(200)
  const body = VersesResponseSchema.parse(await response.json())
  expect(body.verses[0]?.words?.[0]).toEqual({
    chapter: 1, verse: 1, position: 1, arabic: 'بِسْمِ', transliteration: "bis'mi",
    meaning: 'In (the) name',
    availability: { corpus: 'lexical', lane: 'unknown', mufradat: 'unknown' },
    grammar: {
      status: 'available',
      segments: [
        { kind: 'prefix', arabic: 'بِ', partOfSpeech: 'Preposition', root: null, lemma: null, features: ['Preposition prefix'] },
        { kind: 'stem', arabic: 'سْمِ', partOfSpeech: 'Noun', root: 'سمو', lemma: 'ٱسْم', features: ['Masculine', 'Genitive'] },
      ],
    },
  })
})

it('marks a missing occurrence unavailable without borrowing a repeated word’s analysis', async () => {
  const response = await read(provider([word(1), word(2)]), false, async () => bismiChapter())
  const body = VersesResponseSchema.parse(await response.json())
  expect(body.verses[0]?.words).toMatchObject([
    { grammar: { status: 'available' }, availability: { corpus: 'lexical' } },
    { grammar: { status: 'unavailable' }, availability: { corpus: 'missing', lane: 'unknown', mufradat: 'unknown' } },
  ])
})

it('identifies grammar-only occurrences without claiming dictionary coverage', async () => {
  const chapter = importCorpus('(1:1:1:1)\tbi\tP\tPREFIX|bi+').chapters['1']
  const response = await read(provider([{ ...word(), text_uthmani: 'بِ' }]), false, async () => chapter)
  expect(VersesResponseSchema.parse(await response.json()).verses[0]?.words).toMatchObject([
    { grammar: { status: 'available' }, availability: { corpus: 'grammar_only', lane: 'missing', mufradat: 'missing' } },
  ])
})

it('preserves verses and meanings when grammar data cannot be read', async () => {
  const response = await read(provider(), false, async () => { throw new Error('Missing packaged chapter') })
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({
    verses: [{ arabic: 'بِسْمِ', translationHtml: 'In the name', words: [{
      meaning: 'In (the) name',
      grammar: { status: 'temporarily_unavailable' },
      availability: { corpus: 'temporarily_unavailable', lane: 'unknown', mufradat: 'unknown' },
    }] }],
  })
})

it('returns meanings at the 200 ms grammar deadline when data never arrives', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
  try {
    const started = Promise.withResolvers<void>()
    const pending = read(provider(), false, async () => {
      started.resolve()
      return new Promise<unknown>(() => {})
    })
    await started.promise
    await vi.advanceTimersByTimeAsync(199)
    expect(await Promise.race([pending.then(() => 'returned'), Promise.resolve('waiting')])).toBe('waiting')
    await vi.advanceTimersByTimeAsync(1)
    const winner = await Promise.race([pending, Promise.resolve(null)])
    expect(winner).not.toBeNull()
    expect(await winner?.json()).toMatchObject({ verses: [{ words: [{ meaning: 'In (the) name', grammar: { status: 'temporarily_unavailable' } }] }] })
  } finally {
    vi.useRealTimers()
  }
})

it('withholds analysis that reaches its deadline before the timer can run', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  try {
    const response = await read(provider(), false, async () => {
      vi.setSystemTime(Date.now() + 200)
      return bismiChapter()
    })
    expect(await response.json()).toMatchObject({ verses: [{ words: [{ meaning: 'In (the) name', grammar: { status: 'temporarily_unavailable' } }] }] })
  } finally {
    vi.useRealTimers()
  }
})

it('keeps meanings when synchronous grammar validation runs past its budget', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  try {
    const chapter = bismiChapter()
    const response = await read(provider(), false, async () => ({
      ...chapter,
      get words() {
        vi.setSystemTime(Date.now() + 201)
        return chapter.words
      },
    }))
    expect(await response.json()).toMatchObject({ verses: [{ words: [{ meaning: 'In (the) name', grammar: { status: 'temporarily_unavailable' } }] }] })
  } finally {
    vi.useRealTimers()
  }
})

it('does not read grammar when a verse page has no selectable words', async () => {
  const readMorphology = vi.fn(async () => bismiChapter())
  const response = await read(provider(null), false, readMorphology)
  expect(await response.json()).toEqual({ verses: [{ number: 1, arabic: 'بِسْمِ', translationHtml: 'In the name' }], translationName: 'M.A.S. Abdel Haleem', nextPage: null })
  expect(readMorphology).not.toHaveBeenCalled()
})

it('retains available analysis completed just before the grammar deadline', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  try {
    const response = await read(provider(), false, async () => {
      vi.setSystemTime(Date.now() + 199)
      return bismiChapter()
    })
    expect(await response.json()).toMatchObject({ verses: [{ words: [{ grammar: { status: 'available' } }] }] })
  } finally {
    vi.useRealTimers()
  }
})

it('represents a real rootless particle as available analysis without inventing a root', async () => {
  const chapter = importCorpus('(1:7:8:1)\twa\tCONJ\tPREFIX|w:CONJ+\n(1:7:8:2)\tlaA\tNEG\tSTEM|POS:NEG|LEM:laA').chapters['1']
  const words = [...Array.from({ length: 7 }, (_, index) => word(index + 1)), { ...word(8), text_uthmani: 'وَلَا' }]
  const response = await read(provider(words, 7), false, async () => chapter)
  const body = await response.json()
  expect(body.verses[0].words[7].grammar).toMatchObject({ status: 'available', segments: [{ kind: 'prefix', root: null }, { kind: 'stem', root: null, lemma: 'لَا' }] })
})

it('withholds grammar when the authoritative word spelling differs from the corpus', async () => {
  const response = await read(provider([{ ...word(), text_uthmani: 'بسم' }]), false, async () => bismiChapter())
  expect(await response.json()).toMatchObject({ verses: [{ words: [{ arabic: 'بسم', grammar: { status: 'unavailable' } }] }] })
})

it('reads source analysis from an actual compressed chapter asset', async () => {
  await withChapterAssets(async directory => {
    const response = await read(provider(), false, createBundledMorphologyReader(readFile, pathToFileURL(`${directory}/`)))
    expect(await response.json()).toMatchObject({ verses: [{ words: [{ meaning: 'In (the) name', grammar: { status: 'available' } }] }] })
  })
})

it('preserves meanings instead of publishing analysis from an altered compressed asset', async () => {
  await withChapterAssets(async (directory, assets) => {
    const compressed = gzipSync(Buffer.from(assets.raw.toString().replace('سمو', 'جعل')))
    await writeFile(join(directory, 'morphology/1.json.gz'), compressed)
    await writeFile(join(directory, 'manifest.json'), JSON.stringify({ ...assets.manifest, chapters: assets.manifest.chapters.map(chapter => ({ ...chapter, compressedBytes: compressed.length })) }))
    const response = await read(provider(), false, createBundledMorphologyReader(readFile, pathToFileURL(`${directory}/`)))
    expect(await response.json()).toMatchObject({ verses: [{ words: [{ meaning: 'In (the) name', grammar: { status: 'temporarily_unavailable' } }] }] })
  })
})

it('withholds a decoded chapter that does not match its pinned content checksum', async () => {
  await withChapterAssets(async (directory, assets) => {
    await writeFile(join(directory, 'manifest.json'), JSON.stringify({ ...assets.manifest, chapters: assets.manifest.chapters.map(chapter => ({ ...chapter, sha256: '0'.repeat(64) })) }))
    const response = await read(provider(), false, createBundledMorphologyReader(readFile, pathToFileURL(`${directory}/`)))
    expect(await response.json()).toMatchObject({ verses: [{ words: [{ meaning: 'In (the) name', grammar: { status: 'temporarily_unavailable' } }] }] })
  })
})

it('keeps meanings when decoded chapter content exceeds its declared size', async () => {
  await withChapterAssets(async (directory, assets) => {
    const raw = Buffer.from(JSON.stringify({ ...bismiChapter(), padding: 'x'.repeat(1000) }))
    const compressed = gzipSync(raw)
    await writeFile(join(directory, 'morphology/1.json.gz'), compressed)
    await writeFile(join(directory, 'manifest.json'), JSON.stringify({ ...assets.manifest, chapters: assets.manifest.chapters.map(chapter => ({
      ...chapter, compressedBytes: compressed.length, compressedSha256: createHash('sha256').update(compressed).digest('hex'), sha256: createHash('sha256').update(raw).digest('hex'),
    })) }))
    const response = await read(provider(), false, createBundledMorphologyReader(readFile, pathToFileURL(`${directory}/`)))
    expect(await response.json()).toMatchObject({ verses: [{ words: [{ meaning: 'In (the) name', grammar: { status: 'temporarily_unavailable' } }] }] })
  })
})

it('rejects chapter metadata that advertises more decoded bytes than are present', async () => {
  await withChapterAssets(async (directory, assets) => {
    await writeFile(join(directory, 'manifest.json'), JSON.stringify({ ...assets.manifest, chapters: assets.manifest.chapters.map(chapter => ({ ...chapter, decodedBytes: chapter.decodedBytes + 1 })) }))
    const response = await read(provider(), false, createBundledMorphologyReader(readFile, pathToFileURL(`${directory}/`)))
    expect(await response.json()).toMatchObject({ verses: [{ words: [{ meaning: 'In (the) name', grammar: { status: 'temporarily_unavailable' } }] }] })
  })
})

it('rejects chapter metadata that disagrees with the compressed file size', async () => {
  await withChapterAssets(async (directory, assets) => {
    await writeFile(join(directory, 'manifest.json'), JSON.stringify({ ...assets.manifest, chapters: assets.manifest.chapters.map(chapter => ({ ...chapter, compressedBytes: chapter.compressedBytes + 1 })) }))
    const response = await read(provider(), false, createBundledMorphologyReader(readFile, pathToFileURL(`${directory}/`)))
    expect(await response.json()).toMatchObject({ verses: [{ words: [{ meaning: 'In (the) name', grammar: { status: 'temporarily_unavailable' } }] }] })
  })
})

it('refuses a manifest that permits a decoded chapter larger than 3 MB', async () => {
  await withChapterAssets(async (directory, assets) => {
    const raw = Buffer.concat([assets.raw, Buffer.alloc(3_000_001 - assets.raw.length, 32)])
    const compressed = gzipSync(raw)
    await writeFile(join(directory, 'morphology/1.json.gz'), compressed)
    await writeFile(join(directory, 'manifest.json'), JSON.stringify({ ...assets.manifest, chapters: [{
      chapter: 1, decodedBytes: raw.length, compressedBytes: compressed.length,
      sha256: createHash('sha256').update(raw).digest('hex'), compressedSha256: createHash('sha256').update(compressed).digest('hex'),
    }] }))
    const load = createBundledMorphologyReader(readFile, pathToFileURL(`${directory}/`))
    await expect(load(1, new AbortController().signal)).rejects.toMatchObject({
      name: 'ZodError',
      issues: [expect.objectContaining({ code: 'too_big', path: ['chapters', 0, 'decodedBytes'], maximum: 3_000_000 })],
    })
  })
})

it('stops reading chapter files when cancellation arrives with the manifest', async () => {
  await withChapterAssets(async directory => {
    const controller = new AbortController()
    const files = vi.fn(async (path: URL) => {
      const bytes = await readFile(path)
      controller.abort()
      return bytes
    })
    const load = createBundledMorphologyReader(files, pathToFileURL(`${directory}/`))
    await expect(load(1, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
    expect(files).toHaveBeenCalledTimes(1)
  })
})

it('does no asset work for a grammar request that is already cancelled', async () => {
  await withChapterAssets(async directory => {
    const controller = new AbortController()
    controller.abort()
    const files = vi.fn(readFile)
    const load = createBundledMorphologyReader(files, pathToFileURL(`${directory}/`))
    await expect(load(1, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
    expect(files).not.toHaveBeenCalled()
  })
})

it('registers a function entry point that serves grammar from its bundled data', async () => {
  await withChapterAssets(async directory => {
    const registered = Promise.withResolvers<(request: Request) => Promise<Response>>()
    const environment: Readonly<Record<string, string>> = { QF_CLIENT_ID: 'test-client', QF_CLIENT_SECRET: 'test-secret', QF_ENV: 'prelive', QF_ALLOWED_ORIGINS: origin }
    const packagedRoot = new URL('../../quran/data/', import.meta.url)
    const fixtureRoot = pathToFileURL(`${directory}/`)
    providerRequests(provider())
    vi.stubGlobal('Deno', {
      env: { get: (name: string) => environment[name] },
      serve: (handler: (request: Request) => Promise<Response>) => registered.resolve(handler),
      readFile: (path: URL) => {
        if (!path.href.startsWith(packagedRoot.href)) throw new Error('Unexpected bundled file path')
        return readFile(new URL(path.href.slice(packagedRoot.href.length), fixtureRoot))
      },
    })
    try {
      // The entry point reads its environment once during module evaluation.
      vi.resetModules()
      await import('../../quran/index.ts')
      const handler = await registered.promise
      const response = await handler(new Request('https://example.com/functions/v1/quran/v2/verses?chapter=1', { headers: { Origin: origin } }))
      expect(await response.json()).toMatchObject({ verses: [{ words: [{ meaning: 'In (the) name', grammar: { status: 'available' } }] }] })
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

it.each(['identity', 'segments', 'spelling'])('keeps meanings when corpus %s validation fails', async corruption => {
  const chapter = bismiChapter()
  const analysis = chapter.words['1:1:1']
  if (!analysis) throw new Error('Expected the imported occurrence')
  const altered = {
    ...chapter,
    words: { '1:1:1': {
      ...analysis,
      arabic: corruption === 'spelling' ? 'wrong text' : analysis.arabic,
      segments: corruption === 'segments' ? [...analysis.segments, ...analysis.segments] : analysis.segments.map(segment => ({ ...segment, id: corruption === 'identity' ? '1:1:2:1' : segment.id })),
    } },
  }
  const response = await read(provider(), false, async () => altered)
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({ verses: [{ words: [{ meaning: 'In (the) name', grammar: { status: 'temporarily_unavailable' } }] }] })
})
