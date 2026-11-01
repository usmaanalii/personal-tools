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
    words: z.unknown().optional(),
  })),
  pagination: z.object({ next_page: z.number().nullable() }),
})

const ProviderWordsSchema = z.array(z.object({
  position: z.number().int().positive(),
  text_uthmani: z.string().trim().min(1),
  char_type_name: z.enum(['word', 'end']),
  translation: z.object({ text: z.string(), language_name: z.string() }).nullish().catch(null),
  transliteration: z.object({ text: z.string() }).nullish().catch(null),
})).min(1)

function mapWords(payload: unknown, chapter: number, verse: number) {
  const parsed = ProviderWordsSchema.safeParse(payload)
  if (!parsed.success) return undefined
  const records = parsed.data.sort((a, b) => a.position - b.position)
  if (!records.every((word, index) => word.position === index + 1 && (word.char_type_name !== 'end' || index === records.length - 1))) return undefined
  return records.filter(word => word.char_type_name === 'word').map(word => ({
    chapter, verse, position: word.position, arabic: word.text_uthmani,
    meaning: word.translation?.language_name.toLowerCase() === 'english' ? word.translation.text.trim() || null : null,
    transliteration: word.transliteration?.text.trim() || null,
  }))
}

export function mapVerses(payload: unknown, translationId: number, page: number, chapter: number) {
  const provider = ProviderVersesSchema.parse(payload)
  if (provider.pagination.next_page !== null && provider.pagination.next_page !== page + 1) {
    throw new Error('Unexpected provider pagination')
  }
  return VersesResponseSchema.parse({
    verses: provider.verses.map(verse => ({
      number: verse.verse_number,
      arabic: verse.text_uthmani,
      translationHtml: verse.translations.find(translation => translation.resource_id === translationId)?.text,
      words: mapWords(verse.words, chapter, verse.verse_number),
    })),
    translationName: translationId === 85 ? 'M.A.S. Abdel Haleem' : 'Dr. Mustafa Khattab, The Clear Quran',
    nextPage: provider.pagination.next_page,
  })
}
