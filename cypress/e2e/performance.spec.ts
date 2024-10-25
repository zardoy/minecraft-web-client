import { cleanVisit, setOptions } from './shared'

it('Loads & renders singleplayer', () => {
  cleanVisit('/?singleplayer=1')
  setOptions({
    renderDistance: 2
  })
  // wait for .initial-loader to disappear
  cy.get('.initial-loader', { timeout: 20_000 }).should('not.exist')
  cy.window()
    .its('performance')
    .invoke('mark', 'worldLoad')

  cy.document().then({ timeout: 20_000 }, doc => {
    return new Cypress.Promise(resolve => {
      doc.addEventListener('cypress-world-ready', resolve)
    })
  }).then(() => {
    const duration = cy.window()
      .its('performance')
      .invoke('measure', 'modalOpen')
      .its('duration')
    cy.log('Duration', duration)
  })
})
