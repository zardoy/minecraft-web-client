//@ts-check
import fs from 'fs'
import os from 'os'

const fns = {
  async getAlias () {
    const aliasesRaw = process.env.ALIASES
    if (!aliasesRaw) throw new Error('No aliases found')
    const aliases = aliasesRaw.split('\n').map((x) => x.trim().split('='))
    const githubActionsPull = process.env.PULL_URL?.split('/').at(-1)
    if (!githubActionsPull) throw new Error(`Not a pull request, got ${process.env.PULL_URL}`)
    const prNumber = githubActionsPull
    const alias = aliases.find((x) => x[0] === prNumber)
    if (alias) {
      // set github output
      setOutput('alias', alias[1])
    }
  },
  getReleasingAlias() {
    const final = (ver) => `${ver}.mcraft.fun`
    const releaseJson = JSON.parse(fs.readFileSync('./assets/release.json', 'utf8'))
    const tag = releaseJson.latestTag
    const [major, minor, patch] = tag.replace('v', '').split('.')
    if (major === '0' && minor === '1') {
      setOutput('alias', final(`v${patch}`))
    } else {
      setOutput('alias', final(tag))
    }
  },
  /**
   * Generic JSON parser that extracts structured data from PR body codeblocks
   * Supports:
   * - deployAlwaysUpdate: array of package names
   * - config: object to override config.json
   */
  parsePrConfig() {
    const prBody = process.env.PR_BODY || ''
    if (!prBody) {
      console.log('No PR body found, using defaults')
      return
    }

    // Strict regex for JSON codeblocks: ```json, ```javascript, or ```js followed by JSON content
    const codeBlockRegex = /```(?:json|javascript|js)?\s*\n([\s\S]*?)```/g
    let match
    const configs = []
    const packages = []

    // Parse all JSON codeblocks
    while ((match = codeBlockRegex.exec(prBody)) !== null) {
      const codeContent = match[1].trim()
      if (!codeContent) continue

      try {
        const parsed = JSON.parse(codeContent)
        
        // Extract deployAlwaysUpdate if present
        if (parsed.deployAlwaysUpdate) {
          if (Array.isArray(parsed.deployAlwaysUpdate)) {
            packages.push(...parsed.deployAlwaysUpdate.filter(pkg => typeof pkg === 'string'))
          } else {
            console.warn('deployAlwaysUpdate must be an array, ignoring')
          }
        }

        // Extract config if present
        if (parsed.config && typeof parsed.config === 'object' && !Array.isArray(parsed.config)) {
          configs.push(parsed.config)
        }
      } catch (e) {
        // Not valid JSON, skip this codeblock
        console.warn(`Failed to parse JSON codeblock: ${e.message}`)
      }
    }

    // Also check for inline JSON at the bottom (last 30 lines)
    const bottomSection = prBody.split('\n').slice(-30).join('\n')
    const jsonMatch = bottomSection.match(/\{[\s\S]{0,5000}\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        
        if (parsed.deployAlwaysUpdate && Array.isArray(parsed.deployAlwaysUpdate)) {
          packages.push(...parsed.deployAlwaysUpdate.filter(pkg => typeof pkg === 'string'))
        }
        
        if (parsed.config && typeof parsed.config === 'object' && !Array.isArray(parsed.config)) {
          configs.push(parsed.config)
        }
      } catch (e) {
        // Ignore parse errors for inline JSON
      }
    }

    // Process deployAlwaysUpdate
    const uniquePackages = [...new Set(packages)]
    if (uniquePackages.length > 0) {
      console.log(`Found deployAlwaysUpdate packages: ${uniquePackages.join(', ')}`)
      setOutput('packages', uniquePackages.join(' '))
    } else {
      // Fallback to package.json
      if (fs.existsSync('./package.json')) {
        try {
          const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'))
          if (pkg.deployAlwaysUpdate && Array.isArray(pkg.deployAlwaysUpdate)) {
            console.log(`Using deployAlwaysUpdate from package.json: ${pkg.deployAlwaysUpdate.join(', ')}`)
            setOutput('packages', pkg.deployAlwaysUpdate.join(' '))
          }
        } catch (e) {
          console.warn('Failed to read package.json:', e.message)
        }
      }
    }

    // Process config overrides
    if (configs.length > 0) {
      // Merge all config objects (later ones override earlier ones)
      const mergedConfig = configs.reduce((acc, config) => ({ ...acc, ...config }), {})
      const configJson = JSON.stringify(mergedConfig)
      
      // Output as JSON string for CONFIG_JSON env var (highest precedence)
      setOutput('configJson', configJson)
      console.log(`Config JSON available as CONFIG_JSON environment variable (highest precedence)`)
    }
  }
}

function setOutput (key, value) {
  // Temporary hack until core actions library catches up with github new recommendations
  const output = process.env['GITHUB_OUTPUT']
  fs.appendFileSync(output, `${key}=${value}${os.EOL}`)
}

// Backward compatibility: map old function name to new one
if (process.argv[2] === 'getDeployAlwaysUpdate') {
  process.argv[2] = 'parsePrConfig'
}

const fn = fns[process.argv[2]]
if (fn) {
  Promise.resolve(fn()).catch(err => {
    console.error(err)
    process.exit(1)
  })
} else {
  console.error('Function not found')
  process.exit(1)
}
