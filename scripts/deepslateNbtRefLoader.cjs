/**
 * Deepslate namespace classes are both named `Ref`. Scope-hoisting concatenates
 * NbtChunk.js and NbtRegion.js into one scope and then `let Ref` is declared twice.
 */
module.exports = function (source) {
  const file = this.resourcePath.replaceAll('\\', '/')
  const name = file.endsWith('NbtRegion.js') ? 'NbtRegionRef' : 'NbtChunkRef'
  return source
    .replaceAll('class Ref', `class ${name}`)
    .replaceAll('.Ref = Ref', `.Ref = ${name}`)
}
