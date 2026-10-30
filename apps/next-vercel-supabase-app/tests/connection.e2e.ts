import { expect, test } from '@playwright/test'

test('a visitor can retry a failed connection check', async ({ page }) => {
  const connection = page.getByRole('region', {
    name: 'Say hello to Supabase.',
  })
  let attempts = 0
  await page.route('**/api/supabase', async (route) => {
    attempts += 1
    if (attempts === 1) {
      await route.fulfill({
        status: 502,
        json: { error: 'Backend unavailable' },
      })
    } else {
      await route.continue()
    }
  })
  await page.goto('/')
  await page
    .getByRole('button', { name: 'Check connection', exact: true })
    .click()
  await expect(connection.getByRole('alert')).toHaveText(
    'The connection check failed. Please try again.',
  )
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('status')).toHaveText('Hello from Supabase!')
  await expect(connection.getByRole('alert')).toHaveCount(0)
})

test('a keyboard user sees progress while the check is in flight', async ({
  page,
}) => {
  const pending = Promise.withResolvers<void>()
  await page.route('**/api/supabase', async (route) => {
    await pending.promise
    await route.continue()
  })
  await page.goto('/')
  const button = page.getByRole('button', {
    name: 'Check connection',
    exact: true,
  })
  await button.focus()
  await page.keyboard.press('Enter')
  await expect(
    page.getByRole('button', { name: 'Checking connection…' }),
  ).toBeDisabled()
  await expect(page.getByRole('status')).toHaveText('Waiting for Supabase…')
  pending.resolve()
  await expect(page.getByRole('status')).toHaveText('Hello from Supabase!')
})

test('invalid response data is shown as a recoverable error', async ({
  page,
}) => {
  await page.route('**/api/supabase', (route) =>
    route.fulfill({ json: { ok: true, message: 42 } }),
  )
  await page.goto('/')
  await page
    .getByRole('button', { name: 'Check connection', exact: true })
    .click()
  await expect(
    page
      .getByRole('region', { name: 'Say hello to Supabase.' })
      .getByRole('alert'),
  ).toHaveText('The connection check failed. Please try again.')
  await expect(page.getByRole('button', { name: 'Try again' })).toBeEnabled()
})

test('the page opens directly and remains usable after refresh at this viewport', async ({
  page,
}) => {
  await page.goto('/')
  await page.reload()
  await expect(page).toHaveTitle('Next.js connection lab')
  await expect(
    page.getByRole('button', { name: 'Check connection', exact: true }),
  ).toBeVisible()
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }))
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport)
})
