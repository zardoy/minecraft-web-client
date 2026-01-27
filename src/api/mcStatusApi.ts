globalThis.resolveDnsFallback = async (hostname: string) => {
  const response = await fetchServerStatus(hostname)
  return response?.raw.srv_record ?? undefined
}

export const isServerValid = (ip: string, allowLocalhost = false) => {
  const isInLocalNetwork = ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.') ||
    ip.startsWith('127.') ||
    ip.startsWith('localhost') ||
    ip.startsWith(':')
  const VALID_IP_OR_DOMAIN = ip.includes('.') || ip.includes('localhost')

  return (!isInLocalNetwork || allowLocalhost) && VALID_IP_OR_DOMAIN
}

export async function fetchServerStatus (ip: string, signal?: AbortSignal, versionOverride?: string) {
  if (!isServerValid(ip)) return

  const response = await fetch(`https://api.mcstatus.io/v2/status/java/${ip}`, { signal })
  const data: ServerResponse = await response.json()
  const versionClean = data.version?.name_raw.replace(/^[^\d.]+/, '')

  return {
    formattedText: data.motd?.raw ?? '',
    textNameRight: data.online ?
      `${versionOverride ?? versionClean} ${data.players?.online ?? '??'}/${data.players?.max ?? '??'}` :
      '',
    icon: data.icon,
    offline: !data.online,
    raw: data
  }
}

export type ServerResponse = {
  online: boolean
  version?: {
    name_raw: string
  }
  // display tooltip
  players?: {
    online: number
    max: number
    list: Array<{
      name_raw: string
      name_clean: string
    }>
  }
  icon?: string
  motd?: {
    raw: string
  }
  // todo circle error icon
  mods?: Array<{ name: string, version: string }>
  // todo display via hammer icon
  software?: string
  plugins?: Array<{ name, version }>
  // port?: number
  srv_record?: {
    host: string
    port: number
  }
}
