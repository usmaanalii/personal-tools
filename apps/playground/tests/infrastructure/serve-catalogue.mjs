import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createStaticServer } from './static-server.mjs'

const catalogue = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../packages/ui/storybook-static')
const server = createStaticServer(catalogue)
server.listen(5174, '127.0.0.1')
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close())
}
