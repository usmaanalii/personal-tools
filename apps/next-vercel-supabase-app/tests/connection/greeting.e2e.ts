import { expect, test } from '@playwright/test'

test('shows the greeting when Check connection is selected', async ({
  page,
}) => {
  const errors: Error[] = []
  page.on('pageerror', (error) => errors.push(error))
  await page.goto('/')
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Next.js connection lab' }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Check connection', exact: true })
    .click()
  await expect(page.getByRole('status')).toHaveText('Hello from Supabase!')
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }))
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport)
  expect(errors).toEqual([])
})
