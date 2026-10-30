import { createServer } from 'node:http'

// Test-only upstream: the production Next route still performs real HTTP.
const server = createServer((request, response) => {
  response.setHeader('Content-Type', 'application/json')
  if (request.url === '/health') {
    response.end(JSON.stringify({ ok: true }))
    return
  }
  if (request.url !== '/functions/v1/hello' || request.method !== 'GET') {
    response.writeHead(404).end()
    return
  }
  if (request.headers.apikey !== 'sb_publishable_e2e_fixture') {
    response
      .writeHead(401)
      .end(JSON.stringify({ error: 'Invalid fixture key' }))
    return
  }
  response.end(JSON.stringify({ ok: true, message: 'Hello from Supabase!' }))
})

server.listen(54329, '127.0.0.1')
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close())
}
