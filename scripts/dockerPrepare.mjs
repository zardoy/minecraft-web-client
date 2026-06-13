//@ts-check
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

// Get repository from git config
const getGitRepository = () => {
    try {
        const gitConfig = fs.readFileSync('.git/config', 'utf8')
        const originUrlMatch = gitConfig.match(/\[remote "origin"\][\s\S]*?url = .*?github\.com[:/](.*?)(\.git)?\n/m)
        if (originUrlMatch) {
            return originUrlMatch[1]
        }
    } catch (err) {
        console.warn('Failed to read git repository from config:', err)
    }
    return null
}

// write release tag and repository info
const commitShort = execSync('git rev-parse --short HEAD').toString().trim()
const repository = getGitRepository()
fs.writeFileSync('./assets/release.json', JSON.stringify({
    latestTag: `${commitShort} (docker)`,
    repository
}), 'utf8')

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'))
delete packageJson.optionalDependencies
fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2), 'utf8')
