import { PacketData } from './ReplayPanel'

function wildcardToRegExp(pattern: string): RegExp {
  const escaped = pattern.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^${escaped.replaceAll('\\*', '.*')}$`)
}

function patternToRegExp(pattern: string): RegExp {
  if (pattern.startsWith('$')) {
    return new RegExp(`^${pattern.slice(1)}$`)
  }
  return wildcardToRegExp(`*${pattern}*`)
}

export function parseFilterString(filter: string): { include: RegExp[]; exclude: RegExp[] } {
  const parts = filter.split(/,\s*/)
  const include: RegExp[] = []
  const exclude: RegExp[] = []

  for (const part of parts) {
    if (!part) continue
    if (part.startsWith('!')) {
      exclude.push(patternToRegExp(part.slice(1)))
    } else {
      include.push(patternToRegExp(part))
    }
  }

  return { include, exclude }
}

export function filterPackets(packets: PacketData[], filter: string): { filtered: PacketData[]; hiddenCount: number } {
  if (!filter.trim()) {
    return { filtered: packets, hiddenCount: 0 }
  }

  const { include, exclude } = parseFilterString(filter)
  const filtered = packets.filter(packet => {
    // If packet matches any exclude pattern, filter it out
    if (exclude.some(pattern => pattern.test(packet.name))) {
      return false
    }
    // If there are include patterns, packet must match at least one
    if (include.length > 0) {
      return include.some(pattern => pattern.test(packet.name))
    }
    // If no include patterns, keep the packet (unless it was excluded)
    return true
  })

  return {
    filtered,
    hiddenCount: packets.length - filtered.length
  }
}
