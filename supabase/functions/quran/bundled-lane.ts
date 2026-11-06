import { z } from 'zod'
import { LaneEntryIdSchema, LaneEntrySchema, LaneResponseSchema, type LaneEntry, type LaneRequest, type LaneResponse } from '../../../packages/api-contracts/src/quran.ts'

export const LaneIndexSchema = z.object({
  roots: z.record(z.string(), z.array(LaneEntryIdSchema)),
  lemmas: z.record(z.string(), z.array(LaneEntryIdSchema)),
})
const ManifestSchema = z.object({ files: z.record(z.string(), z.string().regex(/^[a-f0-9]{64}$/)) })

async function checksum(raw: Uint8Array) {
  const digest = await crypto.subtle.digest('SHA-256', Uint8Array.from(raw))
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export function createBundledLaneReader(readFile: (path: URL) => Promise<Uint8Array>, directory = new URL('./lane-data/', import.meta.url)) {
  let manifest: z.infer<typeof ManifestSchema> | null = null
  let index: z.infer<typeof LaneIndexSchema> | null = null
  const cache = new Map<string, LaneEntry>()
  return async (query: LaneRequest, signal: AbortSignal): Promise<LaneResponse> => {
    signal.throwIfAborted()
    const assets = manifest ?? ManifestSchema.parse(JSON.parse(new TextDecoder().decode(await readFile(new URL('manifest.json', directory)))))
    manifest = assets
    async function read(path: string): Promise<unknown> {
      signal.throwIfAborted()
      const raw = await readFile(new URL(path, directory))
      if (await checksum(raw) !== assets.files[path]) throw new Error('Lane asset checksum mismatch')
      signal.throwIfAborted()
      return JSON.parse(new TextDecoder().decode(raw))
    }
    const lookup = index ?? LaneIndexSchema.parse(await read('index.json'))
    index = lookup
    const ids = (query.lemma ? lookup.lemmas[query.lemma] : undefined) ?? (query.root ? lookup.roots[query.root] : undefined) ?? []
    const entries = await Promise.all(ids.map(id => Promise.resolve(cache.get(id))
      .then(async cached => {
        const entry = cached ?? LaneEntrySchema.parse(await read(`lane/${id}.json`))
        cache.set(id, entry)
        return { id, entry }
      }).catch(() => ({ id, entry: null }))))
    signal.throwIfAborted()
    return LaneResponseSchema.parse({ entries })
  }
}
