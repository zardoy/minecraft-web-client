import fs from 'fs'

// GitHub details
const owner = 'zardoy'
const repo = 'minecraft-web-client'
const branch = 'sounds-generated'
const filePath = 'dist/sounds.js' // Local file path
const repoFilePath = 'sounds-v2.js' // Path in the repo

// GitHub token for authentication
const token = process.env.GITHUB_TOKEN

// GitHub API endpoint
const baseUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${repoFilePath}`

const headers = {
  Authorization: `token ${token}`,
  'Content-Type': 'application/json'
}

async function getShaForExistingFile(): Promise<string | null> {
  const url = `${baseUrl}?ref=${branch}`
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

async function uploadFile() {
  const content = fs.readFileSync(filePath, 'utf8')
  const base64Content = Buffer.from(content).toString('base64')
  const sha = await getShaForExistingFile()
  console.log('got sha')

  const body = {
    message: 'Update sounds.js',
    content: base64Content,
    branch: branch,
    committer: {
      name: 'GitHub',
      email: 'noreply@github.com'
    },
    sha: sha || undefined
  }

  const response = await fetch(baseUrl, {
    method: 'PUT',
    headers: headers,
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    throw new Error(`Failed to upload file: ${response.statusText}`)
  }

  const responseData = await response.json()
  console.log('File uploaded successfully:', responseData)
}

uploadFile().catch(error => {
  console.error('Error uploading file:', error)
})
