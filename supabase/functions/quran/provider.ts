import { z } from 'zod'
import { ChaptersResponseSchema, VersesResponseSchema } from '../../../packages/api-contracts/src/quran.ts'

const ProviderChaptersSchema = z.object({
  chapters: z.array(z.object({
    id: z.number(),
    name_simple: z.string(),
    name_arabic: z.string(),
    translated_name: z.object({ name: z.string() }),
    verses_count: z.number(),
    revelation_place: z.enum(['makkah', 'madinah']),
  })),
})

export function mapChapters(payload: unknown) {
  const provider = ProviderChaptersSchema.parse(payload)
  return ChaptersResponseSchema.parse({
    chapters: provider.chapters.map(chapter => ({
      id: chapter.id,
      name: chapter.name_simple,
      arabic: chapter.name_arabic,
      meaning: chapter.translated_name.name,
      verses: chapter.verses_count,
      place: chapter.revelation_place === 'makkah' ? 'Meccan' : 'Medinan',
    })),
  })
}

const ProviderVersesSchema = z.object({
  verses: z.array(z.object({
    verse_number: z.number(),
    text_uthmani: z.string(),
    translations: z.array(z.object({ resource_id: z.number(), text: z.string() })),
  })),
  pagination: z.object({ next_page: z.number().nullable() }),
})

export function mapVerses(payload: unknown, translationId: number, page: number) {
  const provider = ProviderVersesSchema.parse(payload)
  if (provider.pagination.next_page !== null && provider.pagination.next_page !== page + 1) {
    throw new Error('Unexpected provider pagination')
  }
  return VersesResponseSchema.parse({
    verses: provider.verses.map(verse => ({
      number: verse.verse_number,
      arabic: verse.text_uthmani,
      translationHtml: verse.translations.find(translation => translation.resource_id === translationId)?.text,
    })),
    translationName: translationId === 85 ? 'M.A.S. Abdel Haleem' : 'Dr. Mustafa Khattab, The Clear Quran',
    nextPage: provider.pagination.next_page,
  })
}
