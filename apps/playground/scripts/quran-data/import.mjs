import { parseArgs } from 'node:util'
import { fileURLToPath } from 'node:url'
import { generateData } from './generate.ts'

const { values } = parseArgs({ options: { output: { type: 'string' }, reference: { type: 'string' }, 'require-publication': { type: 'boolean' }, 'notices-only': { type: 'boolean' } } })
const outputDirectory = values.output ?? fileURLToPath(new URL('../../public/quran-data/', import.meta.url))
const referenceFile = values.reference ?? fileURLToPath(new URL('../../data/quran/foundation-chapters-1-2.json', import.meta.url))
const report = await generateData({ outputDirectory, referenceFile, requirePublication: values['require-publication'], noticesOnly: values['notices-only'] })
console.log(JSON.stringify({ ...report, missingOccurrences: report.missingOccurrences.length, mismatchedOccurrences: report.mismatchedOccurrences.length, ambiguousOccurrences: report.ambiguousOccurrences.length }))
