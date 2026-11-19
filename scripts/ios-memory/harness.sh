#!/bin/bash
# usage: harness.sh label "url-with-params"   -> prints one result line
HERE=$(cd "$(dirname "$0")" && pwd)   # resolved before the cd below
S=${IOS_MEM_DIR:-/tmp/ios-memory}; mkdir -p "$S"   # working dir for traces
UDID=${IOS_UDID:?set IOS_UDID (xcrun xctrace list devices)}
label=$1; url=$2
cd ${IOS_HELPERS:-$HOME/.claude/ios-testing}   # newsession.py / wd.py (WebDriver helpers)
python3 -I wd.py end >/dev/null 2>&1
# wait until no big page process is left (max ~100 s)
for i in 1 2 3 4 5 6 7 8 9 10; do
  rm -rf $S/w.trace
  xcrun xctrace record --template 'Activity Monitor' --device $UDID --all-processes --time-limit 3s --output $S/w.trace >/dev/null 2>&1
  xcrun xctrace export --input $S/w.trace --xpath '/trace-toc/run[1]/data/table[@schema="sysmon-process"]' --output $S/w.xml >/dev/null 2>&1
  big=$(python3 -I $HERE/footprint.py $S/w.xml | awk '{print int($1)}')
  [ "${big:-0}" -lt 150 ] && break
  sleep 8
done
python3 -I - <<PY
import json, urllib.request
caps = {"capabilities": {"alwaysMatch": {"browserName": "Safari", "platformName": "iOS", "safari:deviceUDID": "$UDID", "safari:deviceType": "iPhone", "acceptInsecureCerts": True}}}
r = urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:4445/session", data=json.dumps(caps).encode(), headers={"Content-Type": "application/json"}), timeout=120)
open("sid.txt", "w").write(json.loads(r.read())["value"]["sessionId"])
PY
python3 -I wd.py url "$url" >/dev/null 2>&1
sleep 45
info=$(python3 -I wd.py js 'const r=window.world?.renderer; const gl=r?.getContext?.(); return JSON.stringify({t:Math.round(performance.now()/1000), pr: r?.getPixelRatio?.(), buffer: gl? gl.drawingBufferWidth+"x"+gl.drawingBufferHeight : null, loaded: !!window.miscUiState?.gameLoaded, chunks: Object.keys(window.appViewer?.rendererState?.world?.chunksLoaded??{}).length})' 2>&1 | tail -1 | tr -d '\\')
rm -rf $S/r.trace
xcrun xctrace record --template 'Activity Monitor' --device $UDID --all-processes --time-limit 5s --output $S/r.trace >/dev/null 2>&1
xcrun xctrace export --input $S/r.trace --xpath '/trace-toc/run[1]/data/table[@schema="sysmon-process"]' --output $S/r.xml >/dev/null 2>&1
fp=$(python3 -I $HERE/footprint.py $S/r.xml)
echo "$label | start-big=${big:-?} | footprints(top3 MiB)=$fp | $info"
