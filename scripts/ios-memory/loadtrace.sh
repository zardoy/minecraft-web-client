#!/bin/bash
# usage: loadtrace.sh label url  -> records the whole load as a time series and prints peak/series of the page process
HERE=$(cd "$(dirname "$0")" && pwd)   # resolved before the cd below
S=${IOS_MEM_DIR:-/tmp/ios-memory}; mkdir -p "$S"   # working dir for traces
UDID=${IOS_UDID:?set IOS_UDID (xcrun xctrace list devices)}
label=$1; url=$2
cd ${IOS_HELPERS:-$HOME/.claude/ios-testing}   # newsession.py / wd.py (WebDriver helpers)
python3 -I wd.py end >/dev/null 2>&1
for i in 1 2 3 4 5 6 7 8 9 10; do
  rm -rf $S/w.trace; xcrun xctrace record --template 'Activity Monitor' --device $UDID --all-processes --time-limit 3s --output $S/w.trace >/dev/null 2>&1
  xcrun xctrace export --input $S/w.trace --xpath '/trace-toc/run[1]/data/table[@schema="sysmon-process"]' --output $S/w.xml >/dev/null 2>&1
  big=$(python3 -I $HERE/footprint.py $S/w.xml | awk '{print int($1)}'); [ "${big:-0}" -lt 150 ] && break; sleep 8
done
rm -rf $S/lt.trace
xcrun xctrace record --template 'Activity Monitor' --device $UDID --all-processes --time-limit 75s --output $S/lt.trace >/dev/null 2>&1 &
sleep 6
python3 -I - <<PY
import json, urllib.request
caps = {"capabilities": {"alwaysMatch": {"browserName": "Safari", "platformName": "iOS", "safari:deviceUDID": "$UDID", "safari:deviceType": "iPhone", "acceptInsecureCerts": True}}}
r = urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:4445/session", data=json.dumps(caps).encode(), headers={"Content-Type": "application/json"}), timeout=120)
open("sid.txt", "w").write(json.loads(r.read())["value"]["sessionId"])
PY
python3 -I wd.py url "$url" >/dev/null 2>&1
alive=""
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14; do sleep 5; a=$(python3 -I wd.py js 'return String(Math.round(performance.now()/1000))+":"+(window.miscUiState?.gameLoaded?"L":"-")' 2>&1 | tail -1 | tr -d '"'); case "$a" in HTTP*) alive="$alive X"; ;; *) alive="$alive $a";; esac; done
wait
xcrun xctrace export --input $S/lt.trace --xpath '/trace-toc/run[1]/data/table[@schema="sysmon-process"]' --output $S/lt.xml >/dev/null 2>&1
echo "$label | $(python3 -I $HERE/peak.py $S/lt.xml 2>&1 | tail -1) | session:$alive"
