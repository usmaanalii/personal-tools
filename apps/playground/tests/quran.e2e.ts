import { expect, test } from '@playwright/test'

test('shows the chapter heading to the left of the reader heading when the reader opens on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/quran/')

  const chapterHeading = page.getByRole('heading', { name: 'Chapters' })
  const readerHeading = page.getByRole('heading', { name: 'Al-Fātiḥah' })
  await expect(chapterHeading).toBeVisible()
  await expect(readerHeading).toBeVisible()

  const chapterBounds = await chapterHeading.boundingBox()
  const readerBounds = await readerHeading.boundingBox()
  expect(chapterBounds).not.toBeNull()
  expect(readerBounds).not.toBeNull()
  expect(chapterBounds!.x).toBeLessThan(readerBounds!.x)

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }))
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport)
})
