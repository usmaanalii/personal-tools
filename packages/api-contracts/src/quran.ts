import { z } from 'zod'

export const ChapterSchema = z.object({
  id: z.number().int().min(1).max(114),
  name: z.string().trim().min(1),
  arabic: z.string().trim().min(1),
  meaning: z.string().trim().min(1),
  verses: z.number().int().min(1).max(286),
  place: z.enum(['Meccan', 'Medinan']),
})
export type Chapter = z.infer<typeof ChapterSchema>

export const ChaptersResponseSchema = z.object({
  chapters: z.array(ChapterSchema).min(1).max(114)
    .refine(chapters => new Set(chapters.map(chapter => chapter.id)).size === chapters.length, 'Duplicate chapter IDs'),
})


export const VersesRequestSchema = z.object({
  chapter: z.number().int().min(1).max(114),
  page: z.number().int().min(1).max(15).default(1),
})
export type VersesRequest = z.input<typeof VersesRequestSchema>

export const VerseSchema = z.object({
  number: z.number().int().min(1).max(286),
  arabic: z.string().trim().min(1),
  // Provider markup is untrusted. Consumers must render inert text or sanitize it.
  translationHtml: z.string().trim().min(1),
})
export const VersesResponseSchema = z.object({
  verses: z.array(VerseSchema).min(1).max(20),
  translationName: z.string().trim().min(1),
  nextPage: z.number().int().min(1).max(15).nullable(),
})
export type VersesResponse = z.infer<typeof VersesResponseSchema>
