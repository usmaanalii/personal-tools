import { z } from 'zod'
import type { MorphologyReader } from './morphology.ts'

export const MorphologyAssetManifestSchema = z.object({
  version: z.literal(1), compression: z.literal('gzip'),
  chapters: z.array(z.object({
    chapter: z.number().int().min(1).max(114),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    compressedSha256: z.string().regex(/^[a-f0-9]{64}$/),
    // Pinned v0.4 chapters fit below this decoded-size cap.
    decodedBytes: z.number().int().positive().max(3_000_000),
    compressedBytes: z.number().int().positive(),
  })).min(1).max(114),
})

async function checksum(value: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', Uint8Array.from(value))
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export function createBundledMorphologyReader(readFile: (path: URL) => Promise<Uint8Array>, directory = new URL('./data/', import.meta.url)): MorphologyReader {
  return async (chapter, signal) => {
    signal.throwIfAborted()
    const manifestBytes = await readFile(new URL('manifest.json', directory))
    signal.throwIfAborted()
    const manifest = MorphologyAssetManifestSchema.parse(JSON.parse(new TextDecoder().decode(manifestBytes)))
    const asset = manifest.chapters.find(record => record.chapter === chapter)
    if (!asset) throw new Error('Chapter is absent from the morphology manifest')
    const compressed = Uint8Array.from(await readFile(new URL(`morphology/${chapter}.json.gz`, directory)))
    if (compressed.byteLength !== asset.compressedBytes) throw new Error('Compressed morphology size mismatch')
    if (await checksum(compressed) !== asset.compressedSha256) throw new Error('Compressed morphology checksum mismatch')
    const decoded = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'), { signal })
    let decodedBytes = 0
    const bounded = decoded.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        decodedBytes += chunk.byteLength
        if (decodedBytes > asset.decodedBytes) throw new Error('Decoded morphology exceeds its declared size')
        controller.enqueue(chunk)
      },
    }))
    const raw = new Uint8Array(await new Response(bounded).arrayBuffer())
    if (raw.byteLength !== asset.decodedBytes) throw new Error('Decoded morphology size mismatch')
    if (await checksum(raw) !== asset.sha256) throw new Error('Decoded morphology checksum mismatch')
    return JSON.parse(new TextDecoder().decode(raw))
  }
}
