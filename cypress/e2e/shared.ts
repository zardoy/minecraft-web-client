import { AppOptions } from '../../src/optionsStorage'
import { CYPRESS_SINGLEPLAYER_FLAT_OVERRIDES } from '../../src/cypressFlatWorld'

export type CypressVisitOptions = {
  /** Apply superflat local server options before the app reads settings (needed for ?singleplayer=1). */
  flatSingleplayerWorld?: boolean
  changedSettings?: Partial<AppOptions>
}

export const cleanVisit = (url?, visitOptions?: CypressVisitOptions) => {
  cy.clearLocalStorage()
  visit(url, visitOptions)
}

export const visit = (url = '/', visitOptions: CypressVisitOptions = {}) => {
  cy.visit(url, {
    onBeforeLoad (win) {
      win.localStorage.cypress = 'true'
      const changedSettings: Partial<AppOptions> = {
        chatOpacity: 0,
        ...visitOptions.changedSettings,
      }
      if (visitOptions.flatSingleplayerWorld) {
        Object.assign(changedSettings, {
          renderDistance: 2,
          localServerOptions: CYPRESS_SINGLEPLAYER_FLAT_OVERRIDES,
        })
      }
      if (Object.keys(changedSettings).length > 0) {
        win.localStorage.setItem('changedSettings', JSON.stringify(changedSettings))
      }
    },
  })
}

export const setOptions = (options: Partial<AppOptions>) => {
  cy.window().then(win => {
    Object.assign(win['options'], options)
  })
}
