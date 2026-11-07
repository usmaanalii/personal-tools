import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { MufradatEntrySchema } from '@scratch-pages/api-contracts/quran'
import { reviewedMufradatEntries } from '../../data/mufradat/reviewed-entries.test-data'

const importer = new URL('../../scripts/mufradat-data/import.py', import.meta.url).pathname

async function importedFiles(directory: string, relative = ''): Promise<{ path: string; bytes: Buffer }[]> {
  const entries = await readdir(join(directory, relative), { withFileTypes: true })
  const files = await Promise.all(entries.map(async entry => {
    const path = join(relative, entry.name)
    if (entry.isDirectory()) return importedFiles(directory, path)
    return [{ path, bytes: await readFile(join(directory, path)) }]
  }))
  return files.flat().toSorted((first, second) => first.path.localeCompare(second.path))
}

it.each(reviewedMufradatEntries)('preserves the reviewed text and source references for $headword', async expected => {
  const output = await mkdtemp(join(tmpdir(), 'mufradat-'))
  try {
    execFileSync('python3', [importer, '--output', output])
    const entry = MufradatEntrySchema.parse(JSON.parse(await readFile(join(output, `entries/${expected.id}.json`), 'utf8')))
    expect(entry).toEqual(MufradatEntrySchema.parse(expected))
  } finally {
    await rm(output, { recursive: true, force: true })
  }
})

it('preserves poetry wording while removing OpenITI verse separators from the reading text', async () => {
  const output = await mkdtemp(join(tmpdir(), 'mufradat-poetry-'))
  try {
    execFileSync('python3', [importer, '--output', output])
    const name = MufradatEntrySchema.parse(JSON.parse(await readFile(join(output, 'entries/jk-l7446.json'), 'utf8')))
    expect(name.raw).toContain('سماؤه % % فريا')
    expect(name.paragraphs[1]).toBe('( وأحمر كالديباج أما سماؤه فريا وأما أرضه فمحول )')
  } finally {
    await rm(output, { recursive: true, force: true })
  }
})

it('removes entries that are no longer in the reviewed set', async () => {
  const output = await mkdtemp(join(tmpdir(), 'mufradat-rebuild-'))
  try {
    execFileSync('python3', [importer, '--output', output])
    await writeFile(join(output, 'entries/jk-l99999.json'), 'stale')
    execFileSync('python3', [importer, '--output', output])
    expect((await readdir(join(output, 'entries'))).toSorted()).toEqual(['jk-l3990.json', 'jk-l575.json', 'jk-l5840.json', 'jk-l7446.json'])
  } finally {
    await rm(output, { recursive: true, force: true })
  }
})

it('refuses to write browser notices over reference data', async () => {
  const output = await mkdtemp(join(tmpdir(), 'mufradat-stale-browser-'))
  try {
    await writeFile(join(output, 'index.json'), 'backend data')
    expect(() => execFileSync('python3', [importer, '--notices-only', '--output', output], { stdio: 'pipe' })).toThrow(/Move reference assets out of the browser notices directory/)
    expect(await readFile(join(output, 'index.json'), 'utf8')).toBe('backend data')
  } finally {
    await rm(output, { recursive: true, force: true })
  }
})

it('writes only attribution notices for the browser', async () => {
  const output = await mkdtemp(join(tmpdir(), 'mufradat-notices-'))
  try {
    execFileSync('python3', [importer, '--notices-only', '--output', output])
    expect(await readdir(output)).toEqual(['NOTICE.txt'])
    expect(await readFile(join(output, 'NOTICE.txt'), 'utf8')).toContain('CC BY-NC-SA 4.0')
  } finally {
    await rm(output, { recursive: true, force: true })
  }
})

it('rejects an entry that extends into the next headword', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mufradat-review-'))
  try {
    const mappings = join(directory, 'mappings.json')
    await writeFile(mappings, JSON.stringify({ entries: [{ start: 5840, end: 5861, headword: 'رحم', next: 'رخا' }], roots: { رحم: ['jk-l5840'] }, lemmas: {} }))
    expect(() => execFileSync('python3', [importer, '--mappings', mappings, '--output', join(directory, 'output')], { stdio: 'pipe' })).toThrow(/Entry boundary mismatch/)
    expect(await readdir(directory)).toEqual(['mappings.json'])
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

it('rejects a mapping to an entry that was not imported', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mufradat-reference-'))
  try {
    const mappings = join(directory, 'mappings.json')
    await writeFile(mappings, JSON.stringify({ entries: [], roots: { رحم: ['jk-l5840'] }, lemmas: {} }))
    expect(() => execFileSync('python3', [importer, '--mappings', mappings, '--output', join(directory, 'output')], { stdio: 'pipe' })).toThrow(/Mapping references an absent entry/)
    expect(await readdir(directory)).toEqual(['mappings.json'])
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

it('rejects a modified source before writing any assets', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mufradat-corrupt-'))
  try {
    const source = join(directory, 'source.txt')
    await writeFile(source, 'unreviewed source')
    expect(() => execFileSync('python3', [importer, '--source', source, '--output', join(directory, 'output')], { stdio: 'pipe' })).toThrow(/Source checksum mismatch/)
    expect(await readdir(directory)).toEqual(['source.txt'])
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

it('maps name and Allah spellings to their reviewed entries', async () => {
  const output = await mkdtemp(join(tmpdir(), 'mufradat-matches-'))
  try {
    execFileSync('python3', [importer, '--output', output])
    const index: unknown = JSON.parse(await readFile(join(output, 'index.json'), 'utf8'))
    expect(index).toEqual({ roots: { رحم: ['jk-l5840'], حمد: ['jk-l3990'], سمو: ['jk-l7446'] }, lemmas: { 'ٱسْم': ['jk-l7446'], 'ٱللَّه': ['jk-l575'] } })
  } finally {
    await rm(output, { recursive: true, force: true })
  }
})

it('records the pinned source, licence and checksums of the generated files', async () => {
  const output = await mkdtemp(join(tmpdir(), 'mufradat-provenance-'))
  try {
    execFileSync('python3', [importer, '--output', output])
    const manifest: unknown = JSON.parse(await readFile(join(output, 'manifest.json'), 'utf8'))
    const files = ['index.json', 'NOTICE.txt', ...reviewedMufradatEntries.map(entry => `entries/${entry.id}.json`)]
    const hashes = await Promise.all(files.map(async path => [path, createHash('sha256').update(await readFile(join(output, path))).digest('hex')]))
    expect(manifest).toEqual({ sourceId: '0502RaghibIsbahani.Mufradat.JK001150-ara1', commit: '6290621b58e063ed1aa47ffd0a6fc1630191e7cb', sourceSha256: '925bfcafa3cfe5ec467f7ac8c2b13228f8c34fc725b792c2d27e077fc17a88f9', licence: 'CC BY-NC-SA 4.0', files: Object.fromEntries(hashes) })
    expect(await readFile(join(output, 'NOTICE.txt'), 'utf8')).toContain('https://creativecommons.org/licenses/by-nc-sa/4.0/')
  } finally {
    await rm(output, { recursive: true, force: true })
  }
})

it('produces identical files in independent imports', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mufradat-reproducibility-'))
  try {
    const first = join(directory, 'first')
    const second = join(directory, 'second')
    execFileSync('python3', [importer, '--output', first])
    execFileSync('python3', [importer, '--output', second])
    const files = await importedFiles(first)
    expect(files.map(file => file.path)).toContain('manifest.json')
    expect(await importedFiles(second)).toEqual(files)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
