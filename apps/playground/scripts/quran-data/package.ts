import { generateData } from './generate.ts'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { MorphologyAssetManifestSchema } from '../../../../supabase/functions/quran/bundled-morphology.ts'

export async function packageMorphology({ outputDirectory, preview = false, referenceFile = fileURLToPath(new URL('../../data/quran/foundation-chapters-1-2.json', import.meta.url)), publicationFile }: { readonly outputDirectory: string; readonly preview?: boolean; readonly referenceFile?: string; readonly publicationFile?: string }) {
  const temporary = await mkdtemp(join(tmpdir(), 'quran-package-'))
  try {
    const report = await generateData({ outputDirectory: temporary, requirePublication: !preview, referenceFile, publicationFile })
    const provenance = z.record(z.string(), z.unknown()).parse(JSON.parse(await readFile(join(temporary, 'manifest.json'), 'utf8')))
    await mkdir(join(outputDirectory, 'morphology'), { recursive: true })
    const chapters = await Promise.all(Array.from({ length: report.corpusChapters }, async (_, index) => {
      const chapter = index + 1
      const raw = await readFile(join(temporary, `morphology/${chapter}.json`))
      const compressed = gzipSync(raw, { level: 6 })
      await writeFile(join(outputDirectory, `morphology/${chapter}.json.gz`), compressed)
      return {
        chapter, decodedBytes: raw.byteLength, compressedBytes: compressed.byteLength,
        sha256: createHash('sha256').update(raw).digest('hex'),
        compressedSha256: createHash('sha256').update(compressed).digest('hex'),
      }
    }))
    const manifest = { ...provenance, ...MorphologyAssetManifestSchema.parse({ ...provenance, compression: 'gzip', chapters }), preview }
    await Promise.all(['NOTICE.txt', 'coverage.json'].map(async name => {
      await writeFile(join(outputDirectory, name), await readFile(join(temporary, name)))
    }))
    // Publish metadata last so an interrupted rerun cannot validate mixed chapter bytes.
    await writeFile(join(outputDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
    return report
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
}
