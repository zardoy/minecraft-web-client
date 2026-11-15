# usage: python3 scripts/singleFileBreakdown.py dist/single-slim/index.html : size of every inline script / big literal in a single file build
import re, sys
h = open(sys.argv[1], encoding='utf8').read()
print('total', round(len(h.encode()) / 1e6, 2), 'MB')
for m in re.finditer(r'<script[^>]*>(.*?)</script>', h, re.S):
    s = m.group(1)
    if len(s) < 100000: continue
    print('script', round(len(s) / 1e6, 2), 'MB', m.group(0)[:50].replace('\n', ' '))
    for lm in sorted(re.finditer(r'"(?:[^"\\\n]|\\.){100000,}"', s), key=lambda x: -len(x.group(0)))[:6]:
        print('    string', round(len(lm.group(0)) / 1e6, 2), 'MB', lm.group(0)[:36])
    for jm in sorted(re.finditer(r"JSON\.parse\('(?:[^'\\]|\\.){100000,}'\)", s), key=lambda x: -len(x.group(0)))[:6]:
        print('    JSON.parse', round(len(jm.group(0)) / 1e6, 2), 'MB', jm.group(0)[12:60])
