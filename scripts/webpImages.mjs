// Re-encodes the PNG data URLs inside a single file build as lossless WebP (the atlases get ~45% smaller, pixels stay identical, alpha-0 colours are kept).
// WebP lossless is supported by every browser the single file already needs (Safari 14+, DecompressionStream is newer anyway). A PNG is kept when WebP would not be smaller.
// usage: node scripts/webpImages.mjs <in.html> [out.html]   (also called by rsbuild.config.ts for the slim build)
import fs from 'node:fs'
import sharp from 'sharp'

const MIN_BYTES = 4000

/** @returns {Promise<{ html: string, before: number, after: number, count: number }>} */
export const pngDataUrlsToWebp = async (html) => {
  const cache = new Map()
  let before = 0
  let after = 0
  let count = 0
  const re = /data:image\/png;base64,([A-Za-z0-9+/=]+)/g
  const found = new Set()
  for (const m of html.matchAll(re)) if (m[1].length * 0.75 >= MIN_BYTES) found.add(m[1])
  for (const b64 of found) {
    const png = Buffer.from(b64, 'base64')
    // for lossless, quality is the compression effort of libwebp (the default 80 gives ~40% bigger files)
    const webp = await sharp(png).webp({ lossless: true, exact: true, effort: 6, quality: 100 }).toBuffer()
    before += png.length
    if (webp.length < png.length * 0.95) {
      cache.set(b64, 'data:image/webp;base64,' + webp.toString('base64'))
      after += webp.length
      count++
    } else after += png.length
  }
  const out = html.replace(re, (all, b64) => cache.get(b64) ?? all)
  return { html: out, before, after, count }
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file://').href) {
  const [input, output = input] = process.argv.slice(2)
  const { html, before, after, count } = await pngDataUrlsToWebp(fs.readFileSync(input, 'utf8'))
  fs.writeFileSync(output, html, 'utf8')
  console.log(`${count} images: ${(before / 1024).toFixed(0)} KB -> ${(after / 1024).toFixed(0)} KB`)
}
