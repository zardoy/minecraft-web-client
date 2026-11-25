// Builds `generated/mc-gamedata.gamedata` (a JSON bundle `{ "data/minecraft/...json": {...} }` that space-squid's GameData reads from `globalThis.__MC_GAMEDATA_URL`): the vanilla chest loot tables and cooking recipes (smelting, blasting, smoking) the local server (space-squid containers / smelting) needs.
// Small on purpose (~145 KB raw, ~10 KB gzipped: one JSON compresses far better than a zip of 165 files) and nothing else of the 40 MB client jar is kept; the bundled worldgen pack does not carry these directories.
// Usage: node scripts/buildGamedataPack.mjs [out] ; reads MC_WORLDGEN_VANILLA_JAR / ~/.cache/mc-worldgen/client.jar (the build downloads it for the worldgen pack first).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import AdmZip from 'adm-zip'

const out = process.argv[2] ?? 'generated/mc-gamedata.gamedata'
const jar = process.env.MC_WORLDGEN_VANILLA_JAR ?? path.join(os.homedir(), '.cache/mc-worldgen/client.jar')
if (!fs.existsSync(jar)) throw new Error(`vanilla client jar not found: ${jar}`)

const COOKING = new Set(['smelting', 'blasting', 'smoking'])
const bundle = {}
let loot = 0
let recipes = 0
for (const e of new AdmZip(jar).getEntries()) {
  if (e.isDirectory) continue
  const name = e.entryName
  const isLoot = /^data\/minecraft\/loot_table\/chests\/.+\.json$/.test(name)
  const isRecipe = /^data\/minecraft\/recipe\/.+\.json$/.test(name)
  if (!isLoot && !isRecipe) continue
  const json = JSON.parse(e.getData().toString('utf8'))
  if (isRecipe && !COOKING.has(String(json.type).replace('minecraft:', ''))) continue
  bundle[name] = json
  if (isLoot) loot++
  else recipes++
}
if (!loot || !recipes) throw new Error(`unexpected jar content: ${loot} chest loot tables, ${recipes} cooking recipes`)
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true })
fs.writeFileSync(out, JSON.stringify(bundle))
console.log(`${out}: ${loot} chest loot tables, ${recipes} cooking recipes, ${fs.statSync(out).size} bytes`)
