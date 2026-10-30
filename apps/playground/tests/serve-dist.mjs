import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { dirname, extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

// Serve only built files at the Pages prefix. No SPA fallback or dev transforms.
const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../dist')
const prefix = '/personal-tools/'
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    if (!pathname.startsWith(prefix)) {
      response.writeHead(404).end()
      return
    }
    const relative = pathname.slice(prefix.length)
    const file = resolve(dist, relative + (pathname.endsWith('/') ? 'index.html' : ''))
    if (!file.startsWith(dist + sep)) {
      response.writeHead(404).end()
      return
    }
    const body = await readFile(file)
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' })
    response.end(body)
  } catch {
    response.writeHead(404).end()
  }
})
server.listen(5173, '127.0.0.1')
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close())
}
