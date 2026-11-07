import { execFileSync } from 'node:child_process'
import { globSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'

it('reports dictionary overlap for every source word separately from occurrence-verified words', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lexicon-overlap-'))
  try {
    const lane = join(directory, 'lane')
    const mufradat = join(directory, 'mufradat')
    execFileSync('pnpm', ['lane:data', '--output', lane], { stdio: 'pipe' })
    execFileSync('pnpm', ['mufradat:data', '--output', mufradat], { stdio: 'pipe' })
    const output = join(directory, 'overlap.json')
    execFileSync('python3', ['scripts/quran-data/lexicon.py', '--lane', join(lane, 'coverage.json'), '--mufradat', join(mufradat, 'coverage.json'), '--output', output], { stdio: 'pipe' })
    const report: unknown = JSON.parse(await readFile(output, 'utf8'))
    expect(report).toMatchObject({
      source: { words: 77429, both: expect.any(Number), laneOnly: expect.any(Number), mufradatOnly: expect.any(Number), neither: expect.any(Number) },
      verified: { words: 5250 }, baqarah: { words: 5221 },
      reports: { laneSha256: expect.stringMatching(/^[a-f0-9]{64}$/), mufradatSha256: expect.stringMatching(/^[a-f0-9]{64}$/) },
      words: { '2:3:8': { verified: true, lane: 'source-associated', mufradat: 'source-associated' }, '112:3:1': { verified: false } },
    })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 30_000)

it('bundles expanded dictionary assets while excluding offline occurrence audit reports', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lexicon-release-'))
  try {
    const lane = join(directory, 'functions/quran/lane-data')
    const mufradat = join(directory, 'functions/quran/mufradat-data')
    execFileSync('pnpm', ['lane:data', '--output', lane], { stdio: 'pipe' })
    execFileSync('pnpm', ['mufradat:data', '--output', mufradat], { stdio: 'pipe' })
    const config = await readFile(new URL('../../../../supabase/config.toml', import.meta.url), 'utf8')
    const match = config.match(/^static_files = (\[.*\])$/m)
    if (!match?.[1]) throw new Error('Missing function static files')
    const patterns: string[] = JSON.parse(match[1])
    const bundled = globSync(patterns, { cwd: directory })
    expect(bundled).toContain('functions/quran/lane-data/catalogue.json')
    expect(bundled.some(path => path.startsWith('functions/quran/lane-data/packs/'))).toBe(true)
    expect(bundled).toContain('functions/quran/mufradat-data/entries/jk-l13005.json')
    expect(bundled.some(path => path.endsWith('coverage.json'))).toBe(false)
    const bytes = await Promise.all(bundled.map(async path => (await readFile(join(directory, path))).byteLength))
    expect(bytes.reduce((total, value) => total + value, 0)).toBeLessThan(15_000_000)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 30_000)
