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
  // Checks the published UI and live bundled corpus together, without interception.
  await word.getByRole('button', { name: 'Expand grammar', exact: true }).click()
  await expect(word.getByText('Stem · Noun', { exact: true })).toBeVisible()
  await expect(word.getByRole('link', { name: 'Quranic Arabic Corpus v0.4' })).toBeVisible()
  await word.getByRole('link', { name: 'Data notices' }).click()
  await expect(page).toHaveURL(/\/personal-tools\/quran-data\/NOTICE\.txt$/)
  await expect(page.getByText(/Copyright \(C\) 2011 Kais Dukes/)).toBeVisible()
})
