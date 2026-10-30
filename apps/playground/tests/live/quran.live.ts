import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const base = 'https://usmaanalii.github.io/personal-tools/'
const dist = resolve(__dirname, '../../dist')

test('reads real pre-live Quran content, paginates, and reopens a bookmarked verse', async ({ page }, testInfo) => {
  // Mount the local production build at its real site origin. Only HTML/assets
  // are fixtures; all Supabase/Quran content requests use the live services.
  await page.route(`${base}**`, async route => {
    const path = new URL(route.request().url()).pathname.slice('/personal-tools/'.length)
    if (path === 'quran/' || path === 'quran/index.html') {
      return route.fulfill({ body: await readFile(resolve(dist, 'quran/index.html')), contentType: 'text/html' })
    }
    if (/^assets\/[A-Za-z0-9_.-]+$/.test(path)) {
      return route.fulfill({ body: await readFile(resolve(dist, path)), contentType: path.endsWith('.css') ? 'text/css' : 'application/javascript' })
    }
    return route.continue()
  })
  const failures: string[] = []
  page.on('pageerror', error => failures.push(error.message))
  page.on('response', response => {
    if (new URL(response.url()).hostname === 'igcpdfceijwqescflyub.supabase.co' && response.status() >= 400) failures.push(`API status ${response.status()}`)
  })
  await page.goto(`${base}quran/`)
  await expect(page.getByRole('heading', { name: 'Al-Fatihah' })).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(7)
  await expect(page.getByText(/M.A.S. Abdel Haleem/)).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.getByRole('button', { name: 'Bookmark verse 1', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Bookmark verse 1', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: /^NEXT/ }).click()
  await expect(page.getByRole('heading', { name: 'Al-Baqarah' })).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(20)
  await page.getByRole('button', { name: 'Next verses', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Bookmark verse 21', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Bookmark verse 21', exact: true }).click()
  await page.getByRole('button', { name: 'Previous verses', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Bookmark verse 1', exact: true })).toBeVisible()
  await page.getByRole('button', { name: /My bookmarks/ }).click()
  await page.getByRole('button', { name: 'Al-Baqarah 2:21', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Bookmark verse 21', exact: true })).toHaveAttribute('aria-pressed', 'true')
  const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }))
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport)
  await page.screenshot({ path: `.e2e/quran-live-${testInfo.project.name}.png`, fullPage: true })
  await page.reload()
  await expect(page.getByRole('article')).toHaveCount(7)
  await expect(page.getByRole('heading', { name: 'Al-Fatihah' })).toBeVisible()
  expect(failures).toEqual([])
})
