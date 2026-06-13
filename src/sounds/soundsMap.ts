import fs from 'fs'
import path from 'path'
import { versionsMapToMajor, versionToMajor, versionToNumber } from 'minecraft-renderer/src/lib/utils'

import { stopAllSounds } from '../basicSounds'
import { musicSystem } from './musicSystem'

interface SoundMeta {
  format: string
  baseUrl: string
}

interface SoundData {
  volume: number
  path: string
}

interface SoundMapData {
  allSoundsMap: Record<string, Record<string, string>>
  soundsLegacyMap: Record<string, string[]>
  soundsMeta: SoundMeta
}

interface BlockSoundMap {
  [blockName: string]: string
}

interface SoundEntry {
  file: string
  weight: number
  volume: number
}

interface ResourcePackSoundEntry {
  name: string
  stream?: boolean
  volume?: number
  timeout?: number
}

interface ResourcePackSound {
  category: string
  sounds: ResourcePackSoundEntry[]
}

interface ResourcePackSoundsJson {
  [soundId: string]: ResourcePackSound
}

export class SoundMap {
  private readonly soundsPerName: Record<string, SoundEntry[]>
  soundsIdToName: Record<string, string>
  private readonly existingResourcePackPaths: Set<string>
  private activeResourcePackBasePath: string | undefined
  private activeResourcePackSoundsJson: ResourcePackSoundsJson | undefined
  noVersionIdMapping = false

  constructor (
    private readonly soundData: SoundMapData,
    private readonly version: string
  ) {
    // First try exact version match
    let soundsMap = soundData.allSoundsMap[this.version]

    if (!soundsMap) {
      // If no exact match, try major version
      const allSoundsMajor = versionsMapToMajor(soundData.allSoundsMap)
      soundsMap = allSoundsMajor[versionToMajor(version)]

      if (!soundsMap) {
        // If still no match, use first available mapping
        soundsMap = Object.values(allSoundsMajor)[0]
      }

      this.noVersionIdMapping = true
    }

    // Create both mappings
    this.soundsIdToName = {}
    this.soundsPerName = {}

    for (const [id, soundsStr] of Object.entries(soundsMap)) {
      const sounds = soundsStr.split(',').map(s => {
        const [volume, name, weight] = s.split(';')
        if (isNaN(Number(volume))) throw new Error('volume is not a number')
        if (isNaN(Number(weight))) throw new TypeError('weight is not a number')
        return {
          file: name,
          weight: Number(weight),
          volume: Number(volume)
        }
      })

      const [idPart, namePart] = id.split(';')
      this.soundsIdToName[idPart] = namePart

      this.soundsPerName[namePart] = sounds
    }
  }

  async updateActiveResourcePackBasePath (basePath: string | undefined) {
    this.activeResourcePackBasePath = basePath
    if (!basePath) {
      this.activeResourcePackSoundsJson = undefined
      return
    }

    let soundsJsonContent: string | undefined
    try {
      const soundsJsonPath = path.join(basePath, 'assets/minecraft/sounds.json')
      soundsJsonContent = await fs.promises.readFile(soundsJsonPath, 'utf8')
    } catch (err) {}
    try {
      if (soundsJsonContent) {
        this.activeResourcePackSoundsJson = JSON.parse(soundsJsonContent)
      }
    } catch (err) {
      console.warn('Failed to parse sounds.json from resourcepack', err)
      this.activeResourcePackSoundsJson = undefined
    }
  }

  async updateExistingResourcePackPaths () {
    if (!this.activeResourcePackBasePath) return
    // todo support sounds.js from resource pack
    const soundsBasePath = path.join(this.activeResourcePackBasePath, 'assets/minecraft/sounds')
    // scan recursively for sounds files
    const scan = async (dir: string) => {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const entryPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          await scan(entryPath)
        } else if (entry.isFile() && entry.name.endsWith('.ogg')) {
          const relativePath = path.relative(soundsBasePath, entryPath)
          this.existingResourcePackPaths.add(relativePath)
        }
      }
    }

    await scan(soundsBasePath)
  }

  async getSoundUrl (soundKey: string, volume = 1): Promise<{ url: string; volume: number, timeout?: number } | undefined> {
    // First check resource pack sounds.json
    if (this.activeResourcePackSoundsJson && soundKey in this.activeResourcePackSoundsJson) {
      const rpSound = this.activeResourcePackSoundsJson[soundKey]
      // Pick a random sound from the resource pack
      const sound = rpSound.sounds[Math.floor(Math.random() * rpSound.sounds.length)]
      const soundVolume = sound.volume ?? 1

      if (this.activeResourcePackBasePath) {
        const tryFormat = async (format: string) => {
          try {
            if (sound.name.startsWith('http://') || sound.name.startsWith('https://')) {
              return {
                url: sound.name,
                volume: soundVolume * Math.max(Math.min(volume, 1), 0),
                timeout: sound.timeout
              }
            }
            const resourcePackPath = path.join(this.activeResourcePackBasePath!, `/assets/minecraft/sounds/${sound.name}.${format}`)
            const fileData = await fs.promises.readFile(resourcePackPath)
            return {
              url: `data:audio/${format};base64,${fileData.toString('base64')}`,
              volume: soundVolume * Math.max(Math.min(volume, 1), 0)
            }
          } catch (err) {
            return null
          }
        }

        const result = await tryFormat(this.soundData.soundsMeta.format)
        if (result) return result

        if (this.soundData.soundsMeta.format !== 'ogg') {
          const oggResult = await tryFormat('ogg')
          if (oggResult) return oggResult
        }
      }
    }

    // Fall back to vanilla sounds if no resource pack sound found
    const sounds = this.soundsPerName[soundKey]
    if (!sounds?.length) return undefined

    // Pick a random sound based on weights
    const totalWeight = sounds.reduce((sum, s) => sum + s.weight, 0)
    let random = Math.random() * totalWeight
    const sound = sounds.find(s => {
      random -= s.weight
      return random <= 0
    }) ?? sounds[0]

    const versionedSound = this.getVersionedSound(sound.file)

    const url = this.soundData.soundsMeta.baseUrl.replace(/\/$/, '') +
      (versionedSound ? `/${versionedSound}` : '') +
      '/minecraft/sounds/' +
      sound.file +
      '.' +
      this.soundData.soundsMeta.format

    return {
      url,
      volume: sound.volume * Math.max(Math.min(volume, 1), 0)
    }
  }

  private getVersionedSound (item: string): string | undefined {
    const verNumber = versionToNumber(this.version)
    const entries = Object.entries(this.soundData.soundsLegacyMap)
    for (const [itemsVer, items] of entries) {
      if (items.includes(item) && verNumber <= versionToNumber(itemsVer)) {
        return itemsVer
      }
    }
    return undefined
  }

  getBlockSound (blockName: string, category: string, fallback: string): string {
    const mappedName = blockSoundAliases[blockName] ?? blockName
    const key = `block.${mappedName}.${category}`
    return this.soundsPerName[key] ? key : fallback
  }

  getStepSound (blockName: string): string {
    return this.getBlockSound(blockName, 'step', 'block.stone.step')
  }

  getBreakSound (blockName: string): string {
    return this.getBlockSound(blockName, 'break', 'block.stone.break')
  }

  quit () {
    musicSystem.stopMusic()
    stopAllSounds()
  }
}

export function createSoundMap (version: string): SoundMap | null {
  const globalObject = window as {
    allSoundsMap?: Record<string, Record<string, string>>,
    allSoundsVersionedMap?: Record<string, string[]>,
    allSoundsMeta?: { format: string, baseUrl: string }
  }
  if (!globalObject.allSoundsMap) return null
  return new SoundMap({
    allSoundsMap: globalObject.allSoundsMap,
    soundsLegacyMap: globalObject.allSoundsVersionedMap ?? {},
    soundsMeta: globalObject.allSoundsMeta!
  }, version)
}

// Block name mappings for sound effects
const blockSoundAliases: BlockSoundMap = {
  // Grass-like blocks
  grass_block: 'grass',
  tall_grass: 'grass',
  fern: 'grass',
  large_fern: 'grass',
  dead_bush: 'grass',
  seagrass: 'grass',
  tall_seagrass: 'grass',
  kelp: 'grass',
  kelp_plant: 'grass',
  sugar_cane: 'grass',
  bamboo: 'grass',
  vine: 'grass',
  nether_sprouts: 'grass',
  twisting_vines: 'grass',
  weeping_vines: 'grass',
  sweet_berry_bush: 'grass',
  glow_lichen: 'grass',
  moss_carpet: 'grass',
  moss_block: 'grass',
  hanging_roots: 'grass',
  spore_blossom: 'grass',
  small_dripleaf: 'grass',
  big_dripleaf: 'grass',
  flowering_azalea: 'grass',
  azalea: 'grass',
  azalea_leaves: 'grass',
  flowering_azalea_leaves: 'grass',

  // Dirt and ground blocks
  dirt: 'gravel',
  coarse_dirt: 'gravel',
  podzol: 'gravel',
  mycelium: 'gravel',
  farmland: 'gravel',
  dirt_path: 'gravel',
  rooted_dirt: 'rooted_dirt',

  // Crop blocks
  wheat: 'crop',
  potatoes: 'crop',
  carrots: 'crop',
  beetroots: 'crop',
  melon_stem: 'crop',
  pumpkin_stem: 'crop',
  sweet_berries: 'crop',
  cocoa: 'crop',
  nether_wart: 'crop',
  torchflower_crop: 'crop',
  pitcher_crop: 'crop',

  // Stone-like blocks
  cobblestone: 'stone',
  stone_bricks: 'stone',
  mossy_stone_bricks: 'stone',
  cracked_stone_bricks: 'stone',
  chiseled_stone_bricks: 'stone',
  stone_brick_slab: 'stone',
  stone_brick_stairs: 'stone',
  stone_brick_wall: 'stone',
  polished_granite: 'stone',
  granite: 'stone',
  andesite: 'stone',
  diorite: 'stone',
  polished_andesite: 'stone',
  polished_diorite: 'stone',
  deepslate: 'deepslate',
  cobbled_deepslate: 'deepslate',
  polished_deepslate: 'deepslate',
  deepslate_bricks: 'deepslate_bricks',
  deepslate_tiles: 'deepslate_tiles',
  calcite: 'stone',
  tuff: 'stone',
  smooth_stone: 'stone',
  smooth_sandstone: 'stone',
  smooth_quartz: 'stone',
  smooth_red_sandstone: 'stone',

  // Wood-like blocks
  oak_planks: 'wood',
  spruce_planks: 'wood',
  birch_planks: 'wood',
  jungle_planks: 'wood',
  acacia_planks: 'wood',
  dark_oak_planks: 'wood',
  crimson_planks: 'wood',
  warped_planks: 'wood',
  oak_log: 'wood',
  spruce_log: 'wood',
  birch_log: 'wood',
  jungle_log: 'wood',
  acacia_log: 'wood',
  dark_oak_log: 'wood',
  crimson_stem: 'stem',
  warped_stem: 'stem',

  // Metal blocks
  iron_block: 'metal',
  gold_block: 'metal',
  copper_block: 'copper',
  exposed_copper: 'copper',
  weathered_copper: 'copper',
  oxidized_copper: 'copper',
  netherite_block: 'netherite_block',
  ancient_debris: 'ancient_debris',
  lodestone: 'lodestone',
  chain: 'chain',
  anvil: 'anvil',
  chipped_anvil: 'anvil',
  damaged_anvil: 'anvil',

  // Glass blocks
  glass: 'glass',
  glass_pane: 'glass',
  white_stained_glass: 'glass',
  orange_stained_glass: 'glass',
  magenta_stained_glass: 'glass',
  light_blue_stained_glass: 'glass',
  yellow_stained_glass: 'glass',
  lime_stained_glass: 'glass',
  pink_stained_glass: 'glass',
  gray_stained_glass: 'glass',
  light_gray_stained_glass: 'glass',
  cyan_stained_glass: 'glass',
  purple_stained_glass: 'glass',
  blue_stained_glass: 'glass',
  brown_stained_glass: 'glass',
  green_stained_glass: 'glass',
  red_stained_glass: 'glass',
  black_stained_glass: 'glass',
  tinted_glass: 'glass',

  // Wool blocks
  white_wool: 'wool',
  orange_wool: 'wool',
  magenta_wool: 'wool',
  light_blue_wool: 'wool',
  yellow_wool: 'wool',
  lime_wool: 'wool',
  pink_wool: 'wool',
  gray_wool: 'wool',
  light_gray_wool: 'wool',
  cyan_wool: 'wool',
  purple_wool: 'wool',
  blue_wool: 'wool',
  brown_wool: 'wool',
  green_wool: 'wool',
  red_wool: 'wool',
  black_wool: 'wool',

  // Nether blocks
  netherrack: 'netherrack',
  nether_bricks: 'nether_bricks',
  red_nether_bricks: 'nether_bricks',
  nether_wart_block: 'wart_block',
  warped_wart_block: 'wart_block',
  soul_sand: 'soul_sand',
  soul_soil: 'soul_soil',
  basalt: 'basalt',
  polished_basalt: 'basalt',
  blackstone: 'gilded_blackstone',
  gilded_blackstone: 'gilded_blackstone',

  // Amethyst blocks
  amethyst_block: 'amethyst_block',
  amethyst_cluster: 'amethyst_cluster',
  large_amethyst_bud: 'large_amethyst_bud',
  medium_amethyst_bud: 'medium_amethyst_bud',
  small_amethyst_bud: 'small_amethyst_bud',

  // Miscellaneous
  sand: 'sand',
  red_sand: 'sand',
  gravel: 'gravel',
  snow: 'snow',
  snow_block: 'snow',
  powder_snow: 'powder_snow',
  ice: 'glass',
  packed_ice: 'glass',
  blue_ice: 'glass',
  slime_block: 'slime_block',
  honey_block: 'honey_block',
  scaffolding: 'scaffolding',
  ladder: 'ladder',
  lantern: 'lantern',
  soul_lantern: 'lantern',
  pointed_dripstone: 'pointed_dripstone',
  dripstone_block: 'dripstone_block',
  sculk_sensor: 'sculk_sensor',
  shroomlight: 'shroomlight'
}
