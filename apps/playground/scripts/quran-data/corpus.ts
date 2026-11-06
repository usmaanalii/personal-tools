/// <reference lib="es2024.object" />
import type { MorphologyChapter, MorphologySegment } from '../../../../supabase/functions/quran/morphology-data.ts'
import { lookupMorphology, occurrenceKey, type WordOccurrence } from '../../../../supabase/functions/quran/morphology-data.ts'

// https://corpus.quran.com/java/buckwalter.jsp (extended mapping, not ASCII punctuation).
const letters: Readonly<Record<string, string>> = {
  ' ': ' ',
  "'": 'ء', '>': 'أ', '&': 'ؤ', '<': 'إ', '}': 'ئ', A: 'ا', b: 'ب', p: 'ة', t: 'ت', v: 'ث', j: 'ج', H: 'ح', x: 'خ',
  d: 'د', '*': 'ذ', r: 'ر', z: 'ز', s: 'س', '$': 'ش', S: 'ص', D: 'ض', T: 'ط', Z: 'ظ', E: 'ع', g: 'غ', _: 'ـ',
  f: 'ف', q: 'ق', k: 'ك', l: 'ل', m: 'م', n: 'ن', h: 'ه', w: 'و', Y: 'ى', y: 'ي', F: 'ً', N: 'ٌ', K: 'ٍ',
  a: 'َ', u: 'ُ', i: 'ِ', '~': 'ّ', o: 'ْ', '^': 'ٓ', '#': 'ٔ', '`': 'ٰ', '{': 'ٱ', ':': 'ۜ', '@': '۟', '"': '۠',
  '[': 'ۢ', ';': 'ۣ', ',': 'ۥ', '.': 'ۦ', '!': 'ۨ', '-': '۪', '+': '۫', '%': '۬', ']': 'ۭ',
}
const arabic = (value: string) => [...value].map(character => {
  const result = letters[character]
  if (!result) throw new Error(`Unknown Buckwalter character: ${character}`)
  return result
}).join('')
const names: Readonly<Record<string, string>> = {
  P: 'Preposition', N: 'Noun', PN: 'Proper noun', ADJ: 'Adjective', V: 'Verb', CONJ: 'Conjunction', PRON: 'Personal pronoun',
  IMPN: 'Imperative verbal noun', DEM: 'Demonstrative pronoun', REL: 'Relative pronoun', T: 'Time adverb', LOC: 'Location adverb',
  DET: 'Determiner', EMPH: 'Emphatic lam', IMPV: 'Imperative lam', PRP: 'Purpose lam', SUB: 'Subordinating conjunction',
  ACC: 'Accusative particle', AMD: 'Amendment particle', ANS: 'Answer particle', AVR: 'Aversion particle', CAUS: 'Cause particle',
  CERT: 'Certainty particle', CIRC: 'Circumstantial particle', COM: 'Comitative particle', COND: 'Conditional particle', EQ: 'Equalisation particle',
  EXH: 'Exhortation particle', EXL: 'Explanation particle', EXP: 'Exceptive particle', FUT: 'Future particle', INC: 'Inceptive particle',
  INT: 'Interpretation particle', INTG: 'Interrogative particle', NEG: 'Negative particle', PREV: 'Preventive particle', PRO: 'Prohibition particle',
  REM: 'Resumption particle', RES: 'Restriction particle', RET: 'Retraction particle', RSLT: 'Result particle', SUP: 'Supplemental particle',
  SUR: 'Surprise particle', VOC: 'Vocative particle', INL: 'Quranic initials',
}
const features: Readonly<Record<string, string>> = {
  GEN: 'Genitive', NOM: 'Nominative', ACC: 'Accusative', PERF: 'Perfect', IMPF: 'Imperfect', IMPV: 'Imperative',
  ACT: 'Active', PASS: 'Passive', PCPL: 'Participle', VN: 'Verbal noun', INDEF: 'Indefinite',
  'MOOD:JUS': 'Jussive', 'MOOD:SUBJ': 'Subjunctive', '+VOC': 'Vocative suffix', '+n:EMPH': 'Emphatic nun suffix',
}
const traits: Readonly<Record<string, string>> = { '1': 'First person', '2': 'Second person', '3': 'Third person', M: 'masculine', F: 'feminine', S: 'singular', D: 'dual', P: 'plural' }
function segmentKind(tokens: readonly string[]): MorphologySegment['kind'] {
  if (tokens.includes('PREFIX')) return 'prefix'
  if (tokens.includes('SUFFIX')) return 'suffix'
  return 'stem'
}

function featureName(token: string, partOfSpeech: string): string {
  if (features[token]) return features[token]
  if (token.endsWith('+')) return `${partOfSpeech} prefix`
  if (/^\([IVX]+\)$/.test(token)) return `Verb form ${token.slice(1, -1)}`
  const value = token.replace(/^PRON:/, '')
  if (/^[123]?[MF]?[SDP]?$/.test(value) && value) {
    const label = [...value].map(character => traits[character]).join(', ')
    return label.charAt(0).toUpperCase() + label.slice(1)
  }
  return `Corpus feature: ${token}`
}

export function importCorpus(text: string, reference: readonly WordOccurrence[] = []) {
  const headerEnd = text.indexOf('LOCATION\tFORM\tTAG\tFEATURES')
  const notices = headerEnd >= 0 ? text.slice(0, headerEnd) : ''
  const lines = text.split(/\r?\n/).filter(line => line && !line.startsWith('#') && line !== 'LOCATION\tFORM\tTAG\tFEATURES')
  if (!lines.length) throw new Error('No corpus records')
  const rows = lines.map(line => {
    const [location = '', form = '', tag = '', rawFeatures = ''] = line.split('\t')
    const match = /^\((\d+):(\d+):(\d+):(\d+)\)$/.exec(location)
    if (!match || line.split('\t').length !== 4 || !names[tag]) throw new Error(`Invalid corpus record: ${location}`)
    const [chapter = 0, verse = 0, position = 0, segmentNumber = 0] = match.slice(1).map(Number)
    if (chapter < 1 || chapter > 114 || verse < 1 || verse > 286 || position < 1 || segmentNumber < 1) throw new Error(`Invalid corpus location: ${location}`)
    const id = location.slice(1, -1)
    const tokens = rawFeatures.split('|')
    const kind = tokens.filter(token => ['PREFIX', 'STEM', 'SUFFIX'].includes(token))
    if (kind.length !== 1) throw new Error(`Invalid segment role: ${location}`)
    if (!form && !tokens.includes('SUFFIX')) throw new Error(`Empty non-suffix form: ${location}`)
    const field = (name: string) => tokens.find(token => token.startsWith(`${name}:`))?.slice(name.length + 1)
    const root = field('ROOT')
    const lemma = field('LEM')
    const segment: MorphologySegment = {
      id, form, arabic: arabic(form), kind: segmentKind(tokens),
      // Numeric lemma identifiers are not Arabic glyphs; rawFeatures retains the exact source identifier.
      partOfSpeech: names[tag] ?? tag, root: root ? arabic(root) : null, lemma: lemma ? arabic(lemma.replace(/\d+$/, '')) : null,
      features: tokens.filter(token => !/^(PREFIX|STEM|SUFFIX|POS:|ROOT:|LEM:|SP:)/.test(token)).map(token => featureName(token, names[tag] ?? tag)), rawFeatures,
    }
    return { chapter: id.split(':')[0] ?? '', key: id.split(':').slice(0, 3).join(':'), segment }
  })
  const chapters = Object.fromEntries(Object.entries(Object.groupBy(rows, row => row.chapter)).map(([chapter, records]) => [chapter, {
    version: 1, chapter: Number(chapter), notices,
    words: Object.fromEntries(Object.entries(Object.groupBy(records ?? [], row => row.key)).map(([key, words]) => {
      const segments = (words ?? []).map(row => row.segment)
      if (segments.some((segment, index) => segment.id !== `${key}:${index + 1}`)) throw new Error(`Ambiguous segment order: ${key}`)
      return [key, { arabic: segments.map(segment => segment.arabic).join(''), segments }]
    })),
  } satisfies MorphologyChapter]))
  const corpusWords = Object.values(chapters).reduce((sum, chapter) => sum + Object.keys(chapter.words).length, 0)
  const alignment = Object.entries(Object.groupBy(reference, occurrenceKey)).map(([key, occurrences]) => {
    if (occurrences?.length !== 1) return { key, status: 'ambiguous' }
    const word = occurrences[0]
    if (!word) throw new Error('Missing reference occurrence')
    const chapter = chapters[String(word.chapter)]
    if (!chapter?.words[key]) return { key, status: 'missing' }
    return { key, status: lookupMorphology(chapter, word) ? 'aligned' : 'mismatched' }
  })
  const keys = (status: string) => alignment.filter(result => result.status === status).map(result => result.key)
  const alignedOccurrences = keys('aligned').length
  const ambiguous = new Set(keys('ambiguous'))
  const safeChapters = Object.fromEntries(Object.entries(chapters).map(([key, chapter]) => [key, {
    ...chapter, words: Object.fromEntries(Object.entries(chapter.words).filter(([occurrence]) => !ambiguous.has(occurrence))),
  }]))
  return { chapters: safeChapters, notices, report: {
    corpusChapters: Object.keys(chapters).length, corpusWords, corpusSegments: rows.length, referenceOccurrences: reference.length,
    alignedOccurrences, missingOccurrences: keys('missing'),
    mismatchedOccurrences: keys('mismatched'), ambiguousOccurrences: keys('ambiguous'), unverifiedCorpusOccurrences: corpusWords - alignedOccurrences,
    referenceChapters: [...new Set(reference.map(word => word.chapter))].sort((a, b) => a - b),
    normalization: 'NFC; presentation tatweel removed. No fuzzy matching.',
  } }
}
