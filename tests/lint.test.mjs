import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = fileURLToPath(new URL('../', import.meta.url))

test('app and repository lint reject unsafe Next.js code and accept handled promises', () => {
  const directory = mkdtempSync(`${root}apps/next-vercel-supabase-app/src/lint-verification-`)
  const file = `${directory}/example.tsx`
  const lint = (args) => spawnSync('pnpm', args, { cwd: root, encoding: 'utf8', timeout: 30_000 })
  try {
    const invalidCases = [
      ['noFloatingPromises', "async function load(): Promise<string> { return 'hello' }\nload()\n"],
      ['noExplicitAny', 'export const value: any = 1\n'],
      ['noTsIgnore', '// @ts-ignore\nexport const value = 1\n'],
      ['noImgElement', 'export const View = () => <img src="/example.png" alt="Example" />\n'],
    ]
    for (const [rule, source] of invalidCases) {
      writeFileSync(file, source)
      for (const args of [['--filter', 'next-vercel-supabase-app', 'lint'], ['lint']]) {
        const result = lint(args)
        const output = result.stdout + result.stderr
        assert.equal(result.status, 1, output)
        assert.match(output, new RegExp(`lint/[^/]+/${rule}`))
      }
    }
    writeFileSync(file, `async function load(): Promise<string> { return 'hello' }\nexport async function greet() { return await load() }\n`)
    for (const args of [['--filter', 'next-vercel-supabase-app', 'lint'], ['lint']]) {
      const result = lint(args)
      assert.equal(result.status, 0, result.stdout + result.stderr)
    }
  } finally {
    rmSync(directory, { recursive: true })
  }
})
