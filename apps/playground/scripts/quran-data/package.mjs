import { parseArgs } from 'node:util'
import { fileURLToPath } from 'node:url'
import { packageMorphology } from './package.ts'

const { values } = parseArgs({ options: { output: { type: 'string' }, preview: { type: 'boolean' } } })
const outputDirectory = values.output ?? fileURLToPath(new URL('../../../../supabase/functions/quran/data/', import.meta.url))
const report = await packageMorphology({ outputDirectory, preview: values.preview ?? false })
console.log(JSON.stringify({ ...report, missingOccurrences: report.missingOccurrences.length, mismatchedOccurrences: report.mismatchedOccurrences.length, ambiguousOccurrences: report.ambiguousOccurrences.length }))
