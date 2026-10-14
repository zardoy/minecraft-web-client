/**
 * Scan dist/ output for duplicate npm packages bundled more than once.
 *
 * Detects pnpm virtual-store paths embedded in JS bundles, e.g.:
 *   node_modules/.pnpm/valtio@1.13.2_@types+react@18.3.18_react@18.3.1/...
 *
 * Usage:
 *   node scripts/findBundledDuplicateDeps.mjs [--dist=dist] [--fail] [--json]
 *
 * Exit code 1 with --fail when any package name appears with multiple versions
 * or multiple distinct pnpm install paths (peer-resolution duplicates).
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')

const args = process.argv.slice(2)
const distArg = args.find(a => a.startsWith('--dist='))?.slice('--dist='.length)
const distDir = path.resolve(rootDir, distArg ?? 'dist')
const failOnDuplicates = args.includes('--fail')
const jsonOutput = args.includes('--json')

/** @typedef {{ name: string, version: string, folder: string }} ParsedPackage */

/**
 * @param {string} folder pnpm .pnpm folder segment (no trailing slash)
 * @returns {ParsedPackage | null}
 */
function parsePnpmFolder(folder) {
  if (!folder || folder.includes('node_modules')) return null

  const scoped = folder.match(/^(@[^+@/]+)\+([^@/]+)@([^_/]+)/)
  if (scoped) {
    return {
      name: `${scoped[1]}/${scoped[2]}`,
      version: scoped[3],
      folder,
    }
  }

  const at = folder.indexOf('@')
  if (at <= 0) return null

  const name = folder.slice(0, at)
  const rest = folder.slice(at + 1)
  const version = rest.split('_')[0]
  if (!version) return null

  return { name, version, folder }
}

/** @param {string} dir @returns {string[]} */
function walkJsFiles(dir) {
  /** @type {string[]} */
  const out = []
  if (!fs.existsSync(dir)) return out

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...walkJsFiles(full))
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      out.push(full)
    }
  }
  return out
}

/** @type {RegExp} */
const PNPM_PATH_RE = /node_modules[/\\]\.pnpm[/\\]([^/\\"'`\s]+)/g

/**
 * @param {string} distRoot
 * @returns {Map<string, Map<string, { folders: Set<string>, files: Set<string> }>>}
 */
function scanDist(distRoot) {
  /** @type {Map<string, Map<string, { folders: Set<string>, files: Set<string> }>>} */
  const byName = new Map()

  const addHit = (parsed, file) => {
    if (!parsed?.name) return
    if (!byName.has(parsed.name)) byName.set(parsed.name, new Map())
    const byVersion = byName.get(parsed.name)
    if (!byVersion.has(parsed.version)) {
      byVersion.set(parsed.version, { folders: new Set(), files: new Set() })
    }
    const entry = byVersion.get(parsed.version)
    entry.folders.add(parsed.folder)
    entry.files.add(path.relative(distRoot, file))
  }

  for (const file of walkJsFiles(distRoot)) {
    const text = fs.readFileSync(file, 'utf8')

    for (const match of text.matchAll(PNPM_PATH_RE)) {
      const parsed = parsePnpmFolder(match[1])
      addHit(parsed, file)
    }

    // Chunk filenames also encode pnpm paths, e.g. vendors-..._pnpm_valtio@1.13.2_...
    const base = path.basename(file, '.js')
    for (const match of base.matchAll(/_pnpm_([a-zA-Z0-9@+._-]+?)@([\d.]+(?:_[\w.+@-]+)?)/g)) {
      const parsed = parsePnpmFolder(`${match[1]}@${match[2]}`)
      addHit(parsed, file)
    }
  }

  return byName
}

/**
 * @param {Map<string, Map<string, { folders: Set<string>, files: Set<string> }>>} byName
 */
function findDuplicates(byName) {
  /** @type {Array<{ name: string, versions: string[], folders: string[], files: string[] }>} */
  const duplicates = []

  for (const [name, byVersion] of [...byName.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const versions = [...byVersion.keys()].sort()
    const allFolders = versions.flatMap(v => [...byVersion.get(v).folders])
    const hasMultipleVersions = versions.length > 1
    const hasMultipleInstallPaths = versions.some(v => byVersion.get(v).folders.size > 1)

    if (!hasMultipleVersions && !hasMultipleInstallPaths) continue

    duplicates.push({
      name,
      versions,
      folders: [...new Set(allFolders)].sort(),
      files: [...new Set(versions.flatMap(v => [...byVersion.get(v).files]))].sort(),
    })
  }

  return duplicates
}

function main() {
  if (!fs.existsSync(distDir)) {
    console.error(`dist directory not found: ${distDir}`)
    console.error('Run a build first (pnpm build).')
    process.exit(failOnDuplicates ? 1 : 0)
  }

  const byName = scanDist(distDir)
  const duplicates = findDuplicates(byName)

  if (jsonOutput) {
    console.log(JSON.stringify({ distDir, duplicateCount: duplicates.length, duplicates }, null, 2))
  } else {
    console.log(`Scanned ${walkJsFiles(distDir).length} JS files in ${distDir}`)
    console.log(`Found ${duplicates.length} package name(s) bundled more than once:\n`)

    if (duplicates.length === 0) {
      console.log('No duplicate bundled dependencies detected.')
    } else {
      for (const dup of duplicates) {
        console.log(`• ${dup.name}`)
        console.log(`  versions: ${dup.versions.join(', ')}`)
        console.log(`  pnpm paths (${dup.folders.length}):`)
        for (const folder of dup.folders) {
          console.log(`    - ${folder}`)
        }
        console.log(`  chunks (${dup.files.length}): ${dup.files.slice(0, 4).join(', ')}${dup.files.length > 4 ? ', …' : ''}`)
        console.log()
      }
    }
  }

  if (failOnDuplicates && duplicates.length > 0) {
    process.exit(1)
  }
}

main()
