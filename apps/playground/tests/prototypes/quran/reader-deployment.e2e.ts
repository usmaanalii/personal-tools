import { expect, test } from '@playwright/test'

// Deployment smoke: no asset replacement or backend response interception.
test('reads Quran content from the deployed app and backend after refresh', async ({ page }) => {
  await page.goto('./quran/')
  await expect(page.getByRole('heading', { name: 'Al-Fatihah', exact: true })).toBeVisible()
  await expect(page.getByRole('article').first()).toBeVisible()
  await expect(page.getByText(/· Quran Foundation/)).toBeVisible()
  await expect(page.getByRole('article').first().getByRole('paragraph').filter({ hasText: /[a-z]/i })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Al-Fatihah', exact: true })).toBeVisible()
  await expect(page.getByRole('article').first()).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.getByRole('button', { name: / · 1:1:1$/ }).click()
  const word = page.getByRole('dialog', { name: 'Word meaning' })
  await expect(word.getByText('In (the) name', { exact: true })).toBeVisible()
  await expect(word.getByText("bis'mi", { exact: true })).toBeVisible()
  await word.getByRole('button', { name: 'Close word meaning' }).click()
})
