import sys, xml.etree.ElementTree as ET
r = ET.parse(sys.argv[1]).getroot()
cols = [c.find('mnemonic').text for c in r.find('.//schema').findall('col')]
reg = {}
for e in r.iter():
    if 'id' in e.attrib and e.tag != 'schema': reg[e.attrib['id']] = e
res = lambda e: reg.get(e.attrib['ref'], e) if 'ref' in e.attrib else e
ser = {}
for row in r.findall('.//row'):
    d = dict(zip(cols, list(row)))
    p = res(d['process']).attrib.get('fmt', '')
    ft = res(d['memory-physical-footprint']).text
    if ft and 'WebContent' in p and 'Enhanced' not in p: ser.setdefault(p, []).append((int(res(d['time']).text) / 1e9, int(ft) / 1048576))
# the page = the process whose footprint grew the most during the trace
best = max(ser.items(), key=lambda kv: max(v for _, v in kv[1]) - min(v for _, v in kv[1]))
pts = best[1]
t0 = pts[0][0]
mx = max(pts, key=lambda x: x[1])
at = lambda t: min(pts, key=lambda x: abs(x[0] - t))[1]
print(f"pid={best[0].split('(')[1][:-1]} n={len(pts)} lived={pts[-1][0]-t0:.0f}s peak={mx[1]:.0f}MiB@{mx[0]-t0:.0f}s last={pts[-1][1]:.0f} | t=10:{at(t0+10):.0f} 20:{at(t0+20):.0f} 30:{at(t0+30):.0f} 45:{at(t0+45):.0f} 60:{at(t0+60):.0f}")
