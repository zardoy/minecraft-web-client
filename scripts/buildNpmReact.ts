import fs from 'fs'
import path from 'path'
import { build, transform } from 'esbuild'
import { execSync } from 'child_process'
// import { copy } from 'fs-extra'
import { glob } from 'glob'

const isAbsolute = (path: string) => path.startsWith('/') || /^[A-Z]:/i.test(path)

fs.promises.readdir(path.resolve(__dirname, '../src/react')).then(async files => {
  const components = files
    .filter(file => {
      if (file.startsWith('Concept')) return false
      return file.endsWith('.stories.tsx')
    })
    .map(file => {
      return file.replace('.stories.tsx', '')
    })

  const content = components
    .map(component => {
      return `export { default as ${component} } from './${component}'`
    })
    .join('\n')

  await fs.promises.writeFile(path.resolve(__dirname, '../src/react/npmReactComponents.ts'), content)

  execSync('pnpm tsc -p tsconfig.npm.json', {
    cwd: path.resolve(__dirname, '../'),
    stdio: 'inherit'
  })

  const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.npm.json'), 'utf-8'))
  const packageJsonRoot = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'))
  const external = Object.keys(packageJson.peerDependencies)
  const dependencies = new Set<string>()
  let version = process.argv[2] || packageJsonRoot.version
  version = version.replace(/^v/, '')
  packageJson.version = version

  const externalize = ['renderer', 'mc-assets']
  const { metafile } = await build({
    entryPoints: [path.resolve(__dirname, '../src/react/npmReactComponents.ts')],
    bundle: true,
    outfile: path.resolve(__dirname, '../dist-npm/bundle.esm.js'),
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    external: external,
    metafile: true,
    minify: true,
    write: false, // todo
    loader: {
      '.png': 'dataurl',
      '.jpg': 'dataurl',
      '.jpeg': 'dataurl',
      '.webp': 'dataurl',
      '.css': 'text'
    },
    plugins: [
      // on external module resolve
      {
        name: 'collect-imports',
        setup(build) {
          build.onResolve({ filter: /.*/ }, args => {
            if (args.importer.includes('node_modules') || external.some(x => args.path.startsWith(x)) || isAbsolute(args.path)) {
              return undefined
            }
            if (args.path.startsWith('./') || args.path.startsWith('../')) {
              if (args.path.endsWith('.png') || args.path.endsWith('.css') || args.path.endsWith('.jpg') || args.path.endsWith('.jpeg')) {
                const absoluteImporting = path.join(path.dirname(args.importer), args.path)
                const absoluteRoot = path.resolve(__dirname, '../src')
                const relativeToRoot = path.relative(absoluteRoot, absoluteImporting)
                fs.copyFileSync(absoluteImporting, path.resolve(__dirname, '../dist-npm/dist-pre', relativeToRoot))
              }
              // default behavior
              return undefined
            }
            const dep = args.path.startsWith('@') ? args.path.split('/').slice(0, 2).join('/') : args.path.split('/')[0]
            if (!dependencies.has(dep)) {
              dependencies.add(dep)
              console.log('Adding dependency:', dep, 'from', args.importer)
            }
            // return { external: true }
          })
        }
      }
    ]
  })
  for (const dependency of dependencies) {
    if (externalize.includes(dependency)) continue
    if (!packageJsonRoot.dependencies[dependency]) throw new Error(`Dependency ${dependency} not found in package.json`)
    packageJson.dependencies[dependency] = packageJsonRoot.dependencies[dependency]
  }
  fs.writeFileSync(path.resolve(__dirname, '../dist-npm/package.json'), JSON.stringify(packageJson, null, 2))
  // fs.promises.writeFile('./dist-npm/metafile.json', JSON.stringify(metafile, null, 2))

  await build({
    entryPoints: ['dist-npm/dist-pre/**/*.js'],
    outdir: 'dist-npm/dist',
    // allowOverwrite: true,
    jsx: 'preserve',
    bundle: true,
    target: 'esnext',
    platform: 'browser',
    format: 'esm',
    loader: {
      '.css': 'copy',
      '.module.css': 'copy',
      '.png': 'copy'
    },
    minifyWhitespace: false,
    logOverride: {
      // 'ignored-bare-import': "info"
    },
    plugins: [
      {
        name: 'all-external',
        setup(build) {
          build.onResolve({ filter: /.*/ }, args => {
            // todo use workspace deps
            if (externalize.some(x => args.path.startsWith(x))) {
              return undefined // bundle
            }
            if (args.path.endsWith('.css') || args.path.endsWith('.png') || args.path.endsWith('.jpg') || args.path.endsWith('.jpeg')) {
              return undefined // loader action
            }
            return {
              path: args.path,
              external: true
            }
          })
        }
      }
    ]
  })

  const paths = await glob('dist-npm/dist-pre/**/*.d.ts')
  // copy to dist
  for (const p of paths) {
    const relative = path.relative('dist-npm/dist-pre', p)
    const target = path.resolve('dist-npm/dist', relative)
    fs.copyFileSync(p, target)
  }
  // rm dist-pre
  fs.rmSync('dist-npm/dist-pre', { recursive: true })
  fs.copyFileSync(path.resolve(__dirname, '../README.NPM.MD'), path.resolve(__dirname, '../dist-npm/README.md'))

  if (version !== '0.0.0-dev') {
    execSync('npm publish', {
      cwd: path.resolve(__dirname, '../dist-npm'),
      env: {
        ...process.env,
        NPM_TOKEN: process.env.NPM_TOKEN,
        NODE_AUTH_TOKEN: process.env.NPM_TOKEN
      }
    })
  }
})
