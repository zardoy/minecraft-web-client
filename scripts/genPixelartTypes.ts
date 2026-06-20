import fs from 'fs'

const icons = fs.readdirSync('node_modules/pixelarticons/svg')

const addIconPath = '../../node_modules/pixelarticons/svg/'

let str = 'export type PixelartIconsGenerated = {\n'
for (const icon of icons) {
  const name = icon.replace('.svg', '')
  // jsdoc
  const jsdocImage = '![image](' + addIconPath + icon + ')'
  str += `  /** ${jsdocImage} */\n`
  str += ` '${name}': string;\n`
}
str += '}\n'
fs.writeFileSync('./src/react/pixelartIcons.generated.ts', str, 'utf8')
