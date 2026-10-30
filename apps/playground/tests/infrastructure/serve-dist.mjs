import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createStaticServer } from './static-server.mjs'

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../../dist')
const server = createStaticServer(dist)
server.listen(5173, '127.0.0.1')
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close())
}
