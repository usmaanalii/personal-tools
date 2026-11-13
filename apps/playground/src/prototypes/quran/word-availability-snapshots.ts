import type { QuranWord } from '@scratch-pages/api-contracts/quran'

type Availability = NonNullable<QuranWord['availability']>
type CapturedWord = readonly [arabic: string, corpus: Availability['corpus'], lane: Availability['lane'], mufradat: Availability['mufradat']]

type Snapshot = {
  readonly reference: string
  readonly heading: string
  readonly words: readonly CapturedWord[]
}

// Captured from hosted quran v13 on 2026-11-13, pages 1–2 of chapters 1 and 2.
// Word text and statuses are verbatim from the verses API, in provider order.
export const availabilitySnapshots: readonly Snapshot[] = [
  { reference: "1:1", heading: "Al-Fatihah 1:1", words: [
    ["بِسْمِ", "lexical", "indexed", "indexed"],
    ["ٱللَّهِ", "lexical", "indexed", "indexed"],
    ["ٱلرَّحْمَـٰنِ", "lexical", "multiple", "indexed"],
    ["ٱلرَّحِيمِ", "lexical", "multiple", "indexed"],
  ] },
  { reference: "2:4", heading: "Al-Baqarah 2:4", words: [
    ["وَٱلَّذِينَ", "lexical", "missing", "missing"],
    ["يُؤْمِنُونَ", "lexical", "multiple", "indexed"],
    ["بِمَآ", "lexical", "indexed", "missing"],
    ["أُنزِلَ", "lexical", "multiple", "missing"],
    ["إِلَيْكَ", "lexical", "missing", "indexed"],
    ["وَمَآ", "lexical", "indexed", "missing"],
    ["أُنزِلَ", "lexical", "multiple", "missing"],
    ["مِن", "lexical", "missing", "missing"],
    ["قَبْلِكَ", "lexical", "multiple", "missing"],
    ["وَبِٱلْـَٔاخِرَةِ", "missing", "unknown", "unknown"],
    ["هُمْ", "grammar_only", "missing", "missing"],
    ["يُوقِنُونَ", "lexical", "multiple", "indexed"],
  ] },
  { reference: "2:20", heading: "Al-Baqarah 2:20", words: [
    ["يَكَادُ", "lexical", "indexed", "missing"],
    ["ٱلْبَرْقُ", "lexical", "multiple", "indexed"],
    ["يَخْطَفُ", "lexical", "multiple", "missing"],
    ["أَبْصَـٰرَهُمْ ۖ", "missing", "unknown", "unknown"],
    ["كُلَّمَآ", "lexical", "missing", "missing"],
    ["أَضَآءَ", "lexical", "missing", "missing"],
    ["لَهُم", "grammar_only", "missing", "missing"],
    ["مَّشَوْا۟", "lexical", "missing", "missing"],
    ["فِيهِ", "lexical", "indexed", "missing"],
    ["وَإِذَآ", "lexical", "multiple", "missing"],
    ["أَظْلَمَ", "lexical", "multiple", "missing"],
    ["عَلَيْهِمْ", "lexical", "missing", "missing"],
    ["قَامُوا۟ ۚ", "missing", "unknown", "unknown"],
    ["وَلَوْ", "lexical", "missing", "missing"],
    ["شَآءَ", "lexical", "missing", "missing"],
    ["ٱللَّهُ", "lexical", "indexed", "indexed"],
    ["لَذَهَبَ", "lexical", "indexed", "missing"],
    ["بِسَمْعِهِمْ", "lexical", "multiple", "missing"],
    ["وَأَبْصَـٰرِهِمْ ۚ", "missing", "unknown", "unknown"],
    ["إِنَّ", "lexical", "missing", "missing"],
    ["ٱللَّهَ", "lexical", "indexed", "indexed"],
    ["عَلَىٰ", "lexical", "missing", "missing"],
    ["كُلِّ", "lexical", "missing", "missing"],
    ["شَىْءٍۢ", "missing", "unknown", "unknown"],
    ["قَدِيرٌۭ", "missing", "unknown", "unknown"],
  ] },
  { reference: '2:27', heading: 'Al-Baqarah 2:27', words: [
    ['ٱلَّذِينَ', 'lexical', 'missing', 'missing'],
    ['يَنقُضُونَ', 'lexical', 'multiple', 'missing'],
    ['عَهْدَ', 'lexical', 'multiple', 'missing'],
    ['ٱللَّهِ', 'lexical', 'indexed', 'indexed'],
    ['مِنۢ', 'lexical', 'missing', 'missing'],
    ['بَعْدِ', 'lexical', 'multiple', 'multiple'],
    ['مِيثَـٰقِهِۦ', 'lexical', 'multiple', 'missing'],
    ['وَيَقْطَعُونَ', 'lexical', 'multiple', 'missing'],
    ['مَآ', 'lexical', 'indexed', 'missing'],
    ['أَمَرَ', 'lexical', 'multiple', 'missing'],
    ['ٱللَّهُ', 'lexical', 'indexed', 'indexed'],
    ['بِهِۦٓ', 'grammar_only', 'missing', 'missing'],
    ['أَن', 'lexical', 'missing', 'missing'],
    ['يُوصَلَ', 'lexical', 'multiple', 'missing'],
    ['وَيُفْسِدُونَ', 'lexical', 'indexed', 'missing'],
    ['فِى', 'lexical', 'indexed', 'missing'],
    ['ٱلْأَرْضِ ۚ', 'missing', 'unknown', 'unknown'],
    ['أُو۟لَـٰٓئِكَ', 'lexical', 'missing', 'missing'],
    ['هُمُ', 'grammar_only', 'missing', 'missing'],
    ['ٱلْخَـٰسِرُونَ', 'lexical', 'multiple', 'missing'],
  ] },
  { reference: "2:1", heading: "Al-Baqarah 2:1", words: [
    ["الٓمٓ", "temporarily_unavailable", "unknown", "unknown"],
  ] },
]
