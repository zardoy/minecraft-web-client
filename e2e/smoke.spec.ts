import { test } from '@playwright/test'
import { openApp, waitForWorld } from './shared'

test('Loads & renders singleplayer', async ({ page }) => {
  await openApp(page, '/?singleplayer=1', { flatSingleplayerWorld: true })
  await waitForWorld(page)
})

test('Loads & renders zip world', async ({ page }) => {
  await openApp(page)
  // shift+click opens the zip / folder picker; the file input is filled directly
  const fileChooser = page.waitForEvent('filechooser')
  await page.locator('[data-test-id="select-file-folder"]').click({ modifiers: ['Shift'] })
  await (await fileChooser).setFiles('e2e/superflat.zip')
  await waitForWorld(page)
})
