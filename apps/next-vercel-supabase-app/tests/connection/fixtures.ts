import { test as base, expect } from '@playwright/test'
import { establishBypass } from './protection'

export { expect }

export const test = base.extend({
  context: async ({ context, baseURL }, use) => {
    const bypass = process.env['VERCEL_AUTOMATION_BYPASS_SECRET']
    if (bypass) {
      await establishBypass(
        context,
        baseURL ?? '',
        bypass,
        process.env['VERCEL_VERIFIED_ORIGIN'] ?? '',
      )
    }
    await use(context)
  },
})
