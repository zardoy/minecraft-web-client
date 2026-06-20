import * as crypto from 'crypto'
import UUID from 'uuid-1345'
import { fsState } from './loadSave'

// https://github.com/PrismarineJS/node-minecraft-protocol/blob/cf1f67117d586b5e6e21f0d9602da12e9fcf46b6/src/server/login.js#L170
function javaUUID(s: string) {
  const hash = crypto.createHash('md5')
  hash.update(s, 'utf8')
  const buffer = hash.digest()
  buffer[6] = (buffer[6] & 15) | 48
  buffer[8] = (buffer[8] & 63) | 128
  return buffer
}

export function nameToMcOfflineUUID(name) {
  return new UUID(javaUUID('OfflinePlayer:' + name)).toString()
}

export async function savePlayers(autoSave: boolean) {
  if (!localServer?.players[0]) return
  if (autoSave && new URL(location.href).searchParams.get('noSave') === 'true') return
  //@ts-expect-error TODO
  await localServer.savePlayersSingleplayer()
}

// todo flying squid should expose save function instead
export const saveServer = async (autoSave = true) => {
  if (!localServer || fsState.isReadonly) return
  // todo
  console.time('save server')
  const worlds = [(localServer as any).overworld] as Array<import('prismarine-world').world.World>
  await Promise.all([localServer.writeLevelDat(), savePlayers(autoSave), ...worlds.map(async world => world.saveNow())])
  console.timeEnd('save server')
}
export const disconnect = async () => {
  if (localServer) {
    await saveServer()
    void localServer.quit() // todo investigate we should await
  }
  window.history.replaceState({}, '', `${window.location.pathname}`) // remove qs
  bot.end('You left the server')
  location.reload()
}
