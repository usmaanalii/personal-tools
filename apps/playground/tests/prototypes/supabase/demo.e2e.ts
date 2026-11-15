import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('opens the homepage from the Supabase demo and returns through keyboard navigation', async ({ page }) => {
  await page.goto('./supabase/')

  await expect(page.getByRole('heading', { name: 'Hello from GitHub Pages' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Hello from GitHub Pages' })).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.getByRole('link', { name: /All playground pages/i }).click()
  await expect(page.getByRole('heading', { name: 'Playground' })).toBeVisible()
  // Browser risk: the destination is reachable using native keyboard navigation.
  const navigation = page.getByRole('navigation', { name: 'Playground pages' })
  await navigation.getByRole('link', { name: /Qur’an data coverage/i }).focus()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: /Supabase API demo/i })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/personal-tools\/supabase\/$/)
  await expect(page.getByRole('heading', { name: 'Hello from GitHub Pages' })).toBeVisible()
})
