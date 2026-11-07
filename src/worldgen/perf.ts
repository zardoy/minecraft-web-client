// `?worldgenPerf=1` : visual benchmark of the world generator (minecraft-worldgen) in this browser.
// A grid of chunks is requested from the same worker pool the singleplayer server uses; every cell is coloured by the time the worker spent on it,
// with live statistics and a per-stage split, to judge where optimisation (or a wasm rewrite) would pay off.
// Query: seed, settings (minecraft:overworld|nether|end|amplified|...), recipe (mining|islands|chaos|spires|...), workers (0 = main thread), radius, order (spiral|rows), inflight, autorun=0
import './datapack'
// the `minecraft-worldgen` package (linked from ../minecraft-worldgen)
import { createChunkSource, type WebWorkerFactory, type WebWorkerLike } from 'minecraft-worldgen/dist/worker/pool'
import { parseWorldSeed } from 'minecraft-worldgen/dist/rng/random'
import { createWorldgenWorker } from './workerFactory'

interface ChunkSource { generate (cx: number, cz: number): Promise<{ genMs?: number, stages?: Record<string, number> }>, close (): Promise<void> }

export const isWorldgenPerf = new URLSearchParams(window.location.search).has('worldgenPerf')

interface Cell { cx: number, cz: number, state: 'pending' | 'running' | 'done' | 'error', t0: number, latency: number, genMs: number, order: number, stages?: Record<string, number>, error?: string }

const STAGE_COLORS: Record<string, string> = { biomes: '#7aa2f7', structures: '#bb9af7', noise: '#e0af68', surface: '#9ece6a', carvers: '#f7768e', features: '#2ac3de' }
const SETTINGS = ['minecraft:overworld', 'minecraft:amplified', 'minecraft:large_biomes', 'minecraft:caves', 'minecraft:floating_islands', 'minecraft:nether', 'minecraft:end']
const RECIPES = ['', 'mining', 'islands', 'chaos', 'spires', 'swiss', 'drowned', 'canyons', 'upside_down']

const spiral = (r: number): Array<[number, number]> => {
  const out: Array<[number, number]> = []
  for (let z = -r; z <= r; z++) for (let x = -r; x <= r; x++) out.push([x, z])
  return out.sort((a, b) => Math.max(Math.abs(a[0]), Math.abs(a[1])) - Math.max(Math.abs(b[0]), Math.abs(b[1])) || Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0]))
}
const pct = (sorted: number[], p: number) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] : 0)
const heat = (t: number) => { // 0..1 -> green .. yellow .. red
  const h = 120 - 120 * Math.min(1, Math.max(0, t))
  return `hsl(${h} 75% 45%)`
}

export const startWorldgenPerf = () => {
  const qs = new URLSearchParams(window.location.search)
  document.getElementById('ui-root')?.style.setProperty('display', 'none')
  document.querySelector<HTMLElement>('.initial-loader')?.style.setProperty('display', 'none')
  document.title = 'Worldgen perf'
  const root = document.createElement('div')
  root.style.cssText = 'position:fixed;inset:0;background:#15171b;color:#e8e9ed;font:13px system-ui,sans-serif;display:grid;grid-template-columns:320px 1fr;overflow:hidden;z-index:99999'
  document.body.append(root)
  const hw = navigator.hardwareConcurrency || 4
  const p = {
    seed: qs.get('seed') ?? 'hello',
    settings: qs.get('settings') ?? 'minecraft:overworld',
    recipe: qs.get('recipe') ?? '',
    workers: Number(qs.get('workers') ?? Math.max(1, Math.min(4, hw - 1))),
    radius: Number(qs.get('radius') ?? 12),
    order: qs.get('order') ?? 'spiral',
    inflight: Number(qs.get('inflight') ?? 0),
    warmup: qs.get('warmup') !== '0'
  }
  const opt = (list: string[], v: string) => list.map(x => `<option value="${x}" ${x === v ? 'selected' : ''}>${x || '(none)'}</option>`).join('')
  root.innerHTML = `
  <aside style="padding:14px;border-right:1px solid #2a2d35;overflow:auto">
    <h2 style="margin:0 0 10px;font-size:16px">World generation benchmark</h2>
    <div id="form" style="display:grid;grid-template-columns:90px 1fr;gap:6px;align-items:center">
      <label>Seed</label><input id="seed" value="${p.seed}">
      <label>Settings</label><select id="settings">${opt(SETTINGS, p.settings)}</select>
      <label>Recipe</label><select id="recipe">${opt(RECIPES, p.recipe)}</select>
      <label>Workers</label><input id="workers" type="number" min="0" max="32" value="${p.workers}">
      <label>Radius</label><input id="radius" type="number" min="1" max="40" value="${p.radius}">
      <label>Order</label><select id="order">${opt(['spiral', 'rows'], p.order)}</select>
      <label>Warm-up</label><select id="warmup"><option value="1" ${p.warmup ? 'selected' : ''}>on</option><option value="0" ${p.warmup ? '' : 'selected'}>off</option></select>
      <label>In flight</label><input id="inflight" type="number" min="0" max="64" value="${p.inflight}" title="0 = 2 x workers">
    </div>
    <p style="display:flex;gap:6px;margin:12px 0"><button id="run">Run</button><button id="stop">Stop</button><button id="copy">Copy results</button></p>
    <div id="stats" style="font:12px ui-monospace,monospace;line-height:1.55;white-space:pre"></div>
    <div id="stages" style="margin-top:10px"></div>
    <canvas id="hist" width="296" height="70" style="margin-top:10px;width:296px;height:70px"></canvas>
    <p style="opacity:.6;font-size:12px;line-height:1.4">Cell colour = ms the worker spent generating that chunk (terrain + features of the 3x3 neighbourhood that was not cached yet), green fast, red slow. Hover a cell for details.</p>
  </aside>
  <main style="position:relative;display:flex;align-items:center;justify-content:center;padding:10px"><canvas id="grid"></canvas><div id="tip" style="position:absolute;display:none;background:#000c;padding:6px 8px;border-radius:6px;font:12px ui-monospace,monospace;pointer-events:none;white-space:pre"></div></main>`
  const $ = <T extends HTMLElement>(id: string) => root.querySelector<T>('#' + id)!
  for (const b of root.querySelectorAll('button')) b.style.cssText = 'background:#2f6fed;color:#fff;border:0;border-radius:6px;padding:6px 12px;cursor:pointer'
  for (const i of root.querySelectorAll('input,select')) (i as HTMLElement).style.cssText = 'background:#1d2026;color:#e8e9ed;border:1px solid #2a2d35;border-radius:5px;padding:4px 6px;width:100%'
  const canvas = $<HTMLCanvasElement>('grid')
  const ctx = canvas.getContext('2d')!
  const tip = $('tip')

  let cells: Cell[] = []
  let { radius } = p
  let source: ChunkSource | undefined
  let runId = 0
  let startT = 0
  let endT = 0
  let dirty = true
  let sourceKey = ''
  let initMs = 0
  let curWorkers = p.workers

  const side = () => radius * 2 + 1
  const layout = () => {
    const avail = Math.min(root.clientWidth - 340, root.clientHeight - 20)
    const tile = Math.max(3, Math.floor(avail / side()))
    canvas.width = tile * side(); canvas.height = tile * side()
    canvas.style.width = canvas.width + 'px'; canvas.style.height = canvas.height + 'px'
    return tile
  }
  const cellAt = (cx: number, cz: number) => cells[(cz + radius) * side() + (cx + radius)]

  const draw = () => {
    dirty = false
    const tile = layout()
    ctx.fillStyle = '#0c0d10'; ctx.fillRect(0, 0, canvas.width, canvas.height)
    const done = cells.filter(c => c.state === 'done').map(c => c.genMs).sort((a, b) => a - b)
    const scale = Math.max(1, pct(done, 0.95))
    for (const c of cells) {
      const x = (c.cx + radius) * tile; const z = (c.cz + radius) * tile
      switch (c.state) {
        case 'done': {
          ctx.fillStyle = heat(c.genMs / scale)
          break
        }
        case 'running': {
          ctx.fillStyle = '#e0af68'
          break
        }
        case 'error': {
          ctx.fillStyle = '#ff2e63'
          break
        }
        default: ctx.fillStyle = '#1b1e25'
      }
      ctx.fillRect(x + 0.5, z + 0.5, tile - 1, tile - 1)
      if (tile >= 22 && c.state === 'done') { ctx.fillStyle = '#000a'; ctx.font = `${Math.floor(tile / 3)}px ui-monospace,monospace`; ctx.fillText(String(Math.round(c.genMs)), x + 3, z + tile / 2 + 3) }
    }
    ctx.strokeStyle = '#ffffff55'; ctx.strokeRect(radius * tile, radius * tile, tile, tile)
    stats(done, scale)
  }

  const stats = (done: number[], scale: number) => {
    const finished = cells.filter(c => c.state === 'done')
    const total = cells.length
    const elapsed = ((finished.length === total ? endT : performance.now()) - startT) / 1000
    const sum = done.reduce((a, b) => a + b, 0)
    const lat = finished.map(c => c.latency)
    const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)
    const util = elapsed > 0 ? sum / 1000 / (elapsed * Math.max(1, curWorkers)) : 0
    $('stats').textContent = [
      `chunks      ${finished.length} / ${total}${cells.some(c => c.state === 'error') ? `  (${cells.filter(c => c.state === 'error').length} errors)` : ''}`,
      `elapsed     ${elapsed.toFixed(2)} s   (init ${initMs.toFixed(0)} ms)`,
      `throughput  ${(finished.length / Math.max(elapsed, 0.001)).toFixed(1)} chunks/s`,
      `gen ms      avg ${avg(done).toFixed(1)}  p50 ${pct(done, 0.5).toFixed(1)}  p95 ${pct(done, 0.95).toFixed(1)}  max ${(done.at(-1) ?? 0).toFixed(1)}`,
      `latency ms  avg ${avg(lat).toFixed(1)}  (request -> result)`,
      `first chunk ${(finished.sort((a, b) => a.order - b.order)[0]?.genMs ?? 0).toFixed(0)} ms (cold: JIT + caches)`,
      `cpu in gen  ${(util * 100).toFixed(0)}% of ${Math.max(1, curWorkers)} ${curWorkers === 0 ? 'thread (main)' : curWorkers === 1 ? 'worker' : 'workers'}`,
      `scale       green 0 .. red ${scale.toFixed(0)} ms (p95)`
    ].join('\n')
    const stages: Record<string, number> = {}
    let terrain = 0; let decorated = 0
    for (const c of finished) {
      for (const [k, v] of Object.entries(c.stages ?? {})) {
        if (k === 'terrainChunks') terrain += v; else if (k === 'decoratedChunks') decorated += v; else stages[k] = (stages[k] ?? 0) + v
      }
    }
    const stageTotal = Object.values(stages).reduce((a, b) => a + b, 0) || 1
    $('stages').innerHTML = `<div style="font-weight:600;margin-bottom:4px">Where the time goes</div>` +
      Object.entries(stages).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div style="display:grid;grid-template-columns:78px 1fr 70px;gap:6px;align-items:center;font:12px ui-monospace,monospace"><span>${k}</span><span style="background:#222;height:10px;border-radius:3px"><i style="display:block;height:10px;border-radius:3px;width:${(100 * v / stageTotal).toFixed(1)}%;background:${STAGE_COLORS[k] ?? '#888'}"></i></span><span>${(100 * v / stageTotal).toFixed(0)}% ${(v / Math.max(1, finished.length)).toFixed(1)}ms</span></div>`).join('') +
      `<div style="opacity:.65;font:11px ui-monospace,monospace;margin-top:4px">terrain computed ${terrain}, decorated ${decorated} for ${finished.length} chunks sent${curWorkers > 1 ? ' (staged pipeline: terrain and decoration are computed once per chunk; an n x n grid ideally needs (n+4)² terrains and (n+2)² decorations)' : ''}</div>`
    // histogram of gen ms
    const h = $<HTMLCanvasElement>('hist').getContext('2d')!
    h.clearRect(0, 0, 296, 70)
    if (done.length) {
      const bins = Array.from({ length: 30 }, () => 0); const max = done.at(-1) || 1
      for (const v of done) bins[Math.min(29, Math.floor(v / max * 30))]++
      const top = Math.max(...bins)
      for (const [i, n] of bins.entries()) { h.fillStyle = heat(i / 30 * (max / scale)); h.fillRect(i * 9.8, 70 - n / top * 62, 8.6, n / top * 62) }
      h.fillStyle = '#9a9eab'; h.font = '10px system-ui'; h.fillText('0', 0, 10); h.fillText(`${max.toFixed(0)} ms`, 250, 10)
    }
  }

  const ensureSource = async (): Promise<ChunkSource> => {
    const key = JSON.stringify([p.seed, p.settings, p.recipe, p.workers, p.warmup])
    if (source && key === sourceKey) return source
    if (source) { try { await source.close() } catch {} source = undefined }
    const t = performance.now()
    const recipe = p.recipe ? { builtin: p.recipe } : undefined
    const base: any = { seed: String(parseWorldSeed(p.seed)), settings: p.settings, recipe, maxCachedChunks: 160, warmup: p.warmup }
    const provider = (globalThis as any).__MC_WORLDGEN_DATAPACK_URL
    const urls: string[] = typeof provider === 'function' ? await provider() : Array.isArray(provider) ? provider : [provider]
    if (p.workers === 0) {
      base.zipBuffers = await Promise.all(urls.map(async (url, i) => {
        const res = await fetch(url)
        return { name: `datapack${i}.zip`, data: new Uint8Array(await res.arrayBuffer()) }
      }))
      source = await createChunkSource(base, 0)
    } else {
      base.datapackUrl = urls.length === 1 ? urls[0] : urls
      const workerFactory: WebWorkerFactory = () => createWorldgenWorker() as WebWorkerLike
      source = await createChunkSource(base, p.workers, workerFactory)
    }
    initMs = performance.now() - t
    sourceKey = key
    curWorkers = p.workers
    if (!source) throw new Error('worldgen source failed to initialize')
    return source
  }

  const run = async () => {
    const id = ++runId
    p.seed = $<HTMLInputElement>('seed').value; p.settings = $<HTMLSelectElement>('settings').value; p.recipe = $<HTMLSelectElement>('recipe').value
    p.workers = Number($<HTMLInputElement>('workers').value); p.radius = Number($<HTMLInputElement>('radius').value); p.order = $<HTMLSelectElement>('order').value; p.inflight = Number($<HTMLInputElement>('inflight').value); p.warmup = $<HTMLSelectElement>('warmup').value === '1'
    radius = p.radius
    cells = []
    for (let z = -radius; z <= radius; z++) for (let x = -radius; x <= radius; x++) cells.push({ cx: x, cz: z, state: 'pending', t0: 0, latency: 0, genMs: 0, order: -1 })
    dirty = true
    $('stats').textContent = 'starting workers + loading the datapack…'
    let src: ChunkSource
    try { src = await ensureSource() } catch (e: any) { $('stats').textContent = 'failed to start: ' + String(e?.message ?? e); return }
    if (id !== runId) return
    const queue = [...(p.order === 'rows' ? cells.map(c => [c.cx, c.cz] as [number, number]) : spiral(radius))]
    const limit = p.inflight || Math.max(1, p.workers * 2)
    startT = performance.now()
    let finishedCount = 0
    await new Promise<void>(resolve => {
      let inflight = 0
      const runGenerationId = id

      const finishRun = () => {
        endT = performance.now()
        resolve()
      }

      const scheduleNext = () => {
        dirty = true
        if (runGenerationId !== runId) {
          resolve()
          return
        }
        if (queue.length === 0 && inflight === 0) {
          finishRun()
          return
        }
        pump()
      }

      const pump = () => {
        if (runGenerationId !== runId) {
          resolve()
          return
        }
        if (inflight >= limit || queue.length === 0) return

        const [cx, cz] = queue.shift()!
        const cell = cellAt(cx, cz)
        cell.state = 'running'
        cell.t0 = performance.now()
        inflight++
        dirty = true

        void src.generate(cx, cz).then(data => {
          cell.latency = performance.now() - cell.t0
          cell.genMs = data.genMs ?? cell.latency
          cell.stages = data.stages
          cell.state = 'done'
          cell.order = finishedCount++
        }).catch(e => {
          cell.state = 'error'
          cell.error = String(e?.message ?? e).slice(0, 200)
        }).finally(() => {
          inflight--
          scheduleNext()
        })

        if (inflight < limit && queue.length > 0 && runGenerationId === runId) {
          pump()
        }
      }
      pump()
    })
    if (id === runId) { dirty = true; console.log('[worldgenPerf] done', summary()) }
  }

  const summary = () => {
    const done = cells.filter(c => c.state === 'done')
    const ms = done.map(c => c.genMs).sort((a, b) => a - b)
    return { settings: p.settings, recipe: p.recipe, seed: p.seed, workers: p.workers, radius, chunks: done.length, seconds: (endT - startT) / 1000, chunksPerSecond: done.length / Math.max(0.001, (endT - startT) / 1000), genMs: { avg: ms.reduce((a, b) => a + b, 0) / Math.max(1, ms.length), p50: pct(ms, 0.5), p95: pct(ms, 0.95), max: ms.at(-1) ?? 0 }, userAgent: navigator.userAgent, cores: hw }
  }

  $('run').onclick = () => { void run() }
  $('stop').onclick = () => { runId++; for (const c of cells) if (c.state === 'running' || c.state === 'pending') c.state = 'pending'; dirty = true }
  $('copy').onclick = () => { void navigator.clipboard.writeText(JSON.stringify({ summary: summary(), chunks: cells.filter(c => c.state === 'done').map(c => ({ cx: c.cx, cz: c.cz, genMs: +c.genMs.toFixed(2), latency: +c.latency.toFixed(2), stages: c.stages })) }, null, 1)) }
  canvas.onmousemove = e => {
    const r = canvas.getBoundingClientRect(); const tile = canvas.width / side()
    const cx = Math.floor((e.clientX - r.left) / tile) - radius; const cz = Math.floor((e.clientY - r.top) / tile) - radius
    const c = cells[(cz + radius) * side() + (cx + radius)]
    if (!c || Math.abs(cx) > radius || Math.abs(cz) > radius) { tip.style.display = 'none'; return }
    tip.style.display = 'block'
    tip.style.left = `${e.clientX - canvas.parentElement!.getBoundingClientRect().left + 14}px`; tip.style.top = `${e.clientY - canvas.parentElement!.getBoundingClientRect().top + 14}px`
    tip.textContent = `chunk ${c.cx}, ${c.cz}\n${c.state}${c.state === 'done' ? `\ngen ${c.genMs.toFixed(1)} ms\nlatency ${c.latency.toFixed(1)} ms\nfinished #${c.order + 1}\n` + Object.entries(c.stages ?? {}).filter(([k]) => !k.endsWith('Chunks')).map(([k, v]) => `${k.padEnd(10)} ${v.toFixed(1)}`).join('\n') : c.error ? '\n' + c.error : ''}`
  }
  canvas.onmouseleave = () => { tip.style.display = 'none' }
  const tick = () => { if (dirty || cells.some(c => c.state === 'running')) draw(); requestAnimationFrame(tick) }
  window.addEventListener('resize', () => { dirty = true })
  tick()
  ;(globalThis as any).worldgenPerf = { run, summary, cells: () => cells }
  if (qs.get('autorun') !== '0') void run()
}
