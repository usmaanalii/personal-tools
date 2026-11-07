import { MufradatEntrySchema, type MufradatEntry } from '@scratch-pages/api-contracts/quran'
import { reviewedMufradatEntries } from '../../../data/mufradat/reviewed-entries.test-data'

export function buildMufradatEntry(id = 'jk-l5840', overrides: Partial<MufradatEntry> = {}): MufradatEntry {
  const reviewed = reviewedMufradatEntries.find(entry => entry.id === id)
  if (!reviewed) throw new Error(`No reviewed Mufradat fixture for ${id}`)
  return MufradatEntrySchema.parse({ ...reviewed, ...overrides })
}
