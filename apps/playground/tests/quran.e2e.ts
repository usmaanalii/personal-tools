import { expect, test } from '@playwright/test'
import { mockQuranContent } from './quran-fixture'

test('opens the reader without overflow and places desktop panels side by side', async ({ page }) => {
  await mockQuranContent(page)
  await page.goto('./quran/')

  await page.reload()
  const chapterHeading = page.getByRole('heading', { name: 'Chapters' })
  const readerHeading = page.getByRole('heading', { name: 'Al-Fātiḥah' })
  await expect(chapterHeading).toBeVisible()
  await expect(readerHeading).toBeVisible()

  const chapterBounds = await chapterHeading.boundingBox()
  const readerBounds = await readerHeading.boundingBox()
  expect(chapterBounds).not.toBeNull()
  expect(readerBounds).not.toBeNull()
  if (!chapterBounds || !readerBounds) throw new Error('Reader panels must be visible')
  if ((page.viewportSize()?.width ?? 0) >= 1200) {
    expect(chapterBounds.x).toBeLessThan(readerBounds.x)
  }

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }))
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport)
})
