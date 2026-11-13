import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { expect, it, vi } from 'vitest'
import { createQuranHandler } from '../../quran/handler.ts'
import { createBundledMufradatReader } from '../../quran/bundled-mufradat.ts'
import { MufradatEntrySchema, MufradatResponseSchema } from '../../../../packages/api-contracts/src/quran.ts'

const origin = 'https://usmaanalii.github.io'
function request(query = 'root=رحم') {
  return new Request(`https://example.com/functions/v1/quran/v2/mufradat?${query}`, { headers: { Origin: origin } })
}
async function withData(run: (directory: string) => Promise<void>, expanded = false) {
  const directory = await mkdtemp(join(tmpdir(), 'mufradat-backend-'))
  try {
    execFileSync('python3', [new URL('../../../../apps/playground/scripts/mufradat-data/import.py', import.meta.url).pathname, ...(expanded ? ['--expanded'] : []), '--output', directory])
    await run(directory)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}
function handler(directory: string) {
  const mufradat = createBundledMufradatReader(readFile, pathToFileURL(`${directory}/`))
  return createQuranHandler({ clientId: '', clientSecret: '', environment: 'prelive', origins: [origin],
    mufradat })
}

it('makes both verified source entries readable while preserving legacy ambiguity responses', async () => {
  await withData(async directory => {
    const read = handler(directory)
    const response = await read(new Request('https://example.com/functions/v1/quran/v2/mufradat/entries?root=بعد', { headers: { Origin: origin } }))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ status: 'multiple', entries: [{ id: 'jk-l1592', headword: 'بعد' }, { id: 'jk-l1605', headword: 'بعد' }] })
    expect(await (await read(request('root=بعد'))).json()).toEqual({ status: 'ambiguous', ids: ['jk-l1592', 'jk-l1605'] })
  }, true)
})

it('registers complete Mufradat delivery at the deployed entry point', async () => {
  await withData(async directory => {
    const registered = Promise.withResolvers<(request: Request) => Promise<Response>>()
    const packaged = new URL('../../quran/mufradat-data/', import.meta.url)
    vi.stubGlobal('Deno', {
      env: { get: () => undefined },
      serve: (read: (request: Request) => Promise<Response>) => registered.resolve(read),
      readFile: (path: URL) => {
        if (!path.href.startsWith(packaged.href)) throw new Error('Unexpected asset path')
        return readFile(new URL(path.href.slice(packaged.href.length), pathToFileURL(`${directory}/`)))
      },
    })
    try {
      vi.resetModules()
      await import('../../quran/index.ts')
      const response = await (await registered.promise)(new Request('https://example.com/functions/v1/quran/v2/mufradat/entries?root=بعد', { headers: { Origin: origin } }))
      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({ status: 'multiple', entries: [{ id: 'jk-l1592' }, { id: 'jk-l1605' }] })
    } finally {
      vi.unstubAllGlobals()
    }
  }, true)
})

it('serves newly reviewed Al-Baqarah entries from the normal release import', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mufradat-release-'))
  try {
    execFileSync('pnpm', ['--filter', 'playground', 'mufradat:data', '--output', directory], { stdio: 'pipe' })
    const read = handler(directory)
    const results = await Promise.all(['كتب', 'رزق', 'نفق', 'علم'].map(async root => {
      const response = await read(request(new URLSearchParams({ root }).toString()))
      expect(response.status).toBe(200)
      return MufradatResponseSchema.parse(await response.json())
    }))
    expect(results).toMatchObject([
      { status: 'matched', entry: { id: 'jk-l13005', headword: 'كتب' } },
      { status: 'matched', entry: { id: 'jk-l5926', headword: 'رزق' } },
      { status: 'matched', entry: { id: 'jk-l15505', headword: 'نفق' } },
      { status: 'matched', entry: { id: 'jk-l10519', headword: 'علم' } },
    ])
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

async function replaceAsset(directory: string, path: string, value: unknown) {
  const bytes = JSON.stringify(value)
  await writeFile(join(directory, path), bytes)
  const manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'))
  await writeFile(join(directory, 'manifest.json'), JSON.stringify({ ...manifest, files: { ...manifest.files, [path]: createHash('sha256').update(bytes).digest('hex') } }))
}

it('returns the Arabic entry without Quran Foundation credentials', async () => {
  await withData(async directory => {
    const response = await handler(directory)(request())
    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin)
    const result = MufradatResponseSchema.parse(await response.json())
    expect(result).toMatchObject({ status: 'matched', entry: { id: 'jk-l5840', headword: 'رحم', pages: ['PageV01P190', 'PageV01P191'] } })
  })
})

it('returns 503 when the source reader is not configured', async () => {
  const read = createQuranHandler({ clientId: '', clientSecret: '', environment: 'prelive', origins: [origin] })
  const response = await read(request())
  expect(response.status).toBe(503)
  expect(await response.json()).toEqual({ error: 'Mufradat temporarily unavailable.' })
})

it.each([
  { description: 'rejects a lookup without a root or lemma', query: '', status: 400 },
  { description: 'rejects an empty root', query: 'root=', status: 400 },
  { description: 'rejects a root longer than 16 characters', query: `root=${'ر'.repeat(17)}`, status: 400 },
  { description: 'rejects a lemma longer than 80 characters', query: `lemma=${'ر'.repeat(81)}`, status: 400 },
  { description: 'rejects repeated root parameters', query: 'root=رحم&root=حمد', status: 400 },
  { description: 'rejects surface-word matching parameters', query: 'root=رحم&surface=الرحيم', status: 400 },
  { description: 'accepts a root at the 16-character limit', query: `root=${'ر'.repeat(16)}`, status: 200 },
  { description: 'accepts a lemma at the 80-character limit', query: `lemma=${'ر'.repeat(80)}`, status: 200 },
])('$description', async ({ query, status }) => {
  await withData(async directory => {
    expect((await handler(directory)(request(query))).status).toBe(status)
  })
})

it('returns the Allah entry when its lemma overrides the root', async () => {
  await withData(async directory => {
    const response = await handler(directory)(request('root=رحم&lemma=ٱللَّه'))
    expect(MufradatResponseSchema.parse(await response.json())).toMatchObject({ status: 'matched', entry: { id: 'jk-l575', headword: 'اله' } })
  })
})

it('returns no match when the lemma mapping is explicitly empty', async () => {
  await withData(async directory => {
    await replaceAsset(directory, 'index.json', { roots: { رحم: ['jk-l5840'] }, lemmas: { 'رَحِيم': [] } })
    const response = await handler(directory)(request('root=رحم&lemma=رَحِيم'))
    expect(await response.json()).toEqual({ status: 'missing' })
  })
})

it('rejects changed entry text and succeeds after the original file is restored', async () => {
  await withData(async directory => {
    const path = join(directory, 'entries/jk-l5840.json')
    const original = await readFile(path)
    const entry = MufradatEntrySchema.parse(JSON.parse(original.toString('utf8')))
    await writeFile(path, JSON.stringify({ ...entry, paragraphs: ['Changed source wording'] }))
    const read = handler(directory)
    const failed = await read(request())
    expect(failed.status).toBe(503)
    expect(await failed.json()).toEqual({ error: 'Mufradat temporarily unavailable.' })
    await writeFile(path, original)
    expect(MufradatResponseSchema.parse(await (await read(request())).json())).toMatchObject({ status: 'matched', entry: { id: 'jk-l5840' } })
  })
})

it('rejects an entry whose identity differs from the reviewed mapping', async () => {
  await withData(async directory => {
    const path = 'entries/jk-l5840.json'
    const original = MufradatEntrySchema.parse(JSON.parse(await readFile(join(directory, path), 'utf8')))
    await replaceAsset(directory, path, { ...original, id: 'jk-l3990' })
    const response = await handler(directory)(request())
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'Mufradat temporarily unavailable.' })
  })
})

it('reuses loaded data for later lookups in the same function instance', async () => {
  await withData(async directory => {
    const { legacy: read } = createBundledMufradatReader(readFile, pathToFileURL(`${directory}/`))
    const result = await read({ root: 'رحم' }, new AbortController().signal)
    await writeFile(join(directory, 'entries/jk-l5840.json'), 'changed')
    await writeFile(join(directory, 'index.json'), 'changed')
    await writeFile(join(directory, 'manifest.json'), 'changed')
    expect(await read({ root: 'رحم' }, new AbortController().signal)).toEqual(result)
  })
})

it('returns ambiguous candidates when a key maps to several entries', async () => {
  await withData(async directory => {
    await replaceAsset(directory, 'index.json', { roots: { رحم: ['jk-l5840', 'jk-l3990'] }, lemmas: {} })
    const response = await handler(directory)(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ambiguous', ids: ['jk-l5840', 'jk-l3990'] })
  })
})

it('returns no match for an unreviewed root', async () => {
  await withData(async directory => {
    const response = await handler(directory)(request('root=بسم'))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'missing' })
  })
})
