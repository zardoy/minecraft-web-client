/* eslint-disable max-nested-callbacks */
/// <reference types="cypress" />
import supportedVersions from '../../src/supportedVersions.mjs'
import { setOptions, cleanVisit, visit } from './shared'

// todo use ssl

const compareRenderedFlatWorld = () => {
  // wait for render
  // cy.wait(6000)
  // cy.get('body').toMatchImageSnapshot({
  //     name: 'superflat-world',
  // })
}

const testWorldLoad = () => {
  return cy
    .document()
    .then({ timeout: 35_000 }, doc => {
      return new Cypress.Promise(resolve => {
        doc.addEventListener('cypress-world-ready', resolve)
      })
    })
    .then(() => {
      compareRenderedFlatWorld()
    })
}

it('Loads & renders singleplayer', () => {
  cleanVisit('/?singleplayer=1')
  setOptions({
    localServerOptions: {
      generation: {
        name: 'superflat',
        // eslint-disable-next-line unicorn/numeric-separators-style
        options: { seed: 250869072 }
      }
    },
    renderDistance: 2
  })
  testWorldLoad()
})

it.skip('Joins to local flying-squid server', () => {
  visit('/?ip=localhost&version=1.16.1')
  window.localStorage.version = ''
  // todo replace with data-test
  // cy.get('[data-test-id="servers-screen-button"]').click()
  // cy.get('[data-test-id="server-ip"]').clear().focus().type('localhost')
  // cy.get('[data-test-id="version"]').clear().focus().type('1.16.1') // todo needs to fix autoversion
  cy.get('[data-test-id="connect-qs"]').click() // todo! cypress sometimes doesn't click
  testWorldLoad()
})

it.skip('Joins to local latest Java vanilla server', () => {
  const version = supportedVersions.at(-1)!
  cy.task('startServer', [version, 25_590]).then(() => {
    visit('/?ip=localhost:25590&username=bot')
    cy.get('[data-test-id="connect-qs"]').click()
    testWorldLoad().then(() => {
      let x = 0
      let z = 0
      cy.window().then(win => {
        x = win.bot.entity.position.x
        z = win.bot.entity.position.z
      })
      cy.document().trigger('keydown', { code: 'KeyW' })
      cy.wait(1500).then(() => {
        cy.document().trigger('keyup', { code: 'KeyW' })
        cy.window()
          .then(async win => {
            // eslint-disable-next-line prefer-destructuring
            const bot: typeof __type_bot = win.bot
            // todo use f3 stats instead
            if (bot.entity.position.x === x && bot.entity.position.z === z) {
              throw new Error('Player not moved')
            }

            bot.chat('Hello') // todo assert
            bot.chat('/gamemode creative')
            // bot.on('message', () => {
            void bot.creative.setInventorySlot(bot.inventory.hotbarStart, new win.PrismarineItem(1, 1, 0))
            // })
            await bot.lookAt(bot.entity.position.offset(1, 0, 1))
          })
          .then(() => {
            cy.document().trigger('mousedown', { button: 2, isTrusted: true, force: true }) // right click
            cy.document().trigger('mouseup', { button: 2, isTrusted: true, force: true })
            cy.wait(1000)
          })
      })
    })
  })
})

it('Loads & renders zip world', () => {
  cleanVisit()
  cy.get('[data-test-id="select-file-folder"]').click({ shiftKey: true })
  cy.get('input[type="file"]').selectFile('cypress/superflat.zip', { force: true })
  testWorldLoad()
})

it.skip('Loads & renders world from folder', () => {
  cleanVisit()
  // dragndrop folder
  cy.get('[data-test-id="select-file-folder"]').click()
  cy.get('input[type="file"]').selectFile('server-jar/world', {
    force: true
    // action: 'drag-drop',
  })
  testWorldLoad()
})
