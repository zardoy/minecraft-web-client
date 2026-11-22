// Shrinks a single file build: every big inline classic script is gzipped + base64'd and decompressed at load time (DecompressionStream, all current browsers).
// The file gets about 2x smaller (the scripts are most of it). Scripts run in their original order once all of them are decompressed.
// usage: node scripts/compressSingleFile.mjs <in.html> [out.html]   (also called by rsbuild.config.ts for the slim build)
import fs from 'node:fs'
import zlib from 'node:zlib'

const MIN_SIZE = 20_000

/** @returns {Array<{start: number, end: number, attrs: string, content: string}>} classic inline scripts (document order, nested "<script" inside string literals are skipped) */
export const findInlineScripts = (html) => {
  const out = []
  let pos = 0
  for (;;) {
    const start = html.indexOf('<script', pos)
    if (start < 0) break
    const tagEnd = html.indexOf('>', start)
    const close = html.indexOf('</script>', tagEnd)
    if (close < 0) break
    const attrs = html.slice(start + 7, tagEnd)
    out.push({ start, end: close + 9, attrs, content: html.slice(tagEnd + 1, close) })
    pos = close + 9
  }
  return out
}

const loader = `(async () => {
  const els = [...document.querySelectorAll('script[data-gz]')]
  if (typeof DecompressionStream === 'undefined') { document.body.textContent = 'This browser is too old (DecompressionStream is required).'; return }
  const inflate = async (b64) => {
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text()
  }
  const texts = await Promise.all(els.map(e => inflate(e.textContent)))
  els.forEach((e, i) => {
    if (e.dataset.gz === 'text') { e.removeAttribute('data-gz'); e.textContent = texts[i] } else {
      const s = document.createElement('script')
      s.textContent = texts[i]
      document.head.appendChild(s)
    }
  })
})()`

export const compressSingleFile = (html) => {
  const scripts = findInlineScripts(html).filter(s => !/\bsrc=|type="module"/.test(s.attrs) && s.content.length >= MIN_SIZE)
  if (!scripts.length) return html
  let out = ''
  let last = 0
  for (const s of scripts) {
    out += html.slice(last, s.start)
    last = s.end
    const gz = zlib.gzipSync(Buffer.from(s.content, 'utf8'), { level: 9 }).toString('base64')
    // scripts that the app reads through textContent (the mesher worker code) stay elements, but are never executed
    const asText = /\bid="mesher-worker-code"/.test(s.attrs)
    out += `<script type="text/plain" data-gz="${asText ? 'text' : 'script'}"${asText ? ' id="mesher-worker-code"' : ''}>${gz}</script>`
  }
  // after the last blob: the loader collects every blob that is already parsed when it runs
  out += `<script>${loader}</script>`
  out += html.slice(last)
  return out
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file://').href) {
  const [input, output = input] = process.argv.slice(2)
  const html = fs.readFileSync(input, 'utf8')
  const result = compressSingleFile(html)
  fs.writeFileSync(output, result, 'utf8')
  console.log(`${input}: ${(Buffer.byteLength(html) / 1e6).toFixed(2)} MB -> ${(Buffer.byteLength(result) / 1e6).toFixed(2)} MB`)
}
