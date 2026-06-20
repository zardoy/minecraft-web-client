/// <reference types="cypress" />
import { BenchmarkAdapterInfo, getAllInfoLines } from '../../src/benchmarkAdapter'
import { cleanVisit } from './shared'

it('Benchmark rendering performance', () => {
  cleanVisit('/?openBenchmark=true&renderDistance=5')
  // wait for render end event
  return cy
    .document()
    .then({ timeout: 180_000 }, doc => {
      return new Cypress.Promise(resolve => {
        cy.log('Waiting for world to load')
        doc.addEventListener('cypress-world-ready', resolve)
      }).then(() => {
        cy.log('World loaded')
      })
    })
    .then(() => {
      cy.window().then(win => {
        const adapter = win.benchmarkAdapter as BenchmarkAdapterInfo

        const messages = getAllInfoLines(adapter)
        // wait for 10 seconds
        cy.wait(10_000)
        const messages2 = getAllInfoLines(adapter, true)
        for (const message of messages) {
          cy.log(message)
        }
        for (const message of messages2) {
          cy.log(message)
        }
        cy.writeFile('benchmark.txt', [...messages, ...messages2].join('\n'))
      })
    })
})
