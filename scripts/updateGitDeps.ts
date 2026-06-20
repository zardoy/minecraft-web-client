import fs from 'fs'
import path from 'path'
import yaml from 'yaml'
import { execSync } from 'child_process'
import { createInterface } from 'readline'

interface LockfilePackage {
  specifier: string
  version: string
}

interface Lockfile {
  importers: {
    '.': {
      dependencies?: Record<string, LockfilePackage>
      devDependencies?: Record<string, LockfilePackage>
    }
  }
}

interface PackageJson {
  pnpm?: {
    updateConfig?: {
      ignoreDependencies?: string[]
    }
  }
}

async function prompt(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer.toLowerCase().trim())
    })
  })
}

async function getLatestCommit(owner: string, repo: string): Promise<string> {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/HEAD`)
  if (!response.ok) {
    throw new Error(`Failed to fetch latest commit: ${response.statusText}`)
  }
  const data = await response.json()
  return data.sha
}

function extractGitInfo(specifier: string): { owner: string; repo: string; branch: string } | null {
  const match = specifier.match(/github:([^/]+)\/([^#]+)(?:#(.+))?/)
  if (!match) return null
  return {
    owner: match[1],
    repo: match[2],
    branch: match[3] || 'master'
  }
}

function extractCommitHash(version: string): string | null {
  const match = version.match(/https:\/\/codeload\.github\.com\/[^/]+\/[^/]+\/tar\.gz\/([a-f0-9]+)/)
  return match ? match[1] : null
}

function getIgnoredDependencies(): string[] {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json')
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as PackageJson
    return packageJson.pnpm?.updateConfig?.ignoreDependencies || []
  } catch (error) {
    console.warn('Failed to read package.json for ignored dependencies:', error)
    return []
  }
}

async function main() {
  const lockfilePath = path.join(process.cwd(), 'pnpm-lock.yaml')
  const lockfileContent = fs.readFileSync(lockfilePath, 'utf8')
  const lockfile = yaml.parse(lockfileContent) as Lockfile

  const ignoredDependencies = new Set(getIgnoredDependencies())
  console.log('Ignoring dependencies:', Array.from(ignoredDependencies).join(', ') || 'none')

  const dependencies = {
    ...lockfile.importers['.'].dependencies,
    ...lockfile.importers['.'].devDependencies
  }

  const updates: Array<{
    name: string
    currentHash: string
    latestHash: string
    gitInfo: ReturnType<typeof extractGitInfo>
  }> = []

  console.log('\nChecking git dependencies...')
  for (const [name, pkg] of Object.entries(dependencies)) {
    if (ignoredDependencies.has(name)) {
      console.log(`Skipping ignored dependency: ${name}`)
      continue
    }

    if (!pkg.specifier.startsWith('github:')) continue

    const gitInfo = extractGitInfo(pkg.specifier)
    if (!gitInfo) continue

    const currentHash = extractCommitHash(pkg.version)
    if (!currentHash) continue

    try {
      process.stdout.write(`Checking ${name}... `)
      const latestHash = await getLatestCommit(gitInfo.owner, gitInfo.repo)
      if (currentHash !== latestHash) {
        console.log('update available')
        updates.push({ name, currentHash, latestHash, gitInfo })
      } else {
        console.log('up to date')
      }
    } catch (error) {
      console.log('failed')
      console.error(`Error checking ${name}:`, error)
    }
  }

  if (updates.length === 0) {
    console.log('\nAll git dependencies are up to date!')
    return
  }

  console.log('\nThe following git dependencies can be updated:')
  for (const update of updates) {
    console.log(`\n${update.name}:`)
    console.log(`  Current: ${update.currentHash}`)
    console.log(`  Latest:  ${update.latestHash}`)
    console.log(`  Repo:    ${update.gitInfo!.owner}/${update.gitInfo!.repo}`)
  }

  const answer = await prompt('\nWould you like to update these dependencies? (y/N): ')
  if (answer === 'y' || answer === 'yes') {
    let newLockfileContent = lockfileContent
    for (const update of updates) {
      newLockfileContent = newLockfileContent.replace(new RegExp(update.currentHash, 'g'), update.latestHash)
    }
    fs.writeFileSync(lockfilePath, newLockfileContent)
    console.log('\nUpdated pnpm-lock.yaml with new commit hashes')
    // console.log('Running pnpm install to apply changes...')
    // execSync('pnpm install', { stdio: 'inherit' })
    console.log('Done!')
  } else {
    console.log('\nNo changes were made.')
  }
}

main().catch(console.error)
