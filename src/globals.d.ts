/// <reference types="wicg-file-system-access" />

// todo make optional
declare const bot: Omit<import('mineflayer').Bot, 'world' | '_client'> & {
  world: Omit<import('prismarine-world').world.WorldSync, 'getBlock'> & {
    getBlock: (pos: import('vec3').Vec3) => import('prismarine-block').Block | null
  }
  _client: Omit<import('minecraft-protocol').Client, 'on'> & {
    write: typeof import('./generatedClientPackets').clientWrite
    on: typeof import('./generatedServerPackets').clientOn
  }
}
declare const __type_bot: typeof bot
declare const viewer: import('prismarine-viewer/viewer/lib/viewer').Viewer
declare const worldView: import('prismarine-viewer/viewer/lib/worldDataEmitter').WorldDataEmitter | undefined
declare const addStatPerSec: (name: string) => void
declare const localServer: import('flying-squid/dist/index').FullServer & { options } | undefined
/** all currently loaded mc data */
declare const mcData: Record<string, any>
declare const loadedData: import('minecraft-data').IndexedData & { sounds: Record<string, { id, name }> }
declare const customEvents: import('typed-emitter').default<{
  /** Singleplayer load requested */
  singleplayer (): void
  digStart ()
  gameLoaded (): void
  mineflayerBotCreated (): void
  search (q: string): void
  activateItem (item: Item, slot: number, offhand: boolean): void
}>
declare const beforeRenderFrame: Array<() => void>

declare interface Document {
  exitPointerLock?(): void
}

declare module '*.frag' {
  const png: string
  export default png
}
declare module '*.vert' {
  const png: string
  export default png
}
declare module '*.wgsl' {
  const png: string
  export default png
}

declare interface Window extends Record<string, any> { }
