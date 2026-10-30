import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { once } from 'node:events'
import { expect, it } from 'vitest'
import { createStaticServer } from './static-server.mjs'

it('serves built HTML under the deployment prefix without falling back for missing pages', async () => {
  const dist = await mkdtemp(join(tmpdir(), 'playground-static-'))
  const server = createStaticServer(dist)
  try {
    await writeFile(join(dist, 'index.html'), '<h1>Built homepage</h1>')
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Expected a TCP address')
    const base = `http://127.0.0.1:${address.port}/personal-tools/`
    const homepage = await fetch(base)
    expect(homepage.status).toBe(200)
    expect(await homepage.text()).toContain('Built homepage')
    expect((await fetch(`${base}missing-page/`)).status).toBe(404)
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    await rm(dist, { recursive: true, force: true })
  }
})
