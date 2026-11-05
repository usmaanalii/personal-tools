import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('keeps the word dialog in the shared body typeface outside the reader subtree', async ({ page }) => {
  // The portal boundary changes CSS inheritance; jsdom cannot resolve its rendered typeface.
  await page.goto('iframe.html?id=playground-quran-verse-reading--stacked&viewMode=story')
  const bodyTypeface = await page.getByRole('main').evaluate(element => getComputedStyle(element).fontFamily)
  await page.getByRole('button', { name: 'بِسْمِ · 1:1:1' }).click()
  const meaning = page.getByRole('dialog', { name: 'Word meaning' }).getByText('In (the) name', { exact: true })
  await expect(meaning).toBeVisible()
  expect(await meaning.evaluate(element => getComputedStyle(element).fontFamily)).toBe(bodyTypeface)
})

for (const composition of ['stacked', 'parallel-translation']) {
  test(`fits the ${composition} verse composition and stacks its content on narrow canvases`, async ({ page }) => {
    // Only the browser can measure the responsive composition and pointer targets.
    await page.setViewportSize({ width: 1000, height: 900 })
    await page.goto(`iframe.html?id=playground-quran-verse-reading--${composition}&viewMode=story`)
    const word = page.getByRole('button', { name: 'بِسْمِ · 1:1:1' })
    const translation = page.getByText('In the name of Allah—the Most Compassionate, Most Merciful.', { exact: true })
    await expect(word).toBeVisible()
    const wordBox = await word.boundingBox()
    const translationBox = await translation.boundingBox()
    if (!wordBox || !translationBox) throw new Error('Expected rendered verse content')
    if (composition === 'stacked') expect(translationBox.y).toBeGreaterThanOrEqual(wordBox.y + wordBox.height)
    else expect(translationBox.x + translationBox.width).toBeLessThanOrEqual(wordBox.x)
    const target = await page.getByRole('button', { name: 'Bookmark verse 1', exact: true }).boundingBox()
    expect(target?.width).toBeGreaterThanOrEqual(44)
    expect(target?.height).toBeGreaterThanOrEqual(44)
    await page.setViewportSize({ width: 360, height: 800 })
    await expect(async () => {
      const narrowWord = await word.boundingBox()
      const narrowTranslation = await translation.boundingBox()
      if (!narrowWord || !narrowTranslation) throw new Error('Expected rendered verse content')
      expect(narrowTranslation.y).toBeGreaterThanOrEqual(narrowWord.y + narrowWord.height)
    }).toPass()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  })
}

test('applies distinct semantic mappings to the rendered shared controls', async ({ page }) => {
  // Generated utilities must resolve each panel's semantic tokens in the browser.
  await page.goto('iframe.html?id=foundations-semantic-themes--comparison&viewMode=story')
  const defaultControl = page.getByRole('region', { name: 'Default light' }).getByRole('button', { name: 'All chapters', pressed: true })
  const alternateControl = page.getByRole('region', { name: 'Alternate slate' }).getByRole('button', { name: 'All chapters', pressed: true })
  await expect(alternateControl).toBeVisible()
  const background = (element: Element) => getComputedStyle(element).backgroundColor
  expect(await alternateControl.evaluate(background)).not.toBe(await defaultControl.evaluate(background))
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})
