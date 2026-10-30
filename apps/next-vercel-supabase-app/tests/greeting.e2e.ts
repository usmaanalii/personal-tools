import { expect, test } from '@playwright/test'

test('shows the greeting when Check connection is selected', async ({
  page,
}, testInfo) => {
  const errors: Error[] = []
  page.on('pageerror', (error) => errors.push(error))
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Next.js connection lab' }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Check connection', exact: true })
    .click()
  await expect(page.getByRole('status')).toHaveText('Hello from Supabase!')
  await expect(page.getByRole('button', { name: 'Check again' })).toBeEnabled()
  expect(errors).toEqual([])
  await page.screenshot({
    path: testInfo.outputPath('connection.png'),
    fullPage: true,
  })
})
