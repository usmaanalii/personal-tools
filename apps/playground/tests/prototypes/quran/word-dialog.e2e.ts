import { expect, test } from '@playwright/test'
import { mockQuranContent } from './content-fixture'

// Smoke against production static files; fixture content does not prove live connectivity.
test('opens Word meaning when a word is selected and returns to reading when closed', async ({ page }) => {
  await mockQuranContent(page)
  await page.goto('./quran/')
  await page.reload()
  await page.getByRole('button', { name: 'بِسْمِ · 1:1:1' }).click()
  const details = page.getByRole('dialog', { name: 'Word meaning' })
  await expect(details).toBeVisible()
  await details.getByRole('button', { name: 'Close word meaning' }).click()
  await expect(details).toBeHidden()
  await expect(page.getByRole('article').first()).toBeVisible()
})
