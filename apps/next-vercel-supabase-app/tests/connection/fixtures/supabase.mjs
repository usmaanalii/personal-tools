import { createHash } from 'node:crypto'
import { createServer } from 'node:http'

const identity = { id: 'fixture-reader', email: 'reader@example.test' }
const fixtureTokens = {
  access_token: 'fixture-access',
  refresh_token: 'fixture-refresh',
  expires_in: 3600,
  token_type: 'bearer',
  user: identity,
}

async function readJson(request) {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  return JSON.parse(Buffer.concat(chunks).toString())
}

async function exchange(request, response) {
  const body = await readJson(request)
  const { auth_code: code, code_verifier: verifier } = body
  const challenge = createHash('sha256')
    .update(verifier ?? '')
    .digest('base64url')
  if (code !== challenge) {
    response.writeHead(400).end(JSON.stringify({ code: 'bad_code_verifier' }))
    return
  }
  response.end(JSON.stringify(fixtureTokens))
}

const testMail = new Map()

async function deliverLink(request, response, redirect) {
  const { email, code_challenge: challenge } = await readJson(request)
  if (redirect !== 'http://127.0.0.1:3100/auth/callback' || !challenge) {
    response.writeHead(400).end()
    return
  }
  const callback = new URL(redirect)
  callback.searchParams.set('code', challenge)
  testMail.set(email, callback.href)
  response.end('{}')
}

// Test-only upstream: the production Next route still performs real HTTP.
const server = createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost:54329')
  response.setHeader('Content-Type', 'application/json')
  if (request.url === '/health') {
    response.end(JSON.stringify({ ok: true }))
    return
  }
  if (url.pathname === '/auth/v1/authorize') {
    const redirect = url.searchParams.get('redirect_to')
    if (redirect !== 'http://127.0.0.1:3100/auth/callback') {
      response.writeHead(400).end()
      return
    }
    const callback = new URL(redirect)
    callback.searchParams.set('code', url.searchParams.get('code_challenge'))
    response.writeHead(303, { Location: callback.href }).end()
    return
  }
  if (url.pathname === '/auth/v1/token') {
    void exchange(request, response).catch(() => response.writeHead(400).end())
    return
  }
  if (url.pathname === '/auth/v1/otp' && request.method === 'POST') {
    void deliverLink(
      request,
      response,
      url.searchParams.get('redirect_to'),
    ).catch(() => response.writeHead(400).end())
    return
  }
  if (url.pathname === '/test/email-link') {
    const email = url.searchParams.get('email')
    const link = testMail.get(email)
    if (!link) {
      response.writeHead(404).end()
      return
    }
    testMail.delete(email)
    response.end(JSON.stringify({ link }))
    return
  }
  if (request.headers.authorization === 'Bearer fixture-access') {
    if (url.pathname === '/auth/v1/user') {
      response.end(JSON.stringify(identity))
      return
    }
    if (url.pathname === '/auth/v1/logout') {
      response.writeHead(204).end()
      return
    }
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
