import { z } from 'zod'
import { GrammarSegmentSchema, WordSchema as QuranWordSchema } from '../../../packages/api-contracts/src/quran.ts'

const SegmentSchema = GrammarSegmentSchema.extend({
  id: z.string(), form: z.string(), rawFeatures: z.string(),
})
const WordSchema = z.object({ arabic: z.string().min(1), segments: z.array(SegmentSchema).min(1) })
  .refine(word => comparableArabic(word.segments.map(segment => segment.arabic).join('')) === comparableArabic(word.arabic), 'Segment spelling mismatch')
export const MorphologyChapterSchema = z.object({
  version: z.literal(1), chapter: z.number().int().min(1).max(114), notices: z.string(),
  words: z.record(z.string(), WordSchema),
}).refine(chapter => Object.entries(chapter.words).every(([key, word]) => {
  if (!new RegExp(`^${chapter.chapter}:[1-9]\\d*:[1-9]\\d*$`).test(key)) return false
  return word.segments.every((segment, index) => segment.id === `${key}:${index + 1}`)
}), 'Invalid occurrence identities')
export type MorphologySegment = z.infer<typeof SegmentSchema>
export type MorphologyWord = z.infer<typeof WordSchema>
export type MorphologyChapter = z.infer<typeof MorphologyChapterSchema>

export const WordOccurrenceSchema = QuranWordSchema.pick({ chapter: true, verse: true, position: true, arabic: true })
export type WordOccurrence = z.infer<typeof WordOccurrenceSchema>
export const occurrenceKey = (word: WordOccurrence) => `${word.chapter}:${word.verse}:${word.position}`
export const comparableArabic = (value: string) => value.normalize('NFC').replace(/ـ/g, '')

export function lookupMorphology(chapter: MorphologyChapter, word: WordOccurrence): MorphologyWord | null {
  const analysis = chapter.words[occurrenceKey(word)]
  if (chapter.chapter !== word.chapter || !analysis) return null
  return comparableArabic(analysis.arabic) === comparableArabic(word.arabic) ? analysis : null
}
