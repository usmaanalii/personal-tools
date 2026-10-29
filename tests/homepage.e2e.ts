import { expect, test } from 'e2e'

test('the homepage explains the API demo', async ({ app, screen }) => {
  await app.open('/')

  await expect(screen.getByRole('heading', { name: 'Hello from GitHub Pages' })).toBeVisible()
  await expect(screen.getByText('This page calls a Supabase Edge Function with a GET request.')).toBeVisible()
})

test('the API call starts in the idle state', async ({ app, screen }) => {
  await app.open('/')

  await expect(screen.getByRole('button', { name: 'Call the API' })).toBeEnabled()
  await expect(screen.getByRole('status')).toContainText('Click the button to test it.')
  await expect(screen.getByText('API response will appear here.')).toContainText('API response will appear here.')
})
