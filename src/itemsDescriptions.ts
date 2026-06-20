export const descriptionGenerators = new Map<RegExp | string[], string | ((name) => string)>()
descriptionGenerators.set(/_slab$/, name => 'Craft it by placing 3 blocks of the material in a row in a crafting table.')
descriptionGenerators.set(/_stairs$/, name => 'Craft it by placing 6 blocks of the material in a stair shape in a crafting table.')
descriptionGenerators.set(
  /_log$/,
  name => 'You can get it by chopping down a tree. To chop down a tree, hold down the left mouse button until the tree breaks.'
)
descriptionGenerators.set(
  /_leaves$/,
  name => 'You can get it by breaking the leaves of a tree with a tool that has the Silk Touch enchantment or by using shears.'
)
descriptionGenerators.set(['mangrove_roots'], name => 'You can get it by breaking the roots of a mangrove tree.')
descriptionGenerators.set(
  ['mud'],
  'Mud is a block found abundantly in mangrove swamps or created by using a water bottle on a dirt block. It can be used for crafting or converted into clay using pointed dripstone.'
)
descriptionGenerators.set(
  ['clay'],
  'Clay is a block found underwater or created by using a water bottle on a mud block. It can be used for crafting or converted into terracotta using a furnace.'
)
descriptionGenerators.set(['terracotta'], 'Terracotta is a block created by smelting clay in a furnace. It can be used for crafting or decoration.')
descriptionGenerators.set(['stone'], 'Stone is a block found underground.')
descriptionGenerators.set(['dirt'], 'Dirt is a block found on the surface.')
descriptionGenerators.set(['sand'], 'Sand is a block found on the surface near water.')
descriptionGenerators.set(['gravel'], 'Gravel is a block found on the surface and sometimes underground.')
descriptionGenerators.set(['sandstone'], 'Sandstone is a block found in deserts.')
descriptionGenerators.set(['red_sandstone'], 'Red sandstone is a block found in mesas.')
descriptionGenerators.set(['granite', 'diorite', 'andesite'], name => `${name.charAt(0).toUpperCase() + name.slice(1)} is a block found underground.`)
descriptionGenerators.set(
  ['netherrack', 'soul_sand', 'soul_soil', 'glowstone'],
  name => `${name.charAt(0).toUpperCase() + name.slice(1)} is a block found in the Nether.`
)
descriptionGenerators.set(['end_stone'], 'End stone is a block found in the End.')
descriptionGenerators.set(['obsidian'], 'Obsidian is a block created by pouring water on lava.')
descriptionGenerators.set(['glass'], 'Glass is a block created by smelting sand in a furnace.')
descriptionGenerators.set(
  ['bedrock'],
  'Bedrock is an indestructible block found at the bottom of the world in the Overworld and at the top of the world in the Nether.'
)
descriptionGenerators.set(['water', 'lava'], name => `${name.charAt(0).toUpperCase() + name.slice(1)} is a fluid found in the Overworld.`)
descriptionGenerators.set(
  /_sapling$/,
  name => `${name} drops from the leaves of a tree when it decays or is broken. It can be planted on dirt to grow a new tree.`
)
descriptionGenerators.set(/^stripped_/, name => `${name} is created by using an axe on the block.`)
descriptionGenerators.set(['sponge'], 'Sponge is a block found in ocean monuments.')
descriptionGenerators.set(
  /^music_disc_/,
  name => `Music discs are rare items that can be found in dungeons or by trading with villagers. Also dropped by creepers when killed by a skeleton.`
)
descriptionGenerators.set(/^enchanted_book$/, 'Enchanted books are rare items that can be found in dungeons or by trading with villagers.')
descriptionGenerators.set(/_spawn_egg$/, name => `${name} is an item that can be used to spawn a mob in Creative mode. Cannot be obtained in Survival mode.`)
descriptionGenerators.set(
  /_pottery_sherd$/,
  name => `${name} can be obtained only by brushing suspicious blocks, with the variants of sherd obtainable being dependent on the structure.`
)
descriptionGenerators.set(['cracked_deepslate_bricks'], `Deepslate Bricks and Cracked Deepslate Bricks generate naturally in ancient cities.`)

const moreGeneratedBlocks = {
  natural_blocks: {
    air: {
      obtained_from: 'Naturally occurs in the world.'
    },
    deepslate: {
      obtained_from: 'Mined with a pickaxe in layers -64 to 16.',
      rarity: 'Common'
    },
    cobbled_deepslate: {
      obtained_from: 'Mined from deepslate with any pickaxe.'
    },
    calcite: {
      obtained_from: 'Mined with a pickaxe, found in geodes.'
    },
    tuff: {
      obtained_from: 'Mined with a pickaxe in layers -64 to 16.',
      rarity: 'Common'
    },
    chiseled_tuff: {
      obtained_from: 'Crafted from tuff.'
    },
    polished_tuff: {
      obtained_from: 'Crafted from tuff.'
    },
    tuff_bricks: {
      obtained_from: 'Crafted from tuff.'
    },
    chiseled_tuff_bricks: {
      obtained_from: 'Crafted from tuff bricks.'
    },
    grass_block: {
      obtained_from: 'Mined with a tool enchanted with Silk Touch.'
    },
    podzol: {
      obtained_from: 'Mined with a tool enchanted with Silk Touch, found in giant tree taiga biomes.'
    },
    rooted_dirt: {
      obtained_from: 'Mined with a shovel, found under azalea trees.'
    },
    crimson_nylium: {
      obtained_from: 'Mined with a pickaxe, found in the Nether.'
    },
    warped_nylium: {
      obtained_from: 'Mined with a pickaxe, found in the Nether.'
    },
    cobblestone: {
      obtained_from: 'Mined from stone, or from breaking stone structures.'
    },
    mangrove_propagule: {
      obtained_from: 'Harvested from mangrove trees.'
    },
    suspicious_sand: {
      obtained_from: 'Found in deserts and beaches.'
    },
    suspicious_gravel: {
      obtained_from: 'Found underwater.'
    },
    red_sand: {
      obtained_from: 'Mined from red sand in badlands biomes.'
    },
    coal_ore: {
      obtained_from: 'Mined with a pickaxe in layers 0 to 128.',
      rarity: 'Common'
    },
    deepslate_coal_ore: {
      obtained_from: 'Mined with a pickaxe in layers -64 to 0.',
      rarity: 'Rare'
    },
    iron_ore: {
      obtained_from: 'Mined with a pickaxe in layers 0 to 63.',
      rarity: 'Common'
    },
    deepslate_iron_ore: {
      obtained_from: 'Mined with a pickaxe in layers -64 to 0.',
      rarity: 'Uncommon'
    },
    copper_ore: {
      obtained_from: 'Mined with a pickaxe in layers 0 to 96.',
      rarity: 'Common'
    },
    deepslate_copper_ore: {
      obtained_from: 'Mined with a pickaxe in layers -16 to 64.',
      rarity: 'Uncommon'
    },
    gold_ore: {
      obtained_from: 'Mined with a pickaxe in layers -64 to 32.',
      rarity: 'Uncommon'
    },
    deepslate_gold_ore: {
      obtained_from: 'Mined with a pickaxe in layers -64 to 0.',
      rarity: 'Rare'
    },
    redstone_ore: {
      obtained_from: 'Mined with an iron pickaxe or higher in layers -64 to 16.',
      rarity: 'Uncommon'
    },
    deepslate_redstone_ore: {
      obtained_from: 'Mined with an iron pickaxe or higher in layers -64 to 0.',
      rarity: 'Uncommon'
    },
    emerald_ore: {
      obtained_from: 'Mined with an iron pickaxe or higher in mountain biomes, layers -16 to 256.',
      rarity: 'Rare'
    },
    deepslate_emerald_ore: {
      obtained_from: 'Mined with an iron pickaxe or higher in mountain biomes, layers -64 to 0.',
      rarity: 'Very Rare'
    },
    lapis_ore: {
      obtained_from: 'Mined with a stone pickaxe or higher in layers -64 to 32.',
      rarity: 'Uncommon'
    },
    deepslate_lapis_ore: {
      obtained_from: 'Mined with a stone pickaxe or higher in layers -64 to 0.',
      rarity: 'Rare'
    },
    diamond_ore: {
      obtained_from: 'Mined with an iron pickaxe or higher in layers -64 to 16.',
      rarity: 'Rare'
    },
    deepslate_diamond_ore: {
      obtained_from: 'Mined with an iron pickaxe or higher in layers -64 to 0.',
      rarity: 'Very Rare'
    },
    nether_gold_ore: {
      obtained_from: 'Mined with any pickaxe in the Nether.'
    },
    nether_quartz_ore: {
      obtained_from: 'Mined with any pickaxe in the Nether.'
    },
    ancient_debris: {
      obtained_from: 'Mined with a diamond or netherite pickaxe in the Nether, layers 8 to 22.',
      rarity: 'Very Rare'
    },
    budding_amethyst: {
      obtained_from: 'Found in amethyst geodes, cannot be obtained as an item.'
    },
    exposed_copper: {
      obtained_from: 'Exposed copper block obtained through mining.'
    },
    weathered_copper: {
      obtained_from: 'Weathered copper block obtained through mining.'
    },
    oxidized_copper: {
      obtained_from: 'Oxidized copper block obtained through mining.'
    },
    chiseled_copper: {
      obtained_from: 'Crafted from copper blocks.'
    },
    exposed_chiseled_copper: {
      obtained_from: 'Exposed chiseled copper block obtained through mining.'
    },
    weathered_chiseled_copper: {
      obtained_from: 'Weathered chiseled copper block obtained through mining.'
    },
    oxidized_chiseled_copper: {
      obtained_from: 'Oxidized chiseled copper block obtained through mining.'
    },
    waxed_chiseled_copper: {
      obtained_from: 'Crafted from copper blocks, waxed to prevent oxidation.'
    },
    waxed_exposed_chiseled_copper: {
      obtained_from: 'Waxed exposed chiseled copper block obtained through mining.'
    },
    waxed_weathered_chiseled_copper: {
      obtained_from: 'Waxed weathered chiseled copper block obtained through mining.'
    },
    waxed_oxidized_chiseled_copper: {
      obtained_from: 'Waxed oxidized chiseled copper block obtained through mining.'
    },
    crimson_stem: {
      obtained_from: 'Mined from crimson trees in the Nether.'
    },
    warped_stem: {
      obtained_from: 'Mined from warped trees in the Nether.'
    },
    stripped_crimson_stem: {
      obtained_from: 'Stripped from crimson stem with an axe.'
    },
    stripped_warped_stem: {
      obtained_from: 'Stripped from warped stem with an axe.'
    },
    stripped_bamboo_block: {
      obtained_from: 'Crafted from bamboo.'
    },
    sponge: {
      obtained_from: 'Found in ocean monuments.'
    },
    wet_sponge: {
      obtained_from: 'Absorbs water, can be dried in a furnace.'
    },
    cobweb: {
      obtained_from: 'Mined with a sword or shears, found in mineshafts.'
    },
    short_grass: {
      obtained_from: 'Sheared from grass.'
    },
    fern: {
      obtained_from: 'Sheared from ferns in forest biomes.'
    },
    azalea: {
      obtained_from: 'Found in lush caves.'
    },
    flowering_azalea: {
      obtained_from: 'Found in lush caves.'
    },
    dead_bush: {
      obtained_from: 'Mined with shears in desert biomes.'
    },
    seagrass: {
      obtained_from: 'Sheared from underwater grass.'
    },
    sea_pickle: {
      obtained_from: 'Mined with shears from coral reefs.'
    },
    dandelion: {
      type: 'natural',
      description: 'Dandelions are common flowers that spawn in plains, forests, and meadows.',
      spawn_range: 'Surface'
    },
    poppy: {
      type: 'natural',
      description: 'Poppies are common flowers that generate in plains, forests, and meadows.',
      spawn_range: 'Surface'
    },
    blue_orchid: {
      type: 'natural',
      description: 'Blue orchids spawn naturally in swamp biomes.',
      spawn_range: 'Surface'
    },
    allium: {
      type: 'natural',
      description: 'Alliums are flowers that generate in flower forest biomes.',
      spawn_range: 'Surface'
    },
    azure_bluet: {
      type: 'natural',
      description: 'Azure bluets are common flowers that spawn in plains and flower forest biomes.',
      spawn_range: 'Surface'
    },
    red_tulip: {
      type: 'natural',
      description: 'Red tulips are flowers found in flower forests and plains.',
      spawn_range: 'Surface'
    },
    orange_tulip: {
      type: 'natural',
      description: 'Orange tulips are flowers found in flower forests and plains.',
      spawn_range: 'Surface'
    },
    white_tulip: {
      type: 'natural',
      description: 'White tulips are flowers found in flower forests and plains.',
      spawn_range: 'Surface'
    },
    pink_tulip: {
      type: 'natural',
      description: 'Pink tulips are flowers found in flower forests and plains.',
      spawn_range: 'Surface'
    },
    oxeye_daisy: {
      type: 'natural',
      description: 'Oxeye daisies are common flowers that generate in plains and flower forest biomes.',
      spawn_range: 'Surface'
    },
    cornflower: {
      type: 'natural',
      description: 'Cornflowers spawn in plains, flower forests, and meadows.',
      spawn_range: 'Surface'
    },
    lily_of_the_valley: {
      type: 'natural',
      description: 'Lily of the valleys generate in flower forest biomes.',
      spawn_range: 'Surface'
    },
    wither_rose: {
      type: 'dropped',
      description: 'Wither roses are dropped when a mob is killed by the Wither boss.',
      spawn_range: 'N/A'
    },
    torchflower: {
      type: 'crafted',
      description: 'Torchflowers can be grown using torchflower seeds, which are found in archeology loot or by trading.',
      spawn_range: 'N/A'
    },
    pitcher_plant: {
      type: 'crafted',
      description: 'Pitcher plants can be grown using pitcher pods, which are found in archeology loot or by trading.',
      spawn_range: 'N/A'
    },
    spore_blossom: {
      type: 'natural',
      description: 'Spore blossoms generate naturally on the ceilings of lush caves.',
      spawn_range: 'Underground'
    },
    brown_mushroom: {
      type: 'natural',
      description: 'Brown mushrooms are found in dark areas, swamps, mushroom fields, and forests.',
      spawn_range: 'Surface'
    },
    red_mushroom: {
      type: 'natural',
      description: 'Red mushrooms are found in dark areas, swamps, mushroom fields, and forests.',
      spawn_range: 'Surface'
    },
    crimson_fungus: {
      type: 'natural',
      description: 'Crimson fungi generate naturally in crimson forests in the Nether.',
      spawn_range: 'Nether'
    },
    warped_fungus: {
      type: 'natural',
      description: 'Warped fungi generate naturally in warped forests in the Nether.',
      spawn_range: 'Nether'
    },
    crimson_roots: {
      type: 'natural',
      description: 'Crimson roots generate naturally in crimson forests in the Nether.',
      spawn_range: 'Nether'
    },
    warped_roots: {
      type: 'natural',
      description: 'Warped roots generate naturally in warped forests in the Nether.',
      spawn_range: 'Nether'
    },
    nether_sprouts: {
      type: 'natural',
      description: 'Nether sprouts generate naturally in warped forests in the Nether.',
      spawn_range: 'Nether'
    },
    weeping_vines: {
      type: 'natural',
      description: 'Weeping vines generate naturally in crimson forests in the Nether and grow downward from netherrack.',
      spawn_range: 'Nether'
    },
    twisting_vines: {
      type: 'natural',
      description: 'Twisting vines generate naturally in warped forests in the Nether and grow upward from the ground.',
      spawn_range: 'Nether'
    },
    sugar_cane: {
      type: 'natural',
      description: 'Sugar cane is found near water in most biomes.',
      spawn_range: 'Surface'
    },
    kelp: {
      type: 'natural',
      description: 'Kelp generates underwater in most ocean biomes.',
      spawn_range: 'Water'
    },
    pink_petals: {
      type: 'natural',
      description: 'Pink petals generate naturally in cherry grove biomes.',
      spawn_range: 'Surface'
    },
    moss_block: {
      type: 'natural',
      description: 'Moss blocks generate in lush caves and can also be obtained through trading or by using bone meal on moss carpets.',
      spawn_range: 'Underground'
    },
    hanging_roots: {
      type: 'natural',
      description: 'Hanging roots generate naturally in lush caves.',
      spawn_range: 'Underground'
    },
    big_dripleaf: {
      type: 'natural',
      description: 'Big dripleaf plants generate in lush caves and can also be obtained through trading.',
      spawn_range: 'Underground'
    },
    small_dripleaf: {
      type: 'natural',
      description: 'Small dripleaf plants generate in lush caves and can also be obtained through trading.',
      spawn_range: 'Underground'
    },
    bamboo: {
      type: 'natural',
      description: 'Bamboo generates in jungle biomes, especially bamboo jungles.',
      spawn_range: 'Surface'
    },
    smooth_quartz: {
      type: 'crafted',
      description: 'Smooth quartz is obtained by smelting blocks of quartz.',
      spawn_range: 'N/A'
    },
    smooth_red_sandstone: {
      type: 'crafted',
      description: 'Smooth red sandstone is obtained by smelting red sandstone.',
      spawn_range: 'N/A'
    },
    smooth_sandstone: {
      type: 'crafted',
      description: 'Smooth sandstone is obtained by smelting sandstone.',
      spawn_range: 'N/A'
    },
    smooth_stone: {
      type: 'crafted',
      description: 'Smooth stone is obtained by smelting regular stone.',
      spawn_range: 'N/A'
    },
    chorus_plant: {
      type: 'natural',
      description: 'Chorus plants generate naturally in the End and can be grown from chorus flowers.',
      spawn_range: 'End'
    },
    chorus_flower: {
      type: 'natural',
      description: 'Chorus flowers generate naturally in the End on top of chorus plants.',
      spawn_range: 'End'
    },
    spawner: {
      type: 'natural',
      description: 'Spawners generate in dungeons, mineshafts, and other structures.',
      spawn_range: 'Underground'
    },
    farmland: {
      type: 'crafted',
      description: 'Farmland is created by using a hoe on dirt or grass blocks.',
      spawn_range: 'N/A'
    },
    ice: {
      type: 'natural',
      description: 'Ice generates in snowy and icy biomes and can also be obtained by breaking ice blocks with a Silk Touch tool.',
      spawn_range: 'Surface'
    },
    cactus: {
      type: 'natural',
      description: 'Cacti generate naturally in desert biomes.',
      spawn_range: 'Surface'
    },
    pumpkin: {
      type: 'natural',
      description: 'Pumpkins generate naturally in most grassy biomes and can also be grown from pumpkin seeds.',
      spawn_range: 'Surface'
    },
    carved_pumpkin: {
      type: 'crafted',
      description: 'Carved pumpkins are obtained by using shears on a pumpkin.',
      spawn_range: 'N/A'
    },
    basalt: {
      type: 'natural',
      description: 'Basalt generates in the Nether in basalt deltas and can also be created by lava flowing over soul soil next to blue ice.',
      spawn_range: 'Nether'
    },
    smooth_basalt: {
      type: 'natural',
      description: 'Smooth basalt is found around amethyst geodes or can be obtained by smelting basalt.',
      spawn_range: 'Underground'
    },
    infested_stone: {
      type: 'natural',
      description: 'Infested stone blocks contain silverfish and generate in strongholds, underground.',
      spawn_range: 'Underground'
    },
    infested_cobblestone: {
      type: 'natural',
      description: 'Infested cobblestone blocks contain silverfish and generate in strongholds, underground.',
      spawn_range: 'Underground'
    },
    infested_stone_bricks: {
      type: 'natural',
      description: 'Infested stone bricks contain silverfish and generate in strongholds, underground.',
      spawn_range: 'Underground'
    },
    infested_mossy_stone_bricks: {
      type: 'natural',
      description: 'Infested mossy stone bricks contain silverfish and generate in strongholds, underground.',
      spawn_range: 'Underground'
    },
    infested_cracked_stone_bricks: {
      type: 'natural',
      description: 'Infested cracked stone bricks contain silverfish and generate in strongholds, underground.',
      spawn_range: 'Underground'
    },
    infested_chiseled_stone_bricks: {
      type: 'natural',
      description: 'Infested chiseled stone bricks contain silverfish and generate in strongholds, underground.',
      spawn_range: 'Underground'
    },
    infested_deepslate: {
      type: 'natural',
      description: 'Infested deepslate contains silverfish and generates in the deepslate layer underground.',
      spawn_range: 'Underground'
    },
    cracked_stone_bricks: {
      type: 'crafted',
      description: 'Cracked stone bricks are obtained by smelting stone bricks.',
      spawn_range: 'N/A'
    },
    cracked_deepslate_bricks: {
      type: 'crafted',
      description: 'Cracked deepslate bricks are obtained by smelting deepslate bricks.',
      spawn_range: 'N/A'
    },
    cracked_deepslate_tiles: {
      type: 'crafted',
      description: 'Cracked deepslate tiles are obtained by smelting deepslate tiles.',
      spawn_range: 'N/A'
    },
    reinforced_deepslate: {
      type: 'crafted',
      description: 'Reinforced deepslate is a strong block that cannot be obtained in survival mode.',
      spawn_range: 'N/A'
    },
    brown_mushroom_block: {
      type: 'natural',
      description: 'Brown mushroom blocks generate as part of huge mushrooms in dark forest biomes and mushroom fields.',
      spawn_range: 'Surface'
    },
    red_mushroom_block: {
      type: 'natural',
      description: 'Red mushroom blocks generate as part of huge mushrooms in dark forest biomes and mushroom fields.',
      spawn_range: 'Surface'
    },
    mushroom_stem: {
      type: 'natural',
      description: 'Mushroom stems generate as part of huge mushrooms in dark forest biomes and mushroom fields.',
      spawn_range: 'Surface'
    },
    vine: {
      type: 'natural',
      description: 'Vines generate naturally on trees and walls in jungle biomes, swamps, and lush caves.',
      spawn_range: 'Surface'
    },
    glow_lichen: {
      type: 'natural',
      description: 'Glow lichen generates naturally in caves and can spread to other blocks using bone meal.',
      spawn_range: 'Underground'
    },
    mycelium: {
      type: 'natural',
      description: 'Mycelium generates naturally in mushroom field biomes and spreads to dirt blocks.',
      spawn_range: 'Surface'
    },
    lily_pad: {
      type: 'natural',
      description: 'Lily pads generate naturally on the surface of water in swamps.',
      spawn_range: 'Water'
    },
    cracked_nether_bricks: {
      type: 'crafted',
      description: 'Cracked nether bricks are obtained by smelting nether bricks.',
      spawn_range: 'N/A'
    },
    sculk: {
      type: 'natural',
      description: 'Sculk generates naturally in the deep dark biome and spreads using a sculk catalyst.',
      spawn_range: 'Underground'
    },
    sculk_vein: {
      type: 'natural',
      description: 'Sculk veins generate naturally in the deep dark biome and spread using a sculk catalyst.',
      spawn_range: 'Underground'
    },
    sculk_catalyst: {
      type: 'natural',
      description: 'Sculk catalysts generate naturally in the deep dark biome and spread sculk blocks when mobs die nearby.',
      spawn_range: 'Underground'
    },
    sculk_shrieker: {
      type: 'natural',
      description: 'Sculk shriekers generate naturally in the deep dark biome and emit a loud shriek when activated.',
      spawn_range: 'Underground'
    },
    end_portal_frame: {
      type: 'natural',
      description: 'End portal frames generate naturally in strongholds, forming the structure of end portals.',
      spawn_range: 'Underground'
    },
    dragon_egg: {
      type: 'dropped',
      description: 'The dragon egg is dropped when the Ender Dragon is defeated for the first time.',
      spawn_range: 'End'
    },
    command_block: {
      type: 'crafted',
      description: 'Command blocks are powerful blocks used in commands and redstone, obtainable only via commands.',
      spawn_range: 'N/A'
    },
    chipped_anvil: {
      type: 'crafted',
      description: 'Chipped anvils are damaged versions of anvils and are used for repairing and enchanting.',
      spawn_range: 'N/A'
    },
    damaged_anvil: {
      type: 'crafted',
      description: 'Damaged anvils are further damaged versions of anvils and are used for repairing and enchanting.',
      spawn_range: 'N/A'
    },
    barrier: {
      type: 'crafted',
      description: 'Barriers are invisible blocks used in map-making and obtainable only via commands.',
      spawn_range: 'N/A'
    },
    light: {
      type: 'crafted',
      description: 'Light blocks are invisible blocks that emit light, obtainable only via commands.',
      spawn_range: 'N/A'
    },
    dirt_path: {
      type: 'crafted',
      description: 'Dirt paths are created by using a shovel on grass blocks and are commonly found in villages.',
      spawn_range: 'Surface'
    },
    sunflower: {
      type: 'natural',
      description: 'Sunflowers generate naturally in sunflower plains biomes.',
      spawn_range: 'Surface'
    },
    lilac: {
      type: 'natural',
      description: 'Lilacs generate naturally in forest biomes.',
      spawn_range: 'Surface'
    },
    rose_bush: {
      type: 'natural',
      description: 'Rose bushes generate naturally in forest biomes.',
      spawn_range: 'Surface'
    },
    peony: {
      type: 'natural',
      description: 'Peonies generate naturally in forest biomes.',
      spawn_range: 'Surface'
    },
    tall_grass: {
      type: 'natural',
      description: 'Tall grass generates naturally in various biomes and can be grown using bone meal.',
      spawn_range: 'Surface'
    },
    large_fern: {
      type: 'natural',
      description: 'Large ferns generate naturally in taiga biomes.',
      spawn_range: 'Surface'
    },
    repeating_command_block: {
      type: 'crafted',
      description: 'Repeating command blocks execute commands every tick and are obtainable only via commands.',
      spawn_range: 'N/A'
    },
    chain_command_block: {
      type: 'crafted',
      description: 'Chain command blocks execute commands when triggered and are obtainable only via commands.',
      spawn_range: 'N/A'
    },
    warped_wart_block: {
      type: 'natural',
      description: 'Warped wart blocks generate naturally in warped forests in the Nether.',
      spawn_range: 'Nether'
    },
    structure_void: {
      type: 'crafted',
      description: 'Structure voids are used in structure blocks to exclude certain blocks from being saved and are obtainable only via commands.',
      spawn_range: 'N/A'
    },
    white_shulker_box: {
      type: 'crafted',
      description: 'White shulker boxes are crafted from shulker shells and dye, and they function as portable storage.',
      spawn_range: 'N/A'
    },
    orange_shulker_box: {
      type: 'crafted',
      description: 'Orange shulker boxes are crafted from shulker shells and dye, and they function as portable storage.',
      spawn_range: 'N/A'
    },
    magenta_shulker_box: {
      type: 'crafted',
      description: 'Magenta shulker boxes are crafted from shulker shells and dye, and they function as portable storage.',
      spawn_range: 'N/A'
    },
    light_blue_shulker_box: {
      type: 'crafted',
      description: 'Light blue shulker boxes are crafted from shulker shells and dye, and they function as portable storage.',
      spawn_range: 'N/A'
    },
    yellow_shulker_box: {
      type: 'crafted',
      description: 'Yellow shulker boxes are crafted from shulker shells and dye, and they function as portable storage.',
      spawn_range: 'N/A'
    },
    lime_shulker_box: {
      type: 'crafted',
      description: 'Lime shulker boxes are crafted from shulker shells and dye, and they function as portable storage.',
      spawn_range: 'N/A'
    },
    pink_shulker_box: {
      type: 'crafted',
      description: 'Pink shulker boxes are crafted from shulker shells and dye, and they function as portable storage.',
      spawn_range: 'N/A'
    },
    gray_shulker_box: {
      type: 'crafted',
      description: 'Gray shulker boxes are crafted from shulker shells and dye, and they function as portable storage.',
      spawn_range: 'N/A'
    },
    light_gray_shulker_box: {
      type: 'crafted',
      description: 'Light gray shulker boxes are crafted from shulker shells and dye, and they function as portable storage.',
      spawn_range: 'N/A'
    },
    cyan_shulker_box: {
      type: 'crafted',
      description: 'Cyan shulker boxes are crafted from shulker shells and dye, and they function as portable storage.',
      spawn_range: 'N/A'
    },
    purple_shulker_box: {
      type: 'crafted',
      description: 'Purple shulker boxes are crafted from shulker shells and dye, and they function as portable storage.',
      spawn_range: 'N/A'
    },
    blue_shulker_box: {
      type: 'crafted',
      description: 'Blue shulker boxes are crafted from shulker shells and dye, and they function as portable storage.',
      spawn_range: 'N/A'
    },
    brown_shulker_box: {
      type: 'crafted',
      description: 'Brown shulker boxes are crafted from shulker shells and dye, and they function as portable storage.',
      spawn_range: 'N/A'
    },
    green_shulker_box: {
      type: 'crafted',
      description: 'Green shulker boxes are crafted from shulker shells and dye, and they function as portable storage.',
      spawn_range: 'N/A'
    },
    red_shulker_box: {
      type: 'crafted',
      description: 'Red shulker boxes are crafted from shulker shells and dye, and they function as portable storage.',
      spawn_range: 'N/A'
    },
    black_shulker_box: {
      type: 'crafted',
      description: 'Black shulker boxes are crafted from shulker shells and dye, and they function as portable storage.',
      spawn_range: 'N/A'
    },
    white_glazed_terracotta: {
      type: 'crafted',
      description: 'White glazed terracotta is obtained by smelting white terracotta and features decorative patterns.',
      spawn_range: 'N/A'
    },
    orange_glazed_terracotta: {
      type: 'crafted',
      description: 'Orange glazed terracotta is obtained by smelting orange terracotta and features decorative patterns.',
      spawn_range: 'N/A'
    },
    magenta_glazed_terracotta: {
      type: 'crafted',
      description: 'Magenta glazed terracotta is obtained by smelting magenta terracotta and features decorative patterns.',
      spawn_range: 'N/A'
    },
    light_blue_glazed_terracotta: {
      type: 'crafted',
      description: 'Light blue glazed terracotta is obtained by smelting light blue terracotta and features decorative patterns.',
      spawn_range: 'N/A'
    },
    yellow_glazed_terracotta: {
      type: 'crafted',
      description: 'Yellow glazed terracotta is obtained by smelting yellow terracotta and features decorative patterns.',
      spawn_range: 'N/A'
    },
    lime_glazed_terracotta: {
      type: 'crafted',
      description: 'Lime glazed terracotta is obtained by smelting lime terracotta and features decorative patterns.',
      spawn_range: 'N/A'
    },
    pink_glazed_terracotta: {
      type: 'crafted',
      description: 'Pink glazed terracotta is obtained by smelting pink terracotta and features decorative patterns.',
      spawn_range: 'N/A'
    },
    gray_glazed_terracotta: {
      type: 'crafted',
      description: 'Gray glazed terracotta is obtained by smelting gray terracotta and features decorative patterns.',
      spawn_range: 'N/A'
    },
    light_gray_glazed_terracotta: {
      type: 'crafted',
      description: 'Light gray glazed terracotta is obtained by smelting light gray terracotta and features decorative patterns.',
      spawn_range: 'N/A'
    },
    cyan_glazed_terracotta: {
      type: 'crafted',
      description: 'Cyan glazed terracotta is obtained by smelting cyan terracotta and features decorative patterns.',
      spawn_range: 'N/A'
    },
    purple_glazed_terracotta: {
      type: 'crafted',
      description: 'Purple glazed terracotta is obtained by smelting purple terracotta and features decorative patterns.',
      spawn_range: 'N/A'
    },
    blue_glazed_terracotta: {
      type: 'crafted',
      description: 'Blue glazed terracotta is obtained by smelting blue terracotta and features decorative patterns.',
      spawn_range: 'N/A'
    },
    brown_glazed_terracotta: {
      type: 'crafted',
      description: 'Brown glazed terracotta is obtained by smelting brown terracotta and features decorative patterns.',
      spawn_range: 'N/A'
    },
    green_glazed_terracotta: {
      type: 'crafted',
      description: 'Green glazed terracotta is obtained by smelting green terracotta and features decorative patterns.',
      spawn_range: 'N/A'
    },
    red_glazed_terracotta: {
      type: 'crafted',
      description: 'Red glazed terracotta is obtained by smelting red terracotta and features decorative patterns.',
      spawn_range: 'N/A'
    },
    black_glazed_terracotta: {
      type: 'crafted',
      description: 'Black glazed terracotta is obtained by smelting black terracotta and features decorative patterns.',
      spawn_range: 'N/A'
    },
    white_concrete: {
      type: 'crafted',
      description: 'White concrete is crafted from concrete powder and hardens when in contact with water.',
      spawn_range: 'N/A'
    },
    orange_concrete: {
      type: 'crafted',
      description: 'Orange concrete is crafted from concrete powder and hardens when in contact with water.',
      spawn_range: 'N/A'
    },
    magenta_concrete: {
      type: 'crafted',
      description: 'Magenta concrete is crafted from concrete powder and hardens when in contact with water.',
      spawn_range: 'N/A'
    },
    light_blue_concrete: {
      type: 'crafted',
      description: 'Light blue concrete is crafted from concrete powder and hardens when in contact with water.',
      spawn_range: 'N/A'
    },
    yellow_concrete: {
      type: 'crafted',
      description: 'Yellow concrete is crafted from concrete powder and hardens when in contact with water.',
      spawn_range: 'N/A'
    },
    lime_concrete: {
      type: 'crafted',
      description: 'Lime concrete is crafted from concrete powder and hardens when in contact with water.',
      spawn_range: 'N/A'
    },
    pink_concrete: {
      type: 'crafted',
      description: 'Pink concrete is crafted from concrete powder and hardens when in contact with water.',
      spawn_range: 'N/A'
    },
    gray_concrete: {
      type: 'crafted',
      description: 'Gray concrete is crafted from concrete powder and hardens when in contact with water.',
      spawn_range: 'N/A'
    },
    light_gray_concrete: {
      type: 'crafted',
      description: 'Light gray concrete is crafted from concrete powder and hardens when in contact with water.',
      spawn_range: 'N/A'
    },
    cyan_concrete: {
      type: 'crafted',
      description: 'Cyan concrete is crafted from concrete powder and hardens when in contact with water.',
      spawn_range: 'N/A'
    },
    purple_concrete: {
      type: 'crafted',
      description: 'Purple concrete is crafted from concrete powder and hardens when in contact with water.',
      spawn_range: 'N/A'
    },
    blue_concrete: {
      type: 'crafted',
      description: 'Blue concrete is crafted from concrete powder and hardens when in contact with water.',
      spawn_range: 'N/A'
    },
    brown_concrete: {
      type: 'crafted',
      description: 'Brown concrete is crafted from concrete powder and hardens when in contact with water.',
      spawn_range: 'N/A'
    },
    green_concrete: {
      type: 'crafted',
      description: 'Green concrete is crafted from concrete powder and hardens when in contact with water.',
      spawn_range: 'N/A'
    },
    red_concrete: {
      type: 'crafted',
      description: 'Red concrete is crafted from concrete powder and hardens when in contact with water.',
      spawn_range: 'N/A'
    },
    black_concrete: {
      type: 'crafted',
      description: 'Black concrete is crafted from concrete powder and hardens when in contact with water.',
      spawn_range: 'N/A'
    },
    white_concrete_powder: {
      type: 'crafted',
      description: 'White concrete powder is crafted from sand, gravel, and dye, and hardens into concrete when in contact with water.',
      spawn_range: 'N/A'
    },
    orange_concrete_powder: {
      type: 'crafted',
      description: 'Orange concrete powder is crafted from sand, gravel, and dye, and hardens into concrete when in contact with water.',
      spawn_range: 'N/A'
    },
    magenta_concrete_powder: {
      type: 'crafted',
      description: 'Magenta concrete powder is crafted from sand, gravel, and dye, and hardens into concrete when in contact with water.',
      spawn_range: 'N/A'
    },
    light_blue_concrete_powder: {
      type: 'crafted',
      description: 'Light blue concrete powder is crafted from sand, gravel, and dye, and hardens into concrete when in contact with water.',
      spawn_range: 'N/A'
    },
    yellow_concrete_powder: {
      type: 'crafted',
      description: 'Yellow concrete powder is crafted from sand, gravel, and dye, and hardens into concrete when in contact with water.',
      spawn_range: 'N/A'
    },
    lime_concrete_powder: {
      type: 'crafted',
      description: 'Lime concrete powder is crafted from sand, gravel, and dye, and hardens into concrete when in contact with water.',
      spawn_range: 'N/A'
    },
    pink_concrete_powder: {
      type: 'crafted',
      description: 'Pink concrete powder is crafted from sand, gravel, and dye, and hardens into concrete when in contact with water.',
      spawn_range: 'N/A'
    },
    gray_concrete_powder: {
      type: 'crafted',
      description: 'Gray concrete powder is crafted from sand, gravel, and dye, and hardens into concrete when in contact with water.',
      spawn_range: 'N/A'
    },
    light_gray_concrete_powder: {
      type: 'crafted',
      description: 'Light gray concrete powder is crafted from sand, gravel, and dye, and hardens into concrete when in contact with water.',
      spawn_range: 'N/A'
    },
    cyan_concrete_powder: {
      type: 'crafted',
      description: 'Cyan concrete powder is crafted from sand, gravel, and dye, and hardens into concrete when in contact with water.',
      spawn_range: 'N/A'
    },
    purple_concrete_powder: {
      type: 'crafted',
      description: 'Purple concrete powder is crafted from sand, gravel, and dye, and hardens into concrete when in contact with water.',
      spawn_range: 'N/A'
    },
    blue_concrete_powder: {
      type: 'crafted',
      description: 'Blue concrete powder is crafted from sand, gravel, and dye, and hardens into concrete when in contact with water.',
      spawn_range: 'N/A'
    },
    brown_concrete_powder: {
      type: 'crafted',
      description: 'Brown concrete powder is crafted from sand, gravel, and dye, and hardens into concrete when in contact with water.',
      spawn_range: 'N/A'
    },
    green_concrete_powder: {
      type: 'crafted',
      description: 'Green concrete powder is crafted from sand, gravel, and dye, and hardens into concrete when in contact with water.',
      spawn_range: 'N/A'
    },
    red_concrete_powder: {
      type: 'crafted',
      description: 'Red concrete powder is crafted from sand, gravel, and dye, and hardens into concrete when in contact with water.',
      spawn_range: 'N/A'
    },
    black_concrete_powder: {
      type: 'crafted',
      description: 'Black concrete powder is crafted from sand, gravel, and dye, and hardens into concrete when in contact with water.',
      spawn_range: 'N/A'
    },
    cyan_candle: {
      type: 'crafted',
      description: 'Cyan candles are crafted from string and dye and can be placed on blocks to emit light.',
      spawn_range: 'N/A'
    },
    pink_candle: {
      type: 'crafted',
      description: 'Pink candles are crafted from string and dye and can be placed on blocks to emit light.',
      spawn_range: 'N/A'
    },
    purple_candle: {
      type: 'crafted',
      description: 'Purple candles are crafted from string and dye and can be placed on blocks to emit light.',
      spawn_range: 'N/A'
    },
    blue_candle: {
      type: 'crafted',
      description: 'Blue candles are crafted from string and dye and can be placed on blocks to emit light.',
      spawn_range: 'N/A'
    },
    brown_candle: {
      type: 'crafted',
      description: 'Brown candles are crafted from string and dye and can be placed on blocks to emit light.',
      spawn_range: 'N/A'
    },
    green_candle: {
      type: 'crafted',
      description: 'Green candles are crafted from string and dye and can be placed on blocks to emit light.',
      spawn_range: 'N/A'
    },
    red_candle: {
      type: 'crafted',
      description: 'Red candles are crafted from string and dye and can be placed on blocks to emit light.',
      spawn_range: 'N/A'
    },
    black_candle: {
      type: 'crafted',
      description: 'Black candles are crafted from string and dye and can be placed on blocks to emit light.',
      spawn_range: 'N/A'
    },
    turtle_egg: 'can be obtained via turtle breeding on beaches, where turtles lay eggs that can be collected.',
    sniffer_egg: 'can be found in buried treasure or ancient ruins, used to hatch sniffers.',
    dead_tube_coral_block: 'can be obtained by mining tube coral blocks with a pickaxe without Silk Touch or when exposed to air.',
    dead_brain_coral_block: 'can be obtained by mining brain coral blocks with a pickaxe without Silk Touch or when exposed to air.',
    dead_bubble_coral_block: 'can be obtained by mining bubble coral blocks with a pickaxe without Silk Touch or when exposed to air.',
    dead_fire_coral_block: 'can be obtained by mining fire coral blocks with a pickaxe without Silk Touch or when exposed to air.',
    dead_horn_coral_block: 'can be obtained by mining horn coral blocks with a pickaxe without Silk Touch or when exposed to air.',
    tube_coral_block: 'can be obtained by mining with a pickaxe enchanted with Silk Touch, found in warm ocean biomes.',
    brain_coral_block: 'can be obtained by mining with a pickaxe enchanted with Silk Touch, found in warm ocean biomes.',
    bubble_coral_block: 'can be obtained by mining with a pickaxe enchanted with Silk Touch, found in warm ocean biomes.',
    fire_coral_block: 'can be obtained by mining with a pickaxe enchanted with Silk Touch, found in warm ocean biomes.',
    horn_coral_block: 'can be obtained by mining with a pickaxe enchanted with Silk Touch, found in warm ocean biomes.',
    tube_coral: 'can be obtained by mining with a pickaxe enchanted with Silk Touch, found in warm ocean biomes.',
    brain_coral: 'can be obtained by mining with a pickaxe enchanted with Silk Touch, found in warm ocean biomes.',
    bubble_coral: 'can be obtained by mining with a pickaxe enchanted with Silk Touch, found in warm ocean biomes.',
    fire_coral: 'can be obtained by mining with a pickaxe enchanted with Silk Touch, found in warm ocean biomes.',
    horn_coral: 'can be obtained by mining with a pickaxe enchanted with Silk Touch, found in warm ocean biomes.',
    dead_brain_coral: 'can be obtained by mining brain coral without Silk Touch or when exposed to air.',
    dead_bubble_coral: 'can be obtained by mining bubble coral without Silk Touch or when exposed to air.',
    dead_fire_coral: 'can be obtained by mining fire coral without Silk Touch or when exposed to air.',
    dead_horn_coral: 'can be obtained by mining horn coral without Silk Touch or when exposed to air.',
    dead_tube_coral: 'can be obtained by mining tube coral without Silk Touch or when exposed to air.',
    tube_coral_fan: 'can be obtained by mining with a pickaxe enchanted with Silk Touch, found in warm ocean biomes.',
    brain_coral_fan: 'can be obtained by mining with a pickaxe enchanted with Silk Touch, found in warm ocean biomes.',
    bubble_coral_fan: 'can be obtained by mining with a pickaxe enchanted with Silk Touch, found in warm ocean biomes.',
    fire_coral_fan: 'can be obtained by mining with a pickaxe enchanted with Silk Touch, found in warm ocean biomes.',
    horn_coral_fan: 'can be obtained by mining with a pickaxe enchanted with Silk Touch, found in warm ocean biomes.',
    dead_tube_coral_fan: 'can be obtained by mining tube coral fans without Silk Touch or when exposed to air.',
    dead_brain_coral_fan: 'can be obtained by mining brain coral fans without Silk Touch or when exposed to air.',
    dead_bubble_coral_fan: 'can be obtained by mining bubble coral fans without Silk Touch or when exposed to air.',
    dead_fire_coral_fan: 'can be obtained by mining fire coral fans without Silk Touch or when exposed to air.',
    dead_horn_coral_fan: 'can be obtained by mining horn coral fans without Silk Touch or when exposed to air.',
    sculk_sensor: 'can be obtained via Silk Touch enchantment on a pickaxe or found in ancient cities in the deep dark biome.',
    copper_door: 'can be crafted using copper ingots.',
    exposed_copper_door: 'can be obtained by allowing copper doors to oxidize or can be crafted directly.',
    weathered_copper_door: 'can be obtained by allowing exposed copper doors to further oxidize or can be crafted directly.',
    oxidized_copper_door: 'can be obtained by allowing weathered copper doors to fully oxidize or can be crafted directly.',
    waxed_copper_door: 'can be crafted using copper ingots and honeycomb.',
    waxed_exposed_copper_door: 'can be crafted using exposed copper doors and honeycomb.',
    waxed_weathered_copper_door: 'can be crafted using weathered copper doors and honeycomb.',
    waxed_oxidized_copper_door: 'can be crafted using oxidized copper doors and honeycomb.',
    copper_trapdoor: 'can be crafted using copper ingots.',
    exposed_copper_trapdoor: 'can be obtained by allowing copper trapdoors to oxidize or can be crafted directly.',
    weathered_copper_trapdoor: 'can be obtained by allowing exposed copper trapdoors to further oxidize or can be crafted directly.',
    oxidized_copper_trapdoor: 'can be obtained by allowing weathered copper trapdoors to fully oxidize or can be crafted directly.',
    waxed_copper_trapdoor: 'can be crafted using copper ingots and honeycomb.',
    waxed_exposed_copper_trapdoor: 'can be crafted using exposed copper trapdoors and honeycomb.',
    waxed_weathered_copper_trapdoor: 'can be crafted using weathered copper trapdoors and honeycomb.',
    waxed_oxidized_copper_trapdoor: 'can be crafted using oxidized copper trapdoors and honeycomb.',
    saddle: 'can be obtained from fishing, dungeon chests, or trading with leatherworkers.',
    elytra: 'can be found in end ships within end cities.',
    structure_block: 'can be obtained using commands or in creative mode, used to save and load structures.',
    jigsaw: 'can be obtained using commands or in creative mode, used to generate structures.',
    scute: 'can be obtained when baby turtles grow into adults.',
    apple: 'can be obtained by breaking oak and dark oak leaves or found in chests.',
    charcoal: 'can be obtained by smelting logs or wood in a furnace.',
    quartz: 'can be obtained by mining nether quartz ore in the Nether.',
    amethyst_shard: 'can be obtained by mining amethyst clusters found in geodes with a pickaxe.',
    netherite_scrap: 'can be obtained by smelting ancient debris found in the Nether.',
    netherite_sword: 'can be crafted using a diamond sword and netherite ingot.',
    netherite_shovel: 'can be crafted using a diamond shovel and netherite ingot.',
    netherite_pickaxe: 'can be crafted using a diamond pickaxe and netherite ingot.',
    netherite_axe: 'can be crafted using a diamond axe and netherite ingot.',
    netherite_hoe: 'can be crafted using a diamond hoe and netherite ingot.',
    string: 'can be obtained from killing spiders or breaking cobwebs.',
    feather: 'can be obtained from killing chickens.',
    gunpowder: 'can be obtained from killing creepers, ghasts, and witches.',
    wheat_seeds: 'can be obtained by breaking tall grass or harvesting wheat crops.',
    chainmail_helmet: 'can be obtained from chest loot, trading with villagers, or killing mobs wearing it.',
    chainmail_chestplate: 'can be obtained from chest loot, trading with villagers, or killing mobs wearing it.',
    chainmail_leggings: 'can be obtained from chest loot, trading with villagers, or killing mobs wearing it.',
    chainmail_boots: 'can be obtained from chest loot, trading with villagers, or killing mobs wearing it.',
    netherite_helmet: 'can be crafted using a diamond helmet and netherite ingot.',
    netherite_chestplate: 'can be crafted using a diamond chestplate and netherite ingot.',
    netherite_leggings: 'can be crafted using diamond leggings and netherite ingot.',
    netherite_boots: 'can be crafted using diamond boots and netherite ingot.',
    flint: 'can be obtained by breaking gravel blocks.',
    porkchop: 'can be obtained by killing pigs.',
    cooked_porkchop: 'can be obtained by cooking porkchop in a furnace, smoker, or campfire.',
    enchanted_golden_apple: 'can be found in dungeon, bastion remnant, and mineshaft chests.',
    water_bucket: 'can be obtained by using a bucket on a water source block.',
    lava_bucket: 'can be obtained by using a bucket on a lava source block.',
    powder_snow_bucket: 'can be obtained by using a bucket on powder snow.',
    snowball: 'can be obtained by breaking snow blocks or using a shovel on snow.',
    milk_bucket: 'can be obtained by using a bucket on a cow or mooshroom.',
    pufferfish_bucket: 'can be obtained by using a bucket on a pufferfish in water.',
    salmon_bucket: 'can be obtained by using a bucket on a salmon in water.',
    cod_bucket: 'can be obtained by using a bucket on a cod in water.',
    tropical_fish_bucket: 'can be obtained by using a bucket on a tropical fish in water.',
    axolotl_bucket: 'can be obtained by using a bucket on an axolotl in water.',
    tadpole_bucket: 'can be obtained by using a bucket on a tadpole in water.',
    brick: 'can be obtained by smelting clay in a furnace.',
    clay_ball: 'can be obtained by breaking clay blocks or from chest loot.',
    egg: 'can be obtained from chickens periodically.',
    bundle: 'can be crafted using rabbit hide and string.',
    glowstone_dust: 'can be obtained by breaking glowstone blocks or killing witches.',
    cod: 'can be obtained by fishing or killing cod in water.',
    salmon: 'can be obtained by fishing or killing salmon in water.',
    tropical_fish: 'can be obtained by fishing or killing tropical fish in water.',
    pufferfish: 'can be obtained by fishing or killing pufferfish in water.',
    cooked_cod: 'can be obtained by cooking cod in a furnace, smoker, or campfire.',
    cooked_salmon: 'can be obtained by cooking salmon in a furnace, smoker, or campfire.',
    ink_sac: 'can be obtained by killing squid or as loot from wandering traders.',
    glow_ink_sac: 'can be obtained by killing glow squid.',
    cocoa_beans: 'can be obtained from cocoa pods found on jungle trees.',
    green_dye: 'can be obtained by smelting cactus in a furnace.',
    bone: 'can be obtained by killing skeletons or from chest loot.',
    crafter: 'can be obtained via crafting using specific materials (details vary by mod or version).',
    filled_map: 'can be obtained by using an empty map item.',
    melon_slice: 'can be obtained by breaking melon blocks.',
    beef: 'can be obtained by killing cows.',
    cooked_beef: 'can be obtained by cooking beef in a furnace, smoker, or campfire.',
    chicken: 'can be obtained by killing chickens.',
    cooked_chicken: 'can be obtained by cooking chicken in a furnace, smoker, or campfire.',
    rotten_flesh: 'can be obtained by killing zombies or drowned.',
    ender_pearl: 'can be obtained by killing endermen.',
    blaze_rod: 'can be obtained by killing blazes in the Nether.',
    ghast_tear: 'can be obtained by killing ghasts in the Nether.',
    nether_wart: 'can be found in Nether fortresses and bastion remnants.',
    potion: 'can be brewed using a brewing stand with various ingredients.',
    spider_eye: 'can be obtained by killing spiders or witches.',
    experience_bottle: 'can be obtained from trading with villagers or found in chest loot.',
    written_book: 'can be crafted using a book and quill after writing in it.',
    carrot: 'can be obtained by harvesting carrot crops or found in village farms.',
    potato: 'can be obtained by harvesting potato crops or found in village farms.',
    baked_potato: 'can be obtained by cooking potatoes in a furnace, smoker, or campfire.',
    poisonous_potato: 'can be obtained by harvesting potato crops (rare chance).',
    skeleton_skull: 'can be obtained by killing skeletons with a charged creeper explosion.',
    wither_skeleton_skull: 'can be obtained by killing wither skeletons (rare drop).',
    player_head: 'can be obtained via commands or by killing players in certain conditions (e.g., with a charged creeper).',
    zombie_head: 'can be obtained by killing zombies with a charged creeper explosion.',
    creeper_head: 'can be obtained by killing creepers with a charged creeper explosion.',
    dragon_head: 'can be found at the end of end ships in end cities.',
    piglin_head: 'can be obtained by killing piglins with a charged creeper explosion.',
    nether_star: 'can be obtained by defeating the Wither boss.',
    firework_star: 'can be crafted using gunpowder and dye.',
    nether_brick: 'can be obtained by smelting netherrack in a furnace or found in Nether fortresses.',
    prismarine_shard: 'can be obtained by killing guardians and elder guardians.',
    prismarine_crystals: 'can be obtained by killing guardians and elder guardians or breaking sea lanterns.',
    rabbit: 'can be obtained by killing rabbits.',
    cooked_rabbit: 'can be obtained by cooking rabbit in a furnace, smoker, or campfire.',
    rabbit_foot: 'can be obtained by killing rabbits (rare drop).',
    rabbit_hide: 'can be obtained by killing rabbits.',
    iron_horse_armor: 'can be found in dungeon, temple, and stronghold chests.',
    golden_horse_armor: 'can be found in dungeon, temple, and stronghold chests.',
    diamond_horse_armor: 'can be found in dungeon, temple, and stronghold chests.',
    name_tag: 'can be obtained by fishing, dungeon chests, or trading with librarians.',
    command_block_minecart: 'can be obtained using commands in creative mode.',
    mutton: 'can be obtained by killing sheep.',
    cooked_mutton: 'can be obtained by cooking mutton in a furnace, smoker, or campfire.',
    chorus_fruit: 'can be obtained by breaking chorus plants found in the End.',
    popped_chorus_fruit: 'can be obtained by smelting chorus fruit in a furnace.',
    torchflower_seeds: 'can be obtained from torchflower plants, used for breeding and decoration.',
    pitcher_pod: 'can be obtained from pitcher plants, used for breeding and decoration.',
    beetroot: 'can be obtained by harvesting beetroot crops or found in village farms.',
    beetroot_seeds: 'can be obtained by harvesting beetroot crops or from chests.',
    dragon_breath: "can be obtained by using an empty bottle on the ender dragon's breath attack.",
    splash_potion: 'can be brewed using a brewing stand and gunpowder with various potions.',
    tipped_arrow: 'can be crafted using arrows and lingering potions.',
    lingering_potion: "can be brewed using a brewing stand and dragon's breath with various potions.",
    totem_of_undying: 'can be obtained by killing evokers in woodland mansions and during raids.',
    shulker_shell: 'can be obtained by killing shulkers in end cities.',
    knowledge_book: 'can be obtained using commands or given in custom advancements.',
    debug_stick: 'can be obtained using commands in creative mode.',
    disc_fragment_5: 'can be found in ancient city chests, used to craft music disc 5.',
    trident: 'can be obtained by killing drowned (rare drop).',
    phantom_membrane: 'can be obtained by killing phantoms.',
    nautilus_shell: 'can be obtained from fishing, drowned, or wandering traders.',
    heart_of_the_sea: 'can be found in buried treasure chests.',
    suspicious_stew: 'can be crafted using mushrooms and various flowers or found in chests.',
    globe_banner_pattern: 'can be obtained from trading with cartographer villagers.',
    piglin_banner_pattern: 'can be obtained from bastion remnant chests.',
    goat_horn: 'can be obtained when a goat rams a solid block.',
    bell: 'can be obtained from village structures or crafted using iron ingots and wood.',
    sweet_berries: 'can be obtained from sweet berry bushes found in taiga biomes.',
    glow_berries: 'can be found in lush cave biomes or by trading with wandering traders.',
    shroomlight: 'can be obtained by breaking shroomlights found in Nether forests.',
    honeycomb: 'can be obtained by using shears on beehives or bee nests.',
    bee_nest: 'can be found in forest biomes with birch or oak trees, especially in flower forests.',
    crying_obsidian: 'can be found in ruined portals, bastion remnants, or bartered from piglins.',
    blackstone: 'can be found in basalt deltas, bastion remnants, or crafted from polished blackstone.',
    gilded_blackstone: 'can be found in bastion remnants.',
    cracked_polished_blackstone_bricks: 'can be obtained by smelting polished blackstone bricks.',
    small_amethyst_bud: 'can be found growing in amethyst geodes.',
    medium_amethyst_bud: 'can be found growing in amethyst geodes.',
    large_amethyst_bud: 'can be found growing in amethyst geodes.',
    amethyst_cluster: 'can be found growing in amethyst geodes.',
    pointed_dripstone: 'can be found in dripstone caves or created by placing a dripstone block under a water source block.',
    ochre_froglight: 'can be obtained by leading a frog to eat a magma cube, dropping this item.',
    verdant_froglight: 'can be obtained by leading a frog to eat a magma cube, dropping this item.',
    pearlescent_froglight: 'can be obtained by leading a frog to eat a magma cube, dropping this item.',
    frogspawn: 'Frogspawn is an item that can be found in the game Minecraft and is primarily used to breed frogs.',
    echo_shard: 'Echo Shard is an item in Minecraft Dungeons, primarily used as a currency for trading with Piglin vendors.',
    copper_grate: 'Copper Grate is a block in Minecraft that can be crafted from copper ingots, primarily used as a decorative block.',
    exposed_copper_grate: 'Exposed Copper Grate is a variant of Copper Grate in Minecraft that has weathered to the exposed state over time.',
    weathered_copper_grate: 'Weathered Copper Grate is a variant of Copper Grate in Minecraft that has weathered to the weathered state over time.',
    oxidized_copper_grate: 'Oxidized Copper Grate is a variant of Copper Grate in Minecraft that has weathered to the oxidized state over time.',
    waxed_copper_grate: 'Waxed Copper Grate is a variant of Copper Grate in Minecraft that has been waxed to prevent further weathering.',
    waxed_exposed_copper_grate:
      'Waxed Exposed Copper Grate is a variant of Exposed Copper Grate in Minecraft that has been waxed to prevent further weathering.',
    waxed_weathered_copper_grate:
      'Waxed Weathered Copper Grate is a variant of Weathered Copper Grate in Minecraft that has been waxed to prevent further weathering.',
    waxed_oxidized_copper_grate:
      'Waxed Oxidized Copper Grate is a variant of Oxidized Copper Grate in Minecraft that has been waxed to prevent further weathering.',
    copper_bulb: 'Copper Bulb is a block in Minecraft that can be crafted from copper ingots, primarily used as a decorative block.',
    exposed_copper_bulb: 'Exposed Copper Bulb is a variant of Copper Bulb in Minecraft that has weathered to the exposed state over time.',
    weathered_copper_bulb: 'Weathered Copper Bulb is a variant of Copper Bulb in Minecraft that has weathered to the weathered state over time.',
    oxidized_copper_bulb: 'Oxidized Copper Bulb is a variant of Copper Bulb in Minecraft that has weathered to the oxidized state over time.',
    waxed_copper_bulb: 'Waxed Copper Bulb is a variant of Copper Bulb in Minecraft that has been waxed to prevent further weathering.',
    waxed_exposed_copper_bulb: 'Waxed Exposed Copper Bulb is a variant of Exposed Copper Bulb in Minecraft that has been waxed to prevent further weathering.',
    waxed_weathered_copper_bulb:
      'Waxed Weathered Copper Bulb is a variant of Weathered Copper Bulb in Minecraft that has been waxed to prevent further weathering.',
    waxed_oxidized_copper_bulb:
      'Waxed Oxidized Copper Bulb is a variant of Oxidized Copper Bulb in Minecraft that has been waxed to prevent further weathering.',
    trial_spawner: 'Trial Spawner is an item in Minecraft Dungeons, used in the Ancient Hunt game mode to summon trials for unique rewards.',
    trial_key: 'Trial Key is an item in Minecraft Dungeons, obtained from defeating Ancient mobs in the Ancient Hunt game mode, used to unlock trials.'
  }
}

const lowerCaseFirstLetter = string => string.charAt(0).toLowerCase() + string.slice(1)
for (const [name, data] of Object.entries(moreGeneratedBlocks.natural_blocks)) {
  let description = '' as string | ((name: string) => string)
  if (typeof data === 'object') {
    const obtainedFrom = 'obtained_from' in data ? data.obtained_from : 'description' in data ? data.description : ''
    description = obtainedFrom + ('rarity' in data ? ` Rarity: ${data.rarity}` : '') + ('spawn_range' in data ? ` Spawn range: ${data.spawn_range}` : '')
  } else {
    description = name => `${lowerCaseFirstLetter(name)}: ${data}`
  }
  descriptionGenerators.set([name], description)
}

export const getItemDescription = (item: import('prismarine-item').Item) => {
  const { name } = item
  let result: string | ((name: string) => string) = ''
  for (const [names, description] of descriptionGenerators) {
    if (Array.isArray(names) && names.includes(name)) {
      result = description
    }
    if (typeof names === 'string' && names === name) {
      result = description
    }
    if (names instanceof RegExp && names.test(name)) {
      result = description
    }
  }
  return typeof result === 'function' ? result(item.displayName) : result
}
