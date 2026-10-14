export const getProxyDetails = async (proxyBaseUrl: string) => {
  if (!proxyBaseUrl.startsWith('http')) proxyBaseUrl = `${isPageSecure() ? 'https' : 'http'}://${proxyBaseUrl}`
  const url = `${proxyBaseUrl}/api/vm/net/connect`
  let result: Response
  try {
    result = await fetch(url)
  } catch (err) {
    throw new Error(`Selected proxy server ${proxyBaseUrl} most likely is down`)
  }
  return result
}

export default async ({ tokenCaches, proxyBaseUrl, setProgressText = (text) => { }, setCacheResult, connectingServer }) => {
  let onMsaCodeCallback
  let connectingVersion = ''
  // const authEndpoint = 'http://localhost:3000/'
  // const sessionEndpoint = 'http://localhost:3000/session'
  let authEndpoint: URL | undefined
  let sessionEndpoint: URL | undefined
  const result = await getProxyDetails(proxyBaseUrl)

  try {
    const json = await result.json()
    authEndpoint = urlWithBase(json.capabilities.authEndpoint, proxyBaseUrl)
    sessionEndpoint = urlWithBase(json.capabilities.sessionEndpoint, proxyBaseUrl)
    if (!authEndpoint) throw new Error('No auth endpoint')
  } catch (err) {
    console.error(err)
    throw new Error(`Selected proxy server ${proxyBaseUrl} does not support Microsoft authentication`)
  }
  const authFlow = {
    async getMinecraftJavaToken () {
      setProgressText('Authenticating with Microsoft account')
      if (!window.crypto && !isPageSecure()) throw new Error('Crypto API is available only in secure contexts. Be sure to use https!')
      let result = null
      await fetch(authEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...tokenCaches,
          // important to set this param and not fake it as auth server might reject the request otherwise
          connectingServer,
          connectingServerVersion: connectingVersion
        }),
      })
        .catch(e => {
          throw new Error(`Failed to connect to auth server (network error): ${e.message}`)
        })
        .then(async response => {
          if (!response.ok) {
            throw new Error(`Auth server error (${response.status}): ${await response.text()}`)
          }

          const reader = response.body!.getReader()
          const decoder = new TextDecoder('utf8')
          let buffer = ''

          const processChunk = (chunkStr) => {
            let json: any
            try {
              json = JSON.parse(chunkStr)
            } catch (err) {}
            if (!json) return
            if (json.user_code) {
              onMsaCodeCallback(json)
            }
            if (json.error) throw new Error(`Auth server error: ${json.error}`)
            if (json.token) result = json
            if (json.newCache) setCacheResult(json.newCache)
          }

          const processText = ({ done, value = undefined as Uint8Array | undefined }) => {
            if (done) {
              // End-of-stream: flush TextDecoder's internal buffer (any
              // incomplete UTF-8 sequence held by { stream: true }) and
              // process the final event if it wasn't terminated by \n\n.
              // Without this the last { token } / { newCache } update can
              // be dropped when the server flushes the tail event without
              // a closing delimiter.
              buffer += decoder.decode()
              const finalParts = buffer.split('\n\n')
              buffer = finalParts.pop() ?? ''
              for (const chunk of finalParts) processChunk(chunk)
              if (buffer.trim()) processChunk(buffer)
              return
            }

            buffer += decoder.decode(value, { stream: true })
            const parts = buffer.split('\n\n')
            buffer = parts.pop() ?? ''

            for (const chunk of parts) {
              processChunk(chunk)
            }

            return reader.read().then(processText)
          }
          return reader.read().then(processText)
        })
      const restoredData = await restoreData(result)
      if (restoredData?.certificates?.profileKeys?.privatePEM) {
        restoredData.certificates.profileKeys.private = restoredData.certificates.profileKeys.privatePEM
      }
      return restoredData
    }
  }
  return {
    authFlow,
    sessionEndpoint,
    setOnMsaCodeCallback (callback) {
      onMsaCodeCallback = callback
    },
    setConnectingVersion (version) {
      connectingVersion = version
    }
  }
}

function isPageSecure (url = window.location.href) {
  return !url.startsWith('http:')
}

// restore dates from strings
const restoreData = async (json) => {
  const promises = [] as Array<Promise<void>>
  if (typeof json === 'object' && json) {
    for (const [key, value] of Object.entries(json)) {
      if (typeof value === 'string') {
        promises.push(tryRestorePublicKey(value, key, json))
        if (value.endsWith('Z')) {
          const date = new Date(value)
          if (!isNaN(date.getTime())) {
            json[key] = date
          }
        }
      }
      if (typeof value === 'object') {
        // eslint-disable-next-line no-await-in-loop
        await restoreData(value)
      }
    }
  }

  await Promise.all(promises)

  return json
}

const tryRestorePublicKey = async (value: string, name: string, parent: { [x: string]: any }) => {
  value = value.trim()
  if (!name.endsWith('PEM') || !value.startsWith('-----BEGIN RSA PUBLIC KEY-----') || !value.endsWith('-----END RSA PUBLIC KEY-----')) return
  const der = pemToArrayBuffer(value)
  const key = await window.crypto.subtle.importKey(
    'spki', // Specify that the data is in SPKI format
    der,
    {
      name: 'RSA-OAEP',
      hash: { name: 'SHA-256' }
    },
    true,
    ['encrypt'] // Specify key usages
  )
  const originalName = name.replace('PEM', '')
  const exported = await window.crypto.subtle.exportKey('spki', key)
  const exportedBuffer = new Uint8Array(exported)
  parent[originalName] = {
    export () {
      return exportedBuffer
    }
  }
}

function pemToArrayBuffer (pem) {
  // Fetch the part of the PEM string between header and footer
  const pemHeader = '-----BEGIN RSA PUBLIC KEY-----'
  const pemFooter = '-----END RSA PUBLIC KEY-----'
  const pemContents = pem.slice(pemHeader.length, pem.length - pemFooter.length).trim()
  const binaryDerString = atob(pemContents.replaceAll(/\s/g, ''))
  const binaryDer = new Uint8Array(binaryDerString.length)
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.codePointAt(i)!
  }
  return binaryDer.buffer
}

const urlWithBase = (url: string, base: string) => {
  const defaultBase = isPageSecure() ? 'https' : 'http'
  if (!base.startsWith('http')) base = `${defaultBase}://${base}`
  const urlObj = new URL(url, base)
  base = base.replace(/^https?:\/\//, '')
  urlObj.host = base.includes(':') ? base : `${base}:${isPageSecure(base) ? '443' : '80'}`
  return urlObj
}
