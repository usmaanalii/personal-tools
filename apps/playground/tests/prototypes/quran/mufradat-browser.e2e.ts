import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mockQuranContent } from './content-fixture'

// Production frontend under /personal-tools/ and actual local Deno route with
// pinned reference assets. Verse content is a fixture; hosted Supabase is unverified.
test('reads an original Mufradāt entry while retaining word context on narrow and landscape screens', async ({ page }, testInfo) => {
  await mockQuranContent(page)
  const requests: string[] = []
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/functions/v1/quran/v2/mufradat/entries') requests.push(request.url())
  })
  await page.goto('./quran/')
  await page.reload()
  await page.getByRole('button', { name: 'بِسْمِ · 1:1:1' }).click()
  const dialog = page.getByRole('dialog', { name: 'Word meaning' })
  expect(requests).toEqual([])
  await dialog.getByRole('tab', { name: 'Mufradāt' }).click()
  const article = dialog.getByRole('article', { name: 'سما' })
  await expect(article).toBeVisible()
  await article.getByRole('button', { name: 'Read full Arabic entry' }).click()
  const panel = dialog.getByRole('tabpanel', { name: 'Mufradāt' })
  await expect(article.getByText(/والاسم ما يعرف به ذات الشيء وأصله سمو/)).toBeVisible()
  expect(requests).toHaveLength(1)
  await page.setViewportSize({ width: 320, height: 568 })
  for (const name of ['Grammar', 'Dictionary', 'Mufradāt']) {
    expect(await dialog.getByRole('tab', { name }).evaluate(element => {
      const range = document.createRange()
      range.selectNodeContents(element)
      return range.getClientRects().length
    })).toBe(1)
  }
  await panel.focus()
  await panel.press('End')
  await expect(dialog.getByRole('link', { name: 'CC BY-NC-SA 4.0' })).toBeInViewport()
  await expect(dialog.getByRole('group', { name: 'Word summary' })).toBeInViewport()
  await expect(dialog.getByRole('button', { name: 'Close word meaning' })).toBeInViewport()
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  const accessibility = await new AxeBuilder({ page }).include('[role="dialog"]').analyze()
  expect(accessibility.violations).toEqual([])
  await panel.press('Home')
  await expect(article.getByRole('heading', { name: 'سما' })).toBeInViewport()
  await page.screenshot({ path: testInfo.outputPath('mufradat-mobile.png') })
  await page.setViewportSize({ width: 740, height: 360 })
  await panel.focus()
  await panel.press('End')
  await expect(dialog.getByRole('group', { name: 'Word summary' })).toBeInViewport()
  await expect(dialog.getByRole('button', { name: 'Next word' })).toBeInViewport()
  await dialog.getByRole('button', { name: 'Close word meaning' }).click()
  await expect(page.getByRole('button', { name: 'بِسْمِ · 1:1:1' })).toBeFocused()
})
