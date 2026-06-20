import { defineConfig } from 'cypress'

const isPerformanceTest = process.env.PERFORMANCE_TEST === 'true'

export default defineConfig({
  video: false,
  chromeWebSecurity: false,
  screenshotOnRunFailure: true, // Enable screenshots on test failures
  e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(on, config) {
      // https://medium.com/automation-with-donald/get-memory-consumption-of-web-app-with-cypress-84e2656e5a0f
      on(
        'before:browser:launch',
        (
          browser = {
            name: '',
            family: 'chromium',
            channel: '',
            displayName: '',
            version: '',
            majorVersion: '',
            path: '',
            isHeaded: false,
            isHeadless: false
          },
          launchOptions
        ) => {
          if (browser.family === 'chromium' && browser.name !== 'electron') {
            // auto open devtools
            launchOptions.args.push('--enable-precise-memory-info')
          }

          return launchOptions
        }
      )

      return require('./cypress/plugins/index.js')(on, config)
    },
    baseUrl: 'http://localhost:8080',
    specPattern: !isPerformanceTest ? 'cypress/e2e/smoke.spec.ts' : 'cypress/e2e/rendering_performance.spec.ts',
    excludeSpecPattern: ['**/__snapshots__/*', '**/__image_snapshots__/*']
  }
})
