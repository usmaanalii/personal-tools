import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'

// HTTP harness contract, independent of browser rendering or viewport.
export function createStaticServer(dist) {
  const prefix = '/personal-tools/'
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }
  return createServer(async (request, response) => {
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
}
