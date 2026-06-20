import fetch from 'node-fetch'
import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'

// Git details
const REPO_SLUG = process.env.REPO_SLUG
const owner = REPO_SLUG.split('/')[0]
const repo = REPO_SLUG.split('/')[1]
const branch = 'sounds'

// GitHub token for authentication
const token = process.env.GITHUB_TOKEN

// GitHub API endpoint
const baseUrl = `https://api.github.com/repos/${owner}/${repo}/contents`

const headers = {
  Authorization: `token ${token}`,
  'Content-Type': 'application/json'
}

async function getShaForExistingFile(repoFilePath: string): Promise<string | null> {
  const url = `${baseUrl}/${repoFilePath}?ref=${branch}`
  const response = await fetch(url, { headers })
  if (response.status === 404) {
    return null // File does not exist
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`)
  }
  const data = await response.json()
  return data.sha
}

async function uploadFiles() {
  const commitMessage = 'Upload multiple files via script'
  const committer = {
    name: 'GitHub',
    email: 'noreply@github.com'
  }

  const filesToUpload = glob.sync('generated/sounds/**/*.mp3').map(localPath => {
    const repoPath = localPath.replace(/^generated\//, '')
    return { localPath, repoPath }
  })

  const files = await Promise.all(
    filesToUpload.map(async file => {
      const content = fs.readFileSync(file.localPath, 'base64')
      const sha = await getShaForExistingFile(file.repoPath)
      return {
        path: file.repoPath,
        mode: '100644',
        type: 'blob',
        sha: sha || undefined,
        content: content
      }
    })
  )

  const treeResponse = await fetch(`${baseUrl}/git/trees`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({
      base_tree: null,
      tree: files
    })
  })

  if (!treeResponse.ok) {
    throw new Error(`Failed to create tree: ${treeResponse.statusText}`)
  }

  const treeData = await treeResponse.json()

  const commitResponse = await fetch(`${baseUrl}/git/commits`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({
      message: commitMessage,
      tree: treeData.sha,
      parents: [branch],
      committer: committer
    })
  })

  if (!commitResponse.ok) {
    throw new Error(`Failed to create commit: ${commitResponse.statusText}`)
  }

  const commitData = await commitResponse.json()

  const updateRefResponse = await fetch(`${baseUrl}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    headers: headers,
    body: JSON.stringify({
      sha: commitData.sha
    })
  })

  if (!updateRefResponse.ok) {
    throw new Error(`Failed to update ref: ${updateRefResponse.statusText}`)
  }

  console.log('Files uploaded successfully')
}

uploadFiles().catch(error => {
  console.error('Error uploading files:', error)
})
