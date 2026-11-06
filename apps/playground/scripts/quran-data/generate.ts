import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { importCorpus } from './corpus.ts'
import { z } from 'zod'
import { WordOccurrenceSchema } from '../../../../supabase/functions/quran/morphology-data.ts'

const sourceZip = fileURLToPath(new URL('../../data/quran/source/quranic-corpus-morphology-0.4.zip', import.meta.url))
const sha256 = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex')

const ReferenceSchema = z.object({ sourceUrl: z.url(), retrievedAt: z.string().datetime(), words: z.array(WordOccurrenceSchema) })

export async function generateData({ outputDirectory, sourceArchive = sourceZip, referenceFile, requirePublication = false, noticesOnly = false, publicationFile = fileURLToPath(new URL('../../data/quran/publication.json', import.meta.url)) }: { readonly outputDirectory: string; readonly sourceArchive?: string; readonly referenceFile?: string; readonly requirePublication?: boolean; readonly noticesOnly?: boolean; readonly publicationFile?: string }) {
  const publication = z.object({ permissionEvidence: z.string().trim().min(1).nullable() }).parse(JSON.parse(await readFile(publicationFile, 'utf8')))
  const distributionStatus = publication.permissionEvidence ?? 'Converted-data publication requires confirmation'
  if (requirePublication && !publication.permissionEvidence) throw new Error(distributionStatus)
  const zip = await readFile(sourceArchive)
  if (sha256(zip) !== 'fda26f87cc58b42fc992a3ad666a562805b636f34bcecb46326d048337ca7999') throw new Error('Source checksum mismatch')
  const text = execFileSync('unzip', ['-p', sourceArchive], { maxBuffer: 10_000_000 }).toString('utf8')
  const referenceText = referenceFile ? await readFile(referenceFile, 'utf8') : null
  const reference = referenceText ? ReferenceSchema.parse(JSON.parse(referenceText)) : null
  const result = importCorpus(text, reference?.words)
  if (noticesOnly) {
    await mkdir(outputDirectory, { recursive: true })
    if ((await readdir(outputDirectory)).some(name => name !== 'NOTICE.txt')) throw new Error('Move existing corpus assets out of the browser notices directory')
    await writeFile(join(outputDirectory, 'NOTICE.txt'), result.notices)
    return result.report
  }
  await mkdir(join(outputDirectory, 'morphology'), { recursive: true })
  const chapters = await Promise.all(Object.values(result.chapters).map(async chapter => {
    const data = `${JSON.stringify(chapter)}\n`
    const path = `morphology/${chapter.chapter}.json`
    await writeFile(join(outputDirectory, path), data)
    return { chapter: chapter.chapter, path, sha256: sha256(data), words: Object.keys(chapter.words).length }
  }))
  const manifest = {
    version: 1,
    corpus: { version: '0.4', zipSha256: sha256(zip), textSha256: sha256(text), source: 'https://corpus.quran.com/download/' },
    sources: [
      { name: 'Quranic Arabic Corpus', version: '0.4', copyright: 'Copyright (C) 2011 Kais Dukes', licence: 'GNU General Public License', url: 'https://corpus.quran.com/', terms: 'https://corpus.quran.com/download/' },
      { name: 'Tanzil Quran Text (Uthmani)', version: '1.0.2', copyright: 'Copyright (C) 2008-2009 Tanzil.info', licence: 'Creative Commons BY-ND 3.0 Unported', url: 'https://tanzil.info/', terms: 'Original notices preserved in chapter assets and unchanged source ZIP' },
    ],
    distributionStatus,
    reference: reference && referenceText ? { sourceUrl: reference.sourceUrl, retrievedAt: reference.retrievedAt, sha256: sha256(referenceText) } : null,
    chapters,
  }
  await Promise.all([
    writeFile(join(outputDirectory, 'NOTICE.txt'), result.notices),
    writeFile(join(outputDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`),
    writeFile(join(outputDirectory, 'coverage.json'), `${JSON.stringify(result.report, null, 2)}\n`),
  ])
  return result.report
}
