import type { Page } from '@playwright/test'
import type { AppOptions } from '../src/optionsStorage'
import { CYPRESS_SINGLEPLAYER_FLAT_OVERRIDES } from '../src/cypressFlatWorld'

export type OpenAppOptions = {
  /** Apply superflat local server options before the app reads settings (needed for ?singleplayer=1). */
  flatSingleplayerWorld?: boolean
  changedSettings?: Partial<AppOptions>
}

/**
 * Open the app with a clean localStorage in test mode (`localStorage.cypress`, read by isCypress() in the app). The init script runs
 * before the app's scripts, so settings apply on the first read and the world-ready event can't be missed.
 */
export const openApp = async (page: Page, url = '/', options: OpenAppOptions = {}) => {
  const changedSettings: Partial<AppOptions> = {
    chatOpacity: 0,
    ...options.changedSettings,
  }
  if (options.flatSingleplayerWorld) {
    Object.assign(changedSettings, {
      renderDistance: 2,
      localServerOptions: CYPRESS_SINGLEPLAYER_FLAT_OVERRIDES,
    })
  }
  await page.addInitScript(settings => {
    // only on the first load of this page: a reload keeps what the app saved
    if (sessionStorage.getItem('e2eInitDone')) return
    sessionStorage.setItem('e2eInitDone', '1')
    localStorage.clear()
    localStorage.cypress = 'true'
    if (Object.keys(settings).length > 0) localStorage.setItem('changedSettings', JSON.stringify(settings))
  }, changedSettings)
  await page.addInitScript(() => {
    (window as Window & { __e2eWorldReady?: boolean }).__e2eWorldReady = false
    document.addEventListener('cypress-world-ready', () => {
      (window as Window & { __e2eWorldReady?: boolean }).__e2eWorldReady = true
    }, { once: true })
  })
  await page.goto(url)
}

/** Resolves once the app dispatched `cypress-world-ready` (src/index.ts). Polled from the test runner, so a frozen page still times out. */
export const waitForWorld = async (page: Page, timeout = 60_000) => {
  await page.waitForFunction(() => (window as Window & { __e2eWorldReady?: boolean }).__e2eWorldReady === true, undefined, { timeout, polling: 500 })
}
