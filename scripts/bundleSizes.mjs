// Summarises dist/stats-web.json (written by `WRITE_BUNDLE_STATS=true rsbuild build`): biggest packages / source dirs by module size, per chunk.
// usage: node scripts/bundleSizes.mjs [top=30]
import fs from 'node:fs'
const stats = JSON.parse(fs.readFileSync(new URL('../dist/stats-web.json', import.meta.url), 'utf8'))
const top = Number(process.argv[2] ?? 30)
const keyOf = (name = 'unknown') => {
  const m = /node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?((?:@[^/]+\/)?[^/]+)/.exec(name)
  if (m) return m[1]
  if (/generated\//.test(name)) return 'generated/' + name.split('generated/')[1]
  return name.startsWith('./src/') ? `src/${name.split('/')[2]}` : name.replace(/^\.\//, '').split('/').slice(0, 2).join('/')
}
const flatten = (mods, out = []) => {
  for (const m of mods ?? []) { if (m.modules?.length) flatten(m.modules, out); else out.push(m) }
  return out
}
for (const chunk of stats.chunks ?? []) {
  const sizes = new Map()
  for (const m of flatten(chunk.modules)) sizes.set(keyOf(m.name ?? m.identifier), (sizes.get(keyOf(m.name ?? m.identifier)) ?? 0) + (m.size ?? 0))
  const total = [...sizes.values()].reduce((a, b) => a + b, 0)
  if (total < 300000) continue
  console.log(`\n== chunk ${chunk.id} ${chunk.names?.join(',') ?? ''}: ${(total / 1e6).toFixed(2)} MB (pre-minification)`)
  for (const [k, v] of [...sizes].sort((a, b) => b[1] - a[1]).slice(0, top)) console.log((v / 1e6).toFixed(2).padStart(7), 'MB', k)
}
