import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MESHER_DIST_FILES } from 'minecraft-renderer/src/bundler/bundlePrepare'
import { copyMesherArtifacts } from '../scripts/copyMesherWorkers'

/**
 * Break this test would catch: web-client copies a handwritten worker list
 * and omits lightOwnerWorker.js (HTTP 404 on /lightOwnerWorker.js).
 * Source-text checks are not enough — this runs the real copy helper.
 */
describe('copyMesherArtifacts', () => {
  it('copies every MESHER_DIST_FILES basename including lightOwnerWorker.js', async () => {
    expect(MESHER_DIST_FILES).toContain('lightOwnerWorker.js')

    const mesherDistDir = await mkdtemp(join(tmpdir(), 'mesher-dist-'))
    const outDir = await mkdtemp(join(tmpdir(), 'web-client-dist-'))
    const wasmDir = await mkdtemp(join(tmpdir(), 'wasm-runtime-'))
    const wasmPath = join(wasmDir, 'wasm_mesher_bg.wasm')

    for (const name of MESHER_DIST_FILES) {
      await writeFile(join(mesherDistDir, name), `// ${name}\n`)
    }
    await writeFile(join(mesherDistDir, 'threeWorker.js'), '// threeWorker.js\n')
    await writeFile(wasmPath, 'wasm-bytes')

    const copied = await copyMesherArtifacts({
      mesherDistDir,
      outDir,
      wasmPath
    })

    expect(copied.some(path => path.endsWith('lightOwnerWorker.js'))).toBe(true)
    expect(await readFile(join(outDir, 'lightOwnerWorker.js'), 'utf8')).toBe('// lightOwnerWorker.js\n')
    for (const name of MESHER_DIST_FILES) {
      expect(await readFile(join(outDir, name), 'utf8')).toBe(`// ${name}\n`)
    }
    expect(await readFile(join(outDir, 'threeWorker.js'), 'utf8')).toBe('// threeWorker.js\n')
    expect(await readFile(join(outDir, 'wasm_mesher_bg.wasm'), 'utf8')).toBe('wasm-bytes')
  })

  it('still copies lightOwnerWorker.js when threeWorker.js is missing', async () => {
    const mesherDistDir = await mkdtemp(join(tmpdir(), 'mesher-dist-'))
    const outDir = await mkdtemp(join(tmpdir(), 'web-client-dist-'))
    await mkdir(outDir, { recursive: true })
    for (const name of MESHER_DIST_FILES) {
      await writeFile(join(mesherDistDir, name), name)
    }

    await copyMesherArtifacts({ mesherDistDir, outDir })

    expect(await readFile(join(outDir, 'lightOwnerWorker.js'), 'utf8')).toBe('lightOwnerWorker.js')
  })
})
