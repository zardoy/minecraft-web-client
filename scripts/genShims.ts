import fs from 'fs'
import { appReplacableResources } from '../src/resourcesSource'

fs.mkdirSync('./generated', { recursive: true })

// app resources

let headerImports = ''
let resourcesContent = 'export const appReplacableResources: { [key in Keys]: { content: any, resourcePackPath: string, cssVar?: string, cssVarRepeat?: number } } = {\n'
let resourcesContentOriginal = 'export const resourcesContentOriginal = {\n'
const keys = [] as string[]

for (const resource of appReplacableResources) {
  const { path, name: nameOverride, ...rest } = resource
  let name = nameOverride ?? path.split('/').slice(-4).join('_').replace('.png', '').replaceAll('-', '_').replaceAll('.', '_')
  if (name.match(/^\d+/)) {
    name = `_${name}`
  }
  keys.push(name)
  headerImports += `import ${name} from '${path.replace('../node_modules/', '')}'\n`

  resourcesContent += `
  '${name}': {
    content: ${name},
    resourcePackPath: 'minecraft/textures/${path.slice(path.indexOf('other-textures/') + 'other-textures/'.length).split('/').slice(1).join('/')}',
    ...${JSON.stringify(rest)}
  },
`
  resourcesContentOriginal += `
  '${name}': ${name},
`
}

resourcesContent += '}\n'
resourcesContent += `type Keys = ${keys.map(k => `'${k}'`).join(' | ')}\n`
resourcesContentOriginal += '}\n'
resourcesContent += resourcesContentOriginal

fs.mkdirSync('./src/generated', { recursive: true })
fs.writeFileSync('./src/generated/resources.ts', headerImports + '\n' + resourcesContent, 'utf8')
