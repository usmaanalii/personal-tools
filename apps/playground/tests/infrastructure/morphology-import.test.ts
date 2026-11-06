import { expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { generateData } from '../../scripts/quran-data/generate.ts'
import { importCorpus } from '../../scripts/quran-data/corpus.ts'
import { lookupMorphology, MorphologyChapterSchema } from '../../../../supabase/functions/quran/morphology-data.ts'
import { packageMorphology } from '../../scripts/quran-data/package.ts'
import { createBundledMorphologyReader, MorphologyAssetManifestSchema } from '../../../../supabase/functions/quran/bundled-morphology.ts'
import { pathToFileURL } from 'node:url'

// Verbatim v0.4 records. The complete unchanged source and notices live in data/quran/source/.
const bismi = () => '(1:1:1:1)\tbi\tP\tPREFIX|bi+\n(1:1:1:2)\tsomi\tN\tSTEM|POS:N|LEM:{som|ROOT:smw|M|GEN'

async function writePublication(directory: string, permissionEvidence: string | null) {
  const path = join(directory, 'publication.json')
  await writeFile(path, JSON.stringify({ permissionEvidence }))
  return path
}

it('groups the prefixed bismi occurrence without losing source features', () => {
  const result = importCorpus(bismi())
  expect(result.chapters['1']?.words['1:1:1']).toEqual({
    arabic: 'بِسْمِ',
    segments: [
      { id: '1:1:1:1', form: 'bi', arabic: 'بِ', kind: 'prefix', partOfSpeech: 'Preposition', root: null, lemma: null, features: ['Preposition prefix'], rawFeatures: 'PREFIX|bi+' },
      { id: '1:1:1:2', form: 'somi', arabic: 'سْمِ', kind: 'stem', partOfSpeech: 'Noun', root: 'سمو', lemma: 'ٱسْم', features: ['Masculine', 'Genitive'], rawFeatures: 'STEM|POS:N|LEM:{som|ROOT:smw|M|GEN' },
    ],
  })
})

it('keeps attached subject and object pronouns as ordered separate components', () => {
  const source = '(23:41:4:1)\tfa\tCONJ\tPREFIX|f:CONJ+\n(23:41:4:2)\tjaEalo\tV\tSTEM|POS:V|PERF|LEM:jaEala|ROOT:jEl|1P\n(23:41:4:3)\tna`\tPRON\tSUFFIX|PRON:1P\n(23:41:4:4)\thumo\tPRON\tSUFFIX|PRON:3MP'
  const word = importCorpus(source).chapters['23']?.words['23:41:4']
  expect(word?.arabic).toBe('فَجَعَلْنَٰهُمْ')
  expect(word?.segments.map(segment => [segment.kind, segment.partOfSpeech, segment.features])).toEqual([
    ['prefix', 'Conjunction', ['Conjunction prefix']],
    ['stem', 'Verb', ['Perfect', 'First person, plural']],
    ['suffix', 'Personal pronoun', ['First person, plural']],
    ['suffix', 'Personal pronoun', ['Third person, masculine, plural']],
  ])
})

it('imports the complete pinned corpus with Arabic conversion and readable annotation labels', () => {
  const source = execFileSync('unzip', ['-p', new URL('../../data/quran/source/quranic-corpus-morphology-0.4.zip', import.meta.url).pathname], { maxBuffer: 10_000_000 }).toString()
  const result = importCorpus(source)
  const segments = Object.values(result.chapters).flatMap(chapter => Object.values(chapter.words).flatMap(word => word.segments))
  expect(Object.keys(result.chapters)).toHaveLength(114)
  expect(segments).toHaveLength(source.split(/\r?\n/).filter(line => line.startsWith('(')).length)
  expect(segments.filter(segment => /[A-Za-z`{}]/.test([segment.arabic, segment.root, segment.lemma].join(''))).length).toBe(0)
  expect(segments.filter(segment => /^[A-Z]+$/.test(segment.partOfSpeech)).length).toBe(0)
  expect(segments.flatMap(segment => segment.features).filter(feature => /^(Prefixed |Corpus feature:)/.test(feature))).toEqual([])
  expect(result.chapters['2']?.words['2:13:9']?.segments[0]).toMatchObject({ features: ['Interrogative particle prefix'], rawFeatures: 'PREFIX|A:INTG+' })
  expect(segments.filter(segment => segment.features.length !== segment.rawFeatures.split('|').filter(token => !/^(PREFIX|STEM|SUFFIX|POS:|ROOT:|LEM:|SP:)/.test(token)).length).length).toBe(0)
})

it.each([
  `${bismi()}\n(1:1:1:2)\tsomi\tN\tSTEM|POS:N`,
  '(1:1:1:2)\tsomi\tN\tSTEM|POS:N',
  '(0:1:1:1)\tbi\tP\tPREFIX|bi+',
  '(115:1:1:1)\tbi\tP\tPREFIX|bi+',
  '(1:0:1:1)\tbi\tP\tPREFIX|bi+',
  '(1:287:1:1)\tbi\tP\tPREFIX|bi+',
  '(1:1:0:1)\tbi\tP\tPREFIX|bi+',
  '(1:1:1:1)\t?\tP\tSTEM|POS:P',
  '(1:1:1:1)\tbi\tUNKNOWN\tSTEM|POS:P',
  '(1:1:1:1)\tbi\tP\tPOS:P',
  '(1:1:1:1)\tbi\tP',
  'not a corpus record',
  '',
])('rejects malformed or ambiguous corpus records (%#)', source => {
  expect(() => importCorpus(source)).toThrow()
})

it('reports verified occurrences separately from corpus coverage and preserves the original notices', () => {
  const notices = '# Corpus notice\r\n# Tanzil notice\r\n\r\n'
  const result = importCorpus(`${notices}LOCATION\tFORM\tTAG\tFEATURES\r\n${bismi()}`, [
    { chapter: 1, verse: 1, position: 1, arabic: 'بِسْـمِ' },
    { chapter: 1, verse: 1, position: 2, arabic: 'ٱللَّهِ' },
  ])
  expect(result.chapters['1']?.notices).toBe(notices)
  expect(result.report).toEqual({
    corpusChapters: 1, corpusWords: 1, corpusSegments: 2, referenceOccurrences: 2,
    alignedOccurrences: 1, missingOccurrences: ['1:1:2'], mismatchedOccurrences: [], ambiguousOccurrences: [],
    unverifiedCorpusOccurrences: 0, referenceChapters: [1],
    normalization: 'NFC; presentation tatweel removed. No fuzzy matching.',
  })
})

it('does not count ambiguous or mismatched references as aligned', () => {
  const result = importCorpus(bismi(), [
    { chapter: 1, verse: 1, position: 1, arabic: 'بِسْمِ' },
    { chapter: 1, verse: 1, position: 1, arabic: 'بِسْمِ' },
    { chapter: 1, verse: 1, position: 1, arabic: 'بسم' },
  ])
  expect(result.report.alignedOccurrences).toBe(0)
  expect(result.report.ambiguousOccurrences).toEqual(['1:1:1'])
  expect(result.report.unverifiedCorpusOccurrences).toBe(1)
  expect(result.chapters['1']?.words['1:1:1']).toBeUndefined()
  expect(importCorpus(bismi(), [{ chapter: 1, verse: 1, position: 1, arabic: 'بسم' }]).report.mismatchedOccurrences).toEqual(['1:1:1'])
})

it('keeps repeated particles separate and never invents a root', () => {
  const result = importCorpus('(112:4:1:1)\twa\tCONJ\tPREFIX|w:CONJ+\n(112:4:1:2)\tlamo\tNEG\tSTEM|POS:NEG|LEM:lam\n(112:3:1:1)\tlamo\tNEG\tSTEM|POS:NEG|LEM:lam')
  const chapter = result.chapters['112']
  if (!chapter) throw new Error('Expected chapter 112')
  expect(lookupMorphology(chapter, { chapter: 112, verse: 3, position: 1, arabic: 'لَمْ' })?.segments[0]?.root).toBeNull()
  expect(lookupMorphology(chapter, { chapter: 112, verse: 4, position: 1, arabic: 'وَلَمْ' })?.segments.map(segment => segment.id)).toEqual(['112:4:1:1', '112:4:1:2'])
  expect(lookupMorphology(chapter, { chapter: 112, verse: 4, position: 1, arabic: 'لَمْ' })).toBeNull()
  expect(lookupMorphology(chapter, { chapter: 111, verse: 4, position: 1, arabic: 'وَلَمْ' })).toBeNull()
  expect(lookupMorphology(chapter, { chapter: 112, verse: 4, position: 2, arabic: 'وَلَمْ' })).toBeNull()
})

it('reproducibly generates separate chapter assets with pinned provenance and both source notices', async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'morphology-import-'))
  try {
    const publicationFile = await writePublication(outputDirectory, null)
    await generateData({ outputDirectory, publicationFile })
    const first = await readFile(join(outputDirectory, 'morphology/1.json'), 'utf8')
    const manifest = JSON.parse(await readFile(join(outputDirectory, 'manifest.json'), 'utf8'))
    expect(manifest.corpus).toMatchObject({ version: '0.4', zipSha256: 'fda26f87cc58b42fc992a3ad666a562805b636f34bcecb46326d048337ca7999' })
    expect(manifest.sources.map((source: { licence: string }) => source.licence)).toEqual(['GNU General Public License', 'Creative Commons BY-ND 3.0 Unported'])
    expect(manifest.distributionStatus).toBe('Converted-data publication requires confirmation')
    expect(manifest.chapters).toHaveLength(114)
    expect(manifest.chapters[0]).toMatchObject({ chapter: 1, sha256: createHash('sha256').update(first).digest('hex') })
    expect(JSON.parse(first).notices).toContain('Copyright (C) 2011 Kais Dukes')
    expect(JSON.parse(first).notices).toContain('Copyright (C) 2008-2009 Tanzil.info')
    expect(await readFile(join(outputDirectory, 'NOTICE.txt'), 'utf8')).toBe(JSON.parse(first).notices)
    expect(JSON.parse(await readFile(join(outputDirectory, 'coverage.json'), 'utf8')).referenceOccurrences).toBe(0)
    await generateData({ outputDirectory, publicationFile })
    expect(await readFile(join(outputDirectory, 'morphology/1.json'), 'utf8')).toBe(first)
    expect(JSON.parse(await readFile(join(outputDirectory, 'manifest.json'), 'utf8'))).toEqual(manifest)
  } finally {
    await rm(outputDirectory, { recursive: true, force: true })
  }
})

it('refuses an altered source archive before writing generated data', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'morphology-corrupt-'))
  try {
    const archive = join(directory, 'source.zip')
    await writeFile(archive, 'altered bytes')
    await expect(generateData({ outputDirectory: join(directory, 'output'), sourceArchive: archive })).rejects.toThrow('Source checksum mismatch')
    await expect(readFile(join(directory, 'output/manifest.json'))).rejects.toMatchObject({ code: 'ENOENT' })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

it('records the exact reference snapshot checksum and reports its alignment gaps', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'morphology-reference-'))
  try {
    const referenceFile = join(directory, 'reference.json')
    const reference = JSON.stringify({ sourceUrl: 'https://example.test/functions/v1/quran/v2/verses', retrievedAt: '2026-11-05T09:00:00.000Z', words: [
      { chapter: 1, verse: 1, position: 1, arabic: 'بِسْمِ' },
      { chapter: 1, verse: 1, position: 2, arabic: 'different spelling' },
    ] })
    await writeFile(referenceFile, reference)
    const report = await generateData({ outputDirectory: join(directory, 'output'), referenceFile })
    expect(report.alignedOccurrences).toBe(1)
    expect(report.mismatchedOccurrences).toEqual(['1:1:2'])
    expect(report.unverifiedCorpusOccurrences).toBe(report.corpusWords - 1)
    const manifest = JSON.parse(await readFile(join(directory, 'output/manifest.json'), 'utf8'))
    expect(manifest.reference).toEqual({ sourceUrl: 'https://example.test/functions/v1/quran/v2/verses', retrievedAt: '2026-11-05T09:00:00.000Z', sha256: createHash('sha256').update(reference).digest('hex') })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

it('runs the documented offline import command into a chosen output directory', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'morphology-command-'))
  try {
    const command = new URL('../../scripts/quran-data/import.mjs', import.meta.url).pathname
    const output = execFileSync(process.execPath, [command, '--output', directory], { encoding: 'utf8' })
    expect(JSON.parse(output).corpusChapters).toBe(114)
    expect(JSON.parse(await readFile(join(directory, 'morphology/1.json'), 'utf8')).words['1:1:1'].arabic).toBe('بِسْمِ')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

it('releases browser notices using the recorded published terms without distributing corpus chapter assets', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'morphology-notices-'))
  try {
    const command = new URL('../../scripts/quran-data/import.mjs', import.meta.url).pathname
    execFileSync(process.execPath, [command, '--notices-only', '--require-publication', '--output', directory], { encoding: 'utf8', stdio: 'pipe' })
    expect(await readdir(directory)).toEqual(['NOTICE.txt'])
    const notices = await readFile(join(directory, 'NOTICE.txt'), 'utf8')
    expect(notices).toContain('Copyright (C) 2011 Kais Dukes')
    expect(notices).toContain('Copyright (C) 2008-2009 Tanzil.info')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

it('refuses to prepare a browser directory containing old corpus assets without deleting them', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'morphology-stale-browser-'))
  try {
    await writeFile(join(directory, 'manifest.json'), 'Previous corpus manifest')
    await expect(generateData({ outputDirectory: directory, noticesOnly: true })).rejects.toThrow('Move existing corpus assets out of the browser notices directory')
    expect(await readFile(join(directory, 'manifest.json'), 'utf8')).toBe('Previous corpus manifest')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

it('generates release data using the supplied recorded permission evidence', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'morphology-reviewed-terms-'))
  try {
    const permissionEvidence = 'Published website-use terms: https://corpus.quran.com/download/'
    const publicationFile = await writePublication(directory, permissionEvidence)
    const outputDirectory = join(directory, 'output')
    await generateData({ outputDirectory, requirePublication: true, publicationFile })
    expect(JSON.parse(await readFile(join(outputDirectory, 'manifest.json'), 'utf8')).distributionStatus).toBe(permissionEvidence)
    expect(await readFile(join(outputDirectory, 'NOTICE.txt'), 'utf8')).toContain('Copyright (C) 2011 Kais Dukes')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

it('packages release chapters using the supplied recorded permission evidence', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'morphology-release-terms-'))
  try {
    const permissionEvidence = 'Published website-use terms: https://corpus.quran.com/download/'
    const publicationFile = await writePublication(directory, permissionEvidence)
    const outputDirectory = join(directory, 'output')
    await packageMorphology({ outputDirectory, publicationFile })
    const manifest = JSON.parse(await readFile(join(outputDirectory, 'manifest.json'), 'utf8'))
    expect(manifest).toMatchObject({ preview: false, distributionStatus: permissionEvidence })
    expect(MorphologyAssetManifestSchema.parse(manifest).chapters).toHaveLength(114)
    const load = createBundledMorphologyReader(readFile, pathToFileURL(`${outputDirectory}/`))
    expect(MorphologyChapterSchema.parse(await load(1, new AbortController().signal)).words['1:1:1']?.arabic).toBe('بِسْمِ')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

it('blocks release generation when recorded permission evidence is absent', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'morphology-publication-'))
  try {
    const publicationFile = await writePublication(directory, null)
    await expect(generateData({ outputDirectory: directory, requirePublication: true, publicationFile })).rejects.toThrow('Converted-data publication requires confirmation')
    await expect(readFile(join(directory, 'manifest.json'))).rejects.toMatchObject({ code: 'ENOENT' })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

it('blocks backend data packaging before writing files when publication permission is unconfirmed', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'morphology-backend-permission-'))
  try {
    const publicationFile = await writePublication(directory, null)
    await expect(packageMorphology({ outputDirectory: directory, publicationFile })).rejects.toThrow('Converted-data publication requires confirmation')
    await expect(readFile(join(directory, 'manifest.json'))).rejects.toMatchObject({ code: 'ENOENT' })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

it('creates a local preview package that the backend can read with pinned provenance', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'morphology-backend-preview-'))
  try {
    const publicationFile = await writePublication(directory, null)
    const report = await packageMorphology({ outputDirectory: directory, preview: true, publicationFile })
    expect(report.corpusChapters).toBe(114)
    const manifest: unknown = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'))
    expect(MorphologyAssetManifestSchema.parse(manifest).chapters).toHaveLength(114)
    expect(manifest).toMatchObject({ preview: true, corpus: { version: '0.4', zipSha256: 'fda26f87cc58b42fc992a3ad666a562805b636f34bcecb46326d048337ca7999' }, distributionStatus: 'Converted-data publication requires confirmation' })
    const load = createBundledMorphologyReader(readFile, pathToFileURL(`${directory}/`))
    expect(MorphologyChapterSchema.parse(await load(1, new AbortController().signal)).words['1:1:1']?.arabic).toBe('بِسْمِ')
    expect(await readFile(join(directory, 'NOTICE.txt'), 'utf8')).toContain('Copyright (C) 2011 Kais Dukes')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

it('keeps the pinned Foundation reference identity in backend package coverage', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'morphology-backend-reference-'))
  try {
    await packageMorphology({ outputDirectory: directory, preview: true })
    const reference = await readFile(new URL('../../data/quran/foundation-chapters-1-2.json', import.meta.url), 'utf8')
    expect(JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'))).toMatchObject({ reference: { sha256: createHash('sha256').update(reference).digest('hex') } })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

it('runs backend preview packaging from its documented command', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'morphology-backend-command-'))
  try {
    const command = new URL('../../scripts/quran-data/package.mjs', import.meta.url).pathname
    const output = execFileSync(process.execPath, [command, '--preview', '--output', directory], { encoding: 'utf8' })
    expect(JSON.parse(output).corpusChapters).toBe(114)
    expect(MorphologyAssetManifestSchema.parse(JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'))).compression).toBe('gzip')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
