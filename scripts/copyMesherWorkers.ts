import { copyFile, mkdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { bundlePrepareMesherWorkers } from 'minecraft-renderer/src/bundler/bundlePrepare'

export type CopyMesherArtifactsOptions = {
  cwd?: string
  mesherDistDir: string
  outDir: string
  wasmPath?: string
}

const EXTRA_DIST_FILES = ['threeWorker.js', 'threeWorker.js.map'] as const

/**
 * Copy renderer worker artifacts into a web-client `dist`.
 * Mesher/owner scripts come from `MESHER_DIST_FILES` (single source of truth).
 * `threeWorker.js` and the wasm binary live outside that list.
 */
export async function copyMesherArtifacts(opts: CopyMesherArtifactsOptions): Promise<string[]> {
  const cwd = opts.cwd ?? process.cwd()
  const outDir = path.resolve(cwd, opts.outDir)
  await mkdir(outDir, { recursive: true })

  const copied = await bundlePrepareMesherWorkers({
    cwd,
    mesherDistDir: opts.mesherDistDir,
    outDir: opts.outDir
  })

  for (const name of EXTRA_DIST_FILES) {
    const from = path.join(opts.mesherDistDir, name)
    try {
      const st = await stat(from)
      if (!st.isFile()) continue
    } catch {
      continue
    }
    const to = path.join(outDir, name)
    await copyFile(from, to)
    copied.push(path.relative(process.cwd(), to) || to)
  }

  if (opts.wasmPath) {
    try {
      const st = await stat(opts.wasmPath)
      if (st.isFile()) {
        const to = path.join(outDir, 'wasm_mesher_bg.wasm')
        await copyFile(opts.wasmPath, to)
        copied.push(path.relative(process.cwd(), to) || to)
      }
    } catch {
      // wasm is optional at copy time; the caller may warn
    }
  }

  return copied
}
