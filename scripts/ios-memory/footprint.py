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
    if ft and 'WebContent' in p: ser.setdefault(p, []).append(int(ft) / 1048576)
top = sorted(((sum(v) / len(v), p) for p, v in ser.items()), reverse=True)[:3]
print(' '.join(f'{m:.0f}' for m, _ in top) if top else '0')
