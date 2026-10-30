import { createQuranHandler } from './handler.ts'

const handler = createQuranHandler({
  clientId: Deno.env.get('QF_CLIENT_ID') ?? '',
  clientSecret: Deno.env.get('QF_CLIENT_SECRET') ?? '',
  environment: Deno.env.get('QF_ENV') ?? 'prelive',
  origins: (Deno.env.get('QF_ALLOWED_ORIGINS') ?? 'https://usmaanalii.github.io').split(',').map(origin => origin.trim()).filter(Boolean),
})

Deno.serve(handler)
