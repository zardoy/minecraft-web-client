// Game data of the local server (space-squid `containers` / `smelting`): chest loot tables and cooking recipes, a ~10 KB gzipped JSON bundle built by scripts/buildGamedataPack.mjs from the
// vanilla jar. Fetched by the server's `GameData` on first use, not part of the worldgen pack. In the single file build it is a data: url.
import gamedataUrl from 'gamedata-bundle.gamedata'

;(globalThis as any).__MC_GAMEDATA_URL = gamedataUrl
