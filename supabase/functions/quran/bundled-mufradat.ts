import { z } from 'zod'
import { MufradatEntryIdSchema, MufradatEntrySchema, MufradatResponseSchema, type MufradatEntry, type MufradatRequest } from '../../../packages/api-contracts/src/quran.ts'

const IndexSchema = z.object({ roots: z.record(z.string(), z.array(MufradatEntryIdSchema)), lemmas: z.record(z.string(), z.array(MufradatEntryIdSchema)) })
const ManifestSchema = z.object({ files: z.record(z.string(), z.string().regex(/^[a-f0-9]{64}$/)) })

export function createBundledMufradatReader(readFile: (path: URL) => Promise<Uint8Array>, directory = new URL('./mufradat-data/', import.meta.url)) {
  let cachedManifest: z.infer<typeof ManifestSchema> | null = null
  let cachedIndex: z.infer<typeof IndexSchema> | null = null
  const entries = new Map<string, MufradatEntry>()
  return async (query: MufradatRequest, signal: AbortSignal) => {
    signal.throwIfAborted()
    const manifest = cachedManifest ?? ManifestSchema.parse(JSON.parse(new TextDecoder().decode(await readFile(new URL('manifest.json', directory)))))
    cachedManifest = manifest
    async function read(path: string): Promise<unknown> {
      const raw = await readFile(new URL(path, directory))
      const digest = await crypto.subtle.digest('SHA-256', Uint8Array.from(raw))
      const checksum = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
      if (checksum !== manifest.files[path]) throw new Error('Mufradat asset checksum mismatch')
      signal.throwIfAborted()
      return JSON.parse(new TextDecoder().decode(raw))
    }
    const index = cachedIndex ?? IndexSchema.parse(await read('index.json'))
    cachedIndex = index
    const ids = (query.lemma ? index.lemmas[query.lemma] : undefined) ?? (query.root ? index.roots[query.root] : undefined) ?? []
    if (ids.length === 0) return MufradatResponseSchema.parse({ status: 'missing' })
    if (ids.length > 1) return MufradatResponseSchema.parse({ status: 'ambiguous', ids })
    const id = ids[0]
    const entry = entries.get(id) ?? MufradatEntrySchema.parse(await read(`entries/${id}.json`))
    if (entry.id !== id) throw new Error('Mufradat entry identity mismatch')
    entries.set(id, entry)
    return MufradatResponseSchema.parse({ status: 'matched', entry })
  }
}
