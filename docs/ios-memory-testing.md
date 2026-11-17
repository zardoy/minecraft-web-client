# iOS memory testing

How the client's memory use was measured on a real iPhone, what was found, and the "ballast" method for testing a small phone's headroom on a big one.
Written 2026-11-17 from a session on an iPhone 14 Pro (iOS 26.5, 6 GB) driven from a Mac. Numbers are single devices and a handful of runs each: treat them as orders of magnitude, not benchmarks.

## Findings

Page process (`com.apple.WebKit.WebContent`) footprint, dev/production build of this client, 1.20.1 singleplayer, render distance 3 (49 chunks):

| Scene | Footprint |
|---|---|
| Title screen only (no world) | ~550 MiB (full data), ~335 MiB (data clipped to 1.17.1-1.20.1, no recipes/language) |
| Multiplayer world loaded (`wss://play.mcraft.fun`, 1.17.1) | ~1000-1050 MiB |
| Singleplayer world loaded | ~1200-1330 MiB settled, **peak 1.24-1.37 GiB at 12-38 s of the load** |

- **One worldgen worker** is what singleplayer uses on iOS and low-memory Android (`src/worldgen/lowMemoryDevice.ts`). Each worker holds its own generator (~150 MB measured). With 4 workers an iPhone XR (3 GB, iOS 18.7) was killed by jetsam (`highwater`, 1536 MiB) during startup.
- **What did not move the footprint** (idle, 14 Pro): number of mesher workers (1 vs 2: ~1065 vs ~1050 MiB, one 739 MiB reading was an outlier), render distance 2 vs 3 (994 vs 1013), pixel ratio 3 vs 1.5 vs 1 (883-1122, noise; measured with a local `?pixelRatio=` override of the renderer that is not part of any release), HTTPS with `crossOriginIsolated` vs plain HTTP.
- **What did:** clipping the bundled minecraft-data (`MIN_MC_VERSION` / `MAX_MC_VERSION`, `SKIP_MC_DATA_RECIPES`, `SKIP_MC_DATA_LANGUAGE`) saves ~215 MiB on the title screen (the 17.45 MB `mc-data` script becomes 8.41 MB), but little once a world is loaded and nothing at the load peak.
- **The renderer uses no `SharedArrayBuffer`**, and the wasm mesher is tiny (150 KB, 1.1 MiB initial memory), so isolation / SAB cannot explain the footprint. Chrome shows ~25 MB of JS heap per mesher worker; the phone's ~1 GiB is not attributed.
- **The 14 Pro does not crash on any of this** (14 of 14 singleplayer loads survived once old page processes were gone), and it tolerates far more (a 14 Pro tab survived 4.1 GiB earlier). An iPhone XR is killed at about **1.5 GiB**: a 1.37 GiB peak leaves it ~10% headroom, which is the likely reason older phones crash. The question "how close are we to the limit of a small phone" cannot be answered on the 14 Pro directly, hence the ballast below.

## Pitfalls (each of these cost hours)

- **Do not rely on JetsamEvent / crash reports.** The phone stopped writing them; a missing report does not mean no memory kill.
- **A dead WebDriver session is not proof of a crash** (the automation window also drops on its own on heavy pages).
- **The page inside the WebDriver automation window is hard to see** in `xctrace` early on (its process can look tiny); after the page is loaded the big `WebContent` process is visible and is the page.
- **Old page processes stay alive** after a session ends (480-1250 MiB each) and compete for memory, which made earlier runs crash. Always end the session and wait until no `WebContent` process is above ~150 MiB before the next run (`harness.sh` does this).
- **Single runs lie** (738 vs 1063 MiB for the same config). Take at least 2-3 and report the range.
- Heavy runs can make `xctrace export` segfault: repeat the run.
- `crossOriginIsolated` needs HTTPS (or localhost). A LAN IP over plain HTTP is not a secure context. The WebDriver session accepts a self-signed / mkcert certificate with the capability `acceptInsecureCerts`, nothing to install on the phone.

## Tools (`scripts/ios-memory/`)

Needs a USB-connected iPhone (Settings > Safari > Advanced: Web Inspector and Remote Automation on, Developer Mode on), `safaridriver -p 4445` running, and WebDriver helpers `newsession.py` / `wd.py` (default `~/.claude/ios-testing`, override with `IOS_HELPERS`).

- `harness.sh <label> <url>`: clean slate, fresh session, load, wait 45 s, print the footprints (top 3 `WebContent`) and the renderer's pixel ratio / drawing buffer.
- `loadtrace.sh <label> <url>`: records the whole 75 s load as a time series and prints the page process's **peak**, its value at 10/20/30/45/60 s and whether the session stayed alive.
- `footprint.py`, `peak.py`: parse an `xctrace export` of the `sysmon-process` table (`memory-physical-footprint` raw bytes in the element text; the formatted value uses the phone's locale).
- `https-proxy.js`: mkcert https in front of `node server.js --prod <port>` that also logs the page's `/__log` pings.

```
export IOS_UDID=<xcrun xctrace list devices>
node server.js --prod 8767 &                         # production build (pnpm build)
node scripts/ios-memory/https-proxy.js &             # https://<lan-ip>:8768 -> 8767
scripts/ios-memory/loadtrace.sh "full sp" "https://<lan-ip>:8768/?sp=1&version=1.20.1&seed=perf1&r=1"
```

Gotchas of this client's dev server: `server.js` listens on 8080 when `require`d, run it as the main module (`--prod <port>`); with a `file:` renderer link its `/wasm_mesher_bg.wasm` route points into a renderer `public/` folder that may not exist (mesher then fails with "HTTP status code is not ok" and no terrain shows).

## Ballast: emulating a small phone on a big one (not yet used)

`src/dev/memoryBallast.ts` (inert unless the URL has `ballastMB` / `ballastCalibrate` / `ballastLog`): `?ballastMB=N` allocates N MiB of real incompressible memory before the app starts (iOS counts compressed memory in the footprint, so the content is random), `?ballastCalibrate=1` allocates in steps until the tab dies. Both post `/__log?m=...` heartbeats every 3 s, which the proxy writes to a file; the last heartbeat is the time of death.

Plan:

1. **Calibrate** the phone: run `?ballastCalibrate=1` and read the last `ok N` in the log = the bare page's limit L (title screen already counts ~335-550 MiB).
2. For a target phone with limit T (XR: ~1.5 GiB), the ballast that makes the 14 Pro behave like it is L - T.
3. **Score a configuration by the largest ballast it survives** a 75 s load (binary search, ~5 runs): headroom in MiB instead of crashed / not crashed. Compare full vs clipped data, lighting on/off, mesher count, ...

Status: the hook compiles and lints; it has **not** been run on a phone yet, and the limit of the 14 Pro was not calibrated.

## Open

- Where the ~550 MiB of the title screen and the ~500 MiB a world adds go (not attributable from Safari; Web Inspector heap snapshots on a Mac would).
- Whether lighting on by default (client light owner worker + wasm) changes the peak: compare with `loadtrace.sh` before and after.
