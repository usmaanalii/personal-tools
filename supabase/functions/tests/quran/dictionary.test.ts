import { expect, it } from 'vitest'
import { createQuranHandler } from '../../quran/handler.ts'
import { LaneResponseSchema } from '../../../../packages/api-contracts/src/quran.ts'
import { createBundledLaneReader } from '../../quran/bundled-lane.ts'
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

async function withLaneData(run: (reader: ReturnType<typeof createBundledLaneReader>, directory: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'lane-backend-'))
  try {
    execFileSync('python3', [new URL('../../../../apps/playground/scripts/lane-data/import.py', import.meta.url).pathname, '--output', directory])
    await run(createBundledLaneReader(readFile, pathToFileURL(`${directory}/`)), directory)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

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
  [`root=${'ر'.repeat(15)}`, 200], [`root=${'ر'.repeat(16)}`, 200], [`root=${'ر'.repeat(17)}`, 400],
  [`lemma=${'ر'.repeat(79)}`, 200], [`lemma=${'ر'.repeat(80)}`, 200], [`lemma=${'ر'.repeat(81)}`, 400],
  ['', 400], ['root=', 400], ['lemma=', 400], ['root=سمو&root=رحم', 400],
  ['lemma=ٱسْم&surface=بسم', 400], ['url=https://untrusted.example', 400],
])('bounds dictionary queries before reading content: %s', async (query, status) => {
  const handler = createHandler({ readDictionary: async () => ({ entries: [] }) })
  const response = await handler(request(query))
  expect(response.status).toBe(status)
  expect(await response.json()).toEqual(status === 200 ? { entries: [] } : { error: expect.any(String) })
})

it('applies existing read-only CORS policy and hides dictionary read failures', async () => {
  const handler = createHandler({ readDictionary: async () => { throw new Error('Private server filename') } })
  expect((await handler(new Request(request().url, { headers: { Origin: 'https://untrusted.example' } }))).status).toBe(403)
  expect((await handler(new Request(request().url, { method: 'POST', headers: { Origin: origin } }))).status).toBe(405)
  expect((await handler(new Request(request().url, { method: 'OPTIONS', headers: { Origin: origin } }))).status).toBe(204)
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
    expect(result.entries[0]?.entry).toMatchObject({ headword: 'اِسْمٌ', root: 'سمو', file: 'us0.xml' })
    expect(JSON.stringify(result)).toContain('name')
    expect(JSON.stringify(result)).toContain('sense')
  })
})
