import fs from 'fs'
import { parse as parseYaml } from 'yaml'

type DepEntry = { specifier?: string; version?: string }

type LockRoot = {
  dependencies?: Record<string, DepEntry>
  devDependencies?: Record<string, DepEntry>
  optionalDependencies?: Record<string, DepEntry>
}

function shortSha (hex: string) {
  return hex.slice(0, 7)
}

function pinLine (name: string, value: string) {
  return `${name}: ${value}`
}

/** pnpm `version` field for git deps: https://codeload.github.com/org/repo/tar.gz/<40hex>(peer...) */
function displayPin (name: string, specifier: string | undefined, versionField: string | undefined) {
  const spec = specifier ?? ''
  const ver = versionField ?? ''

  const tarballSha = ver.match(/tar\.gz\/([a-f0-9]{40})/i)
  if (tarballSha) {
    return pinLine(name, shortSha(tarballSha[1]))
  }

  const plain = ver.replace(/\(.*/, '').trim()
  if (plain && !plain.startsWith('http') && !plain.startsWith('link:')) {
    return pinLine(name, plain)
  }

  if (plain.startsWith('link:')) {
    return pinLine(name, plain)
  }

  const spec40 = spec.match(/#([a-f0-9]{40})\s*$/i)
  if (spec40) {
    return pinLine(name, shortSha(spec40[1]))
  }

  if (spec.startsWith('github:')) {
    const hashPart = spec.split('#')[1]
    if (hashPart && /^[a-f0-9]{40}$/i.test(hashPart)) {
      return pinLine(name, shortSha(hashPart))
    }
    const ref = hashPart || spec.replace(/^github:[^/]+\/[^#]+#?/, '')
    return pinLine(name, ref || spec)
  }

  return pinLine(name, spec || ver || '?')
}

export function resolveWatermarkPackagePins (lockfilePath: string, names: string[]): string[] {
  const doc = parseYaml(fs.readFileSync(lockfilePath, 'utf8')) as {
    importers?: Record<string, LockRoot>
  }
  const root = doc.importers?.['.']
  if (!root) {
    return names.map((n) => pinLine(n, '?'))
  }

  const merged: Record<string, DepEntry> = {
    ...root.dependencies,
    ...root.devDependencies,
    ...root.optionalDependencies,
  }

  return names.map((name) => {
    const entry = merged[name]
    if (!entry) return pinLine(name, '?')
    return displayPin(name, entry.specifier, entry.version)
  })
}

/** Reads `watermarkPackages`, appends resolved lines to `watermark`, removes `watermarkPackages`. */
export function applyWatermarkPackagesToConfig (
  configJson: Record<string, unknown>,
  lockfilePath: string
) {
  const pkgs = configJson.watermarkPackages
  if (!Array.isArray(pkgs) || pkgs.length === 0) return

  const names = pkgs.filter((x): x is string => typeof x === 'string')
  delete configJson.watermarkPackages

  if (names.length === 0) return

  try {
    const lines = resolveWatermarkPackagePins(lockfilePath, names)
    const extra = lines.join('\n')
    const existing = typeof configJson.watermark === 'string' ? configJson.watermark.trim() : ''
    configJson.watermark = [existing, extra].filter(Boolean).join('\n')
  } catch (err) {
    console.warn('watermarkPackages: failed to read pnpm-lock.yaml:', err)
  }
}
