// pnpm bug workaround
import fs from 'fs'
import { parse } from 'yaml'
import _ from 'lodash'

const lockfile = parse(fs.readFileSync('./pnpm-lock.yaml', 'utf8'))
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'))
const depsKeys = ['dependencies', 'devDependencies']

const githubToken = process.env.GITHUB_TOKEN
const ignoreDeps = packageJson.pnpm?.updateConfig?.ignoreDependencies ?? []

const outdatedDeps = []

const allDepsObj = {}

for (const [key, val] of Object.entries(lockfile.importers)) {
  // Object.assign(allDepsObj, val)
  _.merge(allDepsObj, val)
}

for (const [depsKey, deps] of Object.entries(allDepsObj)) {
  for (const [depName, { specifier, version }] of Object.entries(deps)) {
    if (ignoreDeps.includes(depName)) continue
    if (!specifier.startsWith('github:')) continue
    // console.log('checking github:', depName, version, specifier)

    let possiblyBranch = specifier.match(/#(.*)$/)?.[1] ?? ''
    if (possiblyBranch) possiblyBranch = `/${possiblyBranch}`
    const sha = version.split('/').slice(3).join('/').replace(/\(.+/, '')
    const repo = version.split('/').slice(1, 3).join('/')

    const lastCommitJson = await fetch(`https://api.github.com/repos/${repo}/commits${possiblyBranch}?per_page=1`, {
      headers: {
        Authorization: githubToken ? `token ${githubToken}` : undefined
      }
    }).then(res => res.json())

    const lastCommitActual = lastCommitJson ?? lastCommitJson[0]
    const lastCommitActualSha = Array.isArray(lastCommitActual) ? lastCommitActual[0]?.sha : lastCommitActual?.sha
    if (lastCommitActualSha === undefined) debugger
    if (sha !== lastCommitActualSha) {
      // console.log(`Outdated ${depName} github.com/${repo} : ${sha} -> ${lastCommitActualSha} (${lastCommitActual.commit.message})`)
      outdatedDeps.push({ depName, repo, sha, lastCommitActualSha })
    }
  }
}

if (outdatedDeps.length) {
  throw new Error(
    `Outdated dependencies found: \n${outdatedDeps.map(({ depName, repo, sha, lastCommitActualSha }) => `${depName} github.com/${repo} : ${sha} -> ${lastCommitActualSha}`).join('\n')}`
  )
}
