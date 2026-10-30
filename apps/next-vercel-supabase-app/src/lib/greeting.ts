import { z } from 'zod'

export const greetingSchema = z.object({
  ok: z.literal(true),
  message: z.string().min(1),
})
