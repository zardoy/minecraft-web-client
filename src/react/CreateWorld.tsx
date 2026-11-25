import { useEffect, useRef, useState } from 'react'
import { proxy, useSnapshot } from 'valtio'
import { filesize } from 'filesize'
import { getAvailableServerPlugins } from '../clientMods'
import { showModal } from '../globalState'
import { loadExtraDatapack, removeExtraDatapack, worldgenPackState } from '../worldgen/datapack'
import Input from './Input'
import Screen from './Screen'
import Button from './Button'
import SelectGameVersion from './SelectGameVersion'
import styles from './createWorld.module.css'
import { InputOption, showInputsModal, showOptionsModal } from './SelectOption'
import { withInjectableUi } from './extendableSystem'

// const worldTypes = ['default', 'flat', 'largeBiomes', 'amplified', 'customized', 'buffet', 'debug_all_block_states']
const worldTypes = ['default', 'flat', 'empty', 'nether', 'all_the_blocks']
const gameModes = ['survival', 'creative'/* , 'adventure', 'spectator' */]

const JAVA_LONG_MIN = -0x80_00_00_00_00_00_00_00n
const JAVA_LONG_MAX = 0x7f_ff_ff_ff_ff_ff_ff_ffn

/** Java `String.hashCode()` (UTF-16), same as Java Edition create-world word seeds. */
const javaStringHash = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    // Java String.hashCode (UTF-16 code units, signed 32-bit overflow)
    /* eslint-disable-next-line unicorn/prefer-math-trunc, unicorn/prefer-code-point -- matches Java Edition */
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return h
}

type SeedPreview =
  | { kind: 'empty' }
  | { kind: 'numeric', value: string }
  | { kind: 'hashed', value: string, why: string }

/** Mirrors MC `WorldOptions.parseSeed` (Java Edition 1.18–26.3 create world). */
function previewJavaSeed (raw: string): SeedPreview {
  if (raw.length === 0) return { kind: 'empty' }
  if (/^-?\d+$/.test(raw)) {
    try {
      const v = BigInt(raw)
      if (v >= JAVA_LONG_MIN && v <= JAVA_LONG_MAX) return { kind: 'numeric', value: v.toString() }
    } catch { /* overflow */ }
    return { kind: 'hashed', value: String(javaStringHash(raw)), why: 'outside a Java long (±2⁶³−1), so Java hashes it like a word' }
  }
  let why = 'word seed → Java String.hashCode()'
  if (raw !== raw.trim()) why = 'Java does not trim: leading/trailing spaces make this a word seed'
  else if (raw.includes(',') || /\s/.test(raw)) why = 'commas/spaces are not digits, so this is hashed (not the number)'
  else if (raw.startsWith('+')) why = 'a leading + is not a Java long, so this is hashed'
  else if (/^-?\d+[eE.]/.test(raw)) why = 'decimals / scientific notation are hashed, not parsed as a number'
  return { kind: 'hashed', value: String(javaStringHash(raw)), why }
}

/** optional third-party worldgen datapack (.jar / .zip) chosen by the player; stored on this device only, layered on top of vanilla (see worldgen/datapack.ts) */
const DatapackField = () => {
  const { status, name, error } = useSnapshot(worldgenPackState)
  const input = useRef<HTMLInputElement>(null)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <input
        ref={input}
        type='file'
        accept='.jar,.zip'
        style={{ display: 'none' }}
        onChange={async e => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) await loadExtraDatapack(file)
        }}
      />
      <div style={{ display: 'flex' }}>
        <Button onClick={() => input.current?.click()}>
          Additional worldgen datapack: {status === 'loaded' ? name : status === 'loading' ? '...' : 'none'}
        </Button>
        {status === 'loaded' && <Button onClick={() => { void removeExtraDatapack() }}>Remove</Button>}
      </div>
      {error && <div style={{ fontSize: 8, color: '#ff8a8a', maxWidth: 300, textAlign: 'center' }}>{error}</div>}
    </div>
  )
}

const SeedField = ({ seed }: { seed: string }) => {
  const preview = previewJavaSeed(seed)
  const looksLikeNumber = seed.length > 0 && /\d/.test(seed)
  const hashedButLooksNumeric = preview.kind === 'hashed' && looksLikeNumber
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <Input
        value={seed}
        onChange={({ target: { value } }) => {
          creatingWorldState.seed = value
        }}
        placeholder='Seed (empty = random)'
        spellCheck={false}
        validateInput={() => (hashedButLooksNumeric ? { outline: '1px solid #e6c84c' } : undefined)}
      />
      {/* what the typed seed becomes (Java Edition parse): a word, or a number out of range, is hashed */}
      {preview.kind !== 'empty' && (
        <div className='muted' style={{ fontSize: 8, textAlign: 'center', lineHeight: 1.3, maxWidth: 280 }}>
          {preview.kind === 'numeric' && <>Java seed <span style={{ color: '#c6ffc6' }}>{preview.value}</span></>}
          {preview.kind === 'hashed' && <>Hashed → <span style={{ color: hashedButLooksNumeric ? '#ffe08a' : '#c6ffc6' }}>{preview.value}</span>{hashedButLooksNumeric && <> ({preview.why})</>}</>}
        </div>
      )}
    </div>
  )
}

/** today's date as the world name ("2026-11-22"), "-2", "-3"... when a world of that name exists */
const defaultWorldName = (existing: string[]) => {
  const now = new Date()
  const base = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const taken = new Set(existing.map(name => name.toLowerCase()))
  if (!taken.has(base)) return base
  let i = 2
  while (taken.has(`${base}-${i}`)) i++
  return `${base}-${i}`
}

export const creatingWorldState = proxy({
  title: '',
  type: worldTypes[0],
  gameMode: 'creative',
  version: '',
  seed: '',
  plugins: [] as string[]
})

const CreateWorldBase = ({ cancelClick, createClick, customizeClick, versions, defaultVersion, existingWorldNames }: {
  cancelClick: () => void
  createClick: () => void
  customizeClick: () => void
  versions: Array<{ version: any, label: any }>
  defaultVersion: string
  /** names of the worlds already saved (folder names), for the default name */
  existingWorldNames?: () => Promise<string[]>
}) => {
  const [quota, setQuota] = useState('')
  const [moreOptions, setMoreOptions] = useState(false)

  const { title, type, version, gameMode, plugins, seed } = useSnapshot(creatingWorldState)
  useEffect(() => {
    creatingWorldState.version = defaultVersion
    creatingWorldState.title = defaultWorldName([])
    void existingWorldNames?.().then(names => {
      // only while the player has not typed a name yet
      if (creatingWorldState.title === defaultWorldName([])) creatingWorldState.title = defaultWorldName(names)
    }).catch(() => {})
    void navigator.storage?.estimate?.().then(({ quota, usage }) => {
      setQuota(`Storage usage: ${usage === undefined ? '?' : filesize(usage)} / ${quota ? filesize(quota) : '?'}`)
    })
  }, [])

  return <Screen title="Create world" backdrop="dirt">
    <form
      style={{ display: 'flex' }} onSubmit={(e) => {
        e.preventDefault()
        createClick()
      }}
    >
      <Input
        autoFocus
        value={title}
        onChange={({ target: { value } }) => {
          creatingWorldState.title = value
        }}
        placeholder='World name'
      />
      <button type='submit' style={{ visibility: 'hidden' }} />
    </form>
    <SeedField seed={seed} />
    <Button onClick={() => setMoreOptions(open => !open)}>{moreOptions ? 'Fewer options' : 'More options...'}</Button>
    {moreOptions && (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span className='muted' style={{ fontSize: 9 }}>Version</span>
          <SelectGameVersion
            versions={versions.map((obj) => { return { value: obj.version, label: obj.label } })}
            selected={{ value: version || defaultVersion, label: version || defaultVersion }}
            onChange={(value) => {
              creatingWorldState.version = value ?? defaultVersion
            }}
            containerStyle={{ width: '120px' }}
          />
        </div>
        <div style={{ display: 'flex' }}>
          {/* survival worlds start with a stack of ender pearls (server side), see space-squid `startingPearls` */}
          <Button
            onClick={() => {
              const index = gameModes.indexOf(gameMode)
              creatingWorldState.gameMode = gameModes[index === gameModes.length - 1 ? 0 : index + 1]
            }}
          >
            Game Mode: {gameMode}
          </Button>
          <Button disabled>
            Save Type: Java
          </Button>
        </div>
        {type === 'default' && <DatapackField />}
      </div>
    )}
    <div style={{ display: 'flex' }}>
      <Button onClick={() => {
        const index = worldTypes.indexOf(type)
        creatingWorldState.type = worldTypes[index === worldTypes.length - 1 ? 0 : index + 1]
      }}
      >World Type: {type}
      </Button>
      {/* <Button onClick={() => customizeClick()} disabled>
        Customize
      </Button> */}
      <Button onClick={async () => {
        const availableServerPlugins = await getAvailableServerPlugins()
        const availableModNames = availableServerPlugins.map(mod => mod.name)
        const choices: Record<string, InputOption> = Object.fromEntries(availableServerPlugins.map(mod => [mod.name, {
          type: 'checkbox' as const,
          defaultValue: creatingWorldState.plugins.includes(mod.name),
          label: mod.name
        }]))
        choices.installMore = {
          type: 'button' as const,
          onButtonClick () {
            showModal({ reactType: 'mods' })
          }
        }
        const choice = await showInputsModal('Select server plugins from mods to install:', choices)
        if (!choice) return
        creatingWorldState.plugins = availableModNames.filter(modName => choice[modName])
      }}
      >Use Mods ({plugins.length})
      </Button>
    </div>
    <div style={{ display: 'flex' }}>
      <Button onClick={() => {
        cancelClick()
      }}
      >Cancel
      </Button>
      <Button disabled={!title} onClick={createClick}>
        <b>
          Create
        </b>
      </Button>
    </div>
    <div className='muted' style={{ fontSize: 9 }}>Note: save important worlds in folders on your hard drive!</div>
    <div className='muted' style={{ fontSize: 9 }}>{quota}</div>
  </Screen>
}

export const WorldCustomize = ({ backClick }) => {
  const { type } = useSnapshot(creatingWorldState)

  return <Screen title='Customize world' backdrop='dirt'>
    <div className={styles.world_layers_container}>
      <div className="world_layer" />
    </div>
    <Button onClick={backClick}>Back</Button>
  </Screen>
}

export default withInjectableUi(CreateWorldBase, 'createWorld')
