import { expect, test } from '@playwright/test'

test('playground index links to the separate mobile Quran reader', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Playground' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Supabase API demo/i })).toBeVisible()
  await page.getByRole('link', { name: /Quran reader/i }).click()
  await expect(page.getByRole('heading', { name: 'A moment with the Quran.' })).toBeVisible()
  await expect(page.getByRole('navigation').getByText('Read')).toBeVisible()
  await expect(page.getByRole('navigation').getByText('Saved')).toBeVisible()
  await expect(page).toHaveURL(/\/quran\/$/)

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }))
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport)
})

test('desktop reading shows chapter browsing beside the verse reader', async ({ page }) => {
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

test('Supabase demo opens directly at its own route', async ({ page }) => {
  await page.goto('/supabase/')

  await expect(page.getByRole('heading', { name: 'Hello from GitHub Pages' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Call the API' })).toBeVisible()
  await page.getByRole('link', { name: /All playground pages/i }).click()
  await expect(page.getByRole('heading', { name: 'Playground' })).toBeVisible()
})
