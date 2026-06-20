export type BlockNames =
  | 'air'
  | 'stone'
  | 'granite'
  | 'polished_granite'
  | 'diorite'
  | 'polished_diorite'
  | 'andesite'
  | 'polished_andesite'
  | 'grass_block'
  | 'dirt'
  | 'coarse_dirt'
  | 'podzol'
  | 'cobblestone'
  | 'oak_planks'
  | 'spruce_planks'
  | 'birch_planks'
  | 'jungle_planks'
  | 'acacia_planks'
  | 'cherry_planks'
  | 'dark_oak_planks'
  | 'mangrove_planks'
  | 'bamboo_planks'
  | 'bamboo_mosaic'
  | 'oak_sapling'
  | 'spruce_sapling'
  | 'birch_sapling'
  | 'jungle_sapling'
  | 'acacia_sapling'
  | 'cherry_sapling'
  | 'dark_oak_sapling'
  | 'mangrove_propagule'
  | 'bedrock'
  | 'water'
  | 'lava'
  | 'sand'
  | 'suspicious_sand'
  | 'red_sand'
  | 'gravel'
  | 'suspicious_gravel'
  | 'gold_ore'
  | 'deepslate_gold_ore'
  | 'iron_ore'
  | 'deepslate_iron_ore'
  | 'coal_ore'
  | 'deepslate_coal_ore'
  | 'nether_gold_ore'
  | 'oak_log'
  | 'spruce_log'
  | 'birch_log'
  | 'jungle_log'
  | 'acacia_log'
  | 'cherry_log'
  | 'dark_oak_log'
  | 'mangrove_log'
  | 'mangrove_roots'
  | 'muddy_mangrove_roots'
  | 'bamboo_block'
  | 'stripped_spruce_log'
  | 'stripped_birch_log'
  | 'stripped_jungle_log'
  | 'stripped_acacia_log'
  | 'stripped_cherry_log'
  | 'stripped_dark_oak_log'
  | 'stripped_oak_log'
  | 'stripped_mangrove_log'
  | 'stripped_bamboo_block'
  | 'oak_wood'
  | 'spruce_wood'
  | 'birch_wood'
  | 'jungle_wood'
  | 'acacia_wood'
  | 'cherry_wood'
  | 'dark_oak_wood'
  | 'mangrove_wood'
  | 'stripped_oak_wood'
  | 'stripped_spruce_wood'
  | 'stripped_birch_wood'
  | 'stripped_jungle_wood'
  | 'stripped_acacia_wood'
  | 'stripped_cherry_wood'
  | 'stripped_dark_oak_wood'
  | 'stripped_mangrove_wood'
  | 'oak_leaves'
  | 'spruce_leaves'
  | 'birch_leaves'
  | 'jungle_leaves'
  | 'acacia_leaves'
  | 'cherry_leaves'
  | 'dark_oak_leaves'
  | 'mangrove_leaves'
  | 'azalea_leaves'
  | 'flowering_azalea_leaves'
  | 'sponge'
  | 'wet_sponge'
  | 'glass'
  | 'lapis_ore'
  | 'deepslate_lapis_ore'
  | 'lapis_block'
  | 'dispenser'
  | 'sandstone'
  | 'chiseled_sandstone'
  | 'cut_sandstone'
  | 'note_block'
  | 'white_bed'
  | 'orange_bed'
  | 'magenta_bed'
  | 'light_blue_bed'
  | 'yellow_bed'
  | 'lime_bed'
  | 'pink_bed'
  | 'gray_bed'
  | 'light_gray_bed'
  | 'cyan_bed'
  | 'purple_bed'
  | 'blue_bed'
  | 'brown_bed'
  | 'green_bed'
  | 'red_bed'
  | 'black_bed'
  | 'powered_rail'
  | 'detector_rail'
  | 'sticky_piston'
  | 'cobweb'
  | 'grass'
  | 'fern'
  | 'dead_bush'
  | 'seagrass'
  | 'tall_seagrass'
  | 'piston'
  | 'piston_head'
  | 'white_wool'
  | 'orange_wool'
  | 'magenta_wool'
  | 'light_blue_wool'
  | 'yellow_wool'
  | 'lime_wool'
  | 'pink_wool'
  | 'gray_wool'
  | 'light_gray_wool'
  | 'cyan_wool'
  | 'purple_wool'
  | 'blue_wool'
  | 'brown_wool'
  | 'green_wool'
  | 'red_wool'
  | 'black_wool'
  | 'moving_piston'
  | 'dandelion'
  | 'torchflower'
  | 'poppy'
  | 'blue_orchid'
  | 'allium'
  | 'azure_bluet'
  | 'red_tulip'
  | 'orange_tulip'
  | 'white_tulip'
  | 'pink_tulip'
  | 'oxeye_daisy'
  | 'cornflower'
  | 'wither_rose'
  | 'lily_of_the_valley'
  | 'brown_mushroom'
  | 'red_mushroom'
  | 'gold_block'
  | 'iron_block'
  | 'bricks'
  | 'tnt'
  | 'bookshelf'
  | 'chiseled_bookshelf'
  | 'mossy_cobblestone'
  | 'obsidian'
  | 'torch'
  | 'wall_torch'
  | 'fire'
  | 'soul_fire'
  | 'spawner'
  | 'oak_stairs'
  | 'chest'
  | 'redstone_wire'
  | 'diamond_ore'
  | 'deepslate_diamond_ore'
  | 'diamond_block'
  | 'crafting_table'
  | 'wheat'
  | 'farmland'
  | 'furnace'
  | 'oak_sign'
  | 'spruce_sign'
  | 'birch_sign'
  | 'acacia_sign'
  | 'cherry_sign'
  | 'jungle_sign'
  | 'dark_oak_sign'
  | 'mangrove_sign'
  | 'bamboo_sign'
  | 'oak_door'
  | 'ladder'
  | 'rail'
  | 'cobblestone_stairs'
  | 'oak_wall_sign'
  | 'spruce_wall_sign'
  | 'birch_wall_sign'
  | 'acacia_wall_sign'
  | 'cherry_wall_sign'
  | 'jungle_wall_sign'
  | 'dark_oak_wall_sign'
  | 'mangrove_wall_sign'
  | 'bamboo_wall_sign'
  | 'oak_hanging_sign'
  | 'spruce_hanging_sign'
  | 'birch_hanging_sign'
  | 'acacia_hanging_sign'
  | 'cherry_hanging_sign'
  | 'jungle_hanging_sign'
  | 'dark_oak_hanging_sign'
  | 'crimson_hanging_sign'
  | 'warped_hanging_sign'
  | 'mangrove_hanging_sign'
  | 'bamboo_hanging_sign'
  | 'oak_wall_hanging_sign'
  | 'spruce_wall_hanging_sign'
  | 'birch_wall_hanging_sign'
  | 'acacia_wall_hanging_sign'
  | 'cherry_wall_hanging_sign'
  | 'jungle_wall_hanging_sign'
  | 'dark_oak_wall_hanging_sign'
  | 'mangrove_wall_hanging_sign'
  | 'crimson_wall_hanging_sign'
  | 'warped_wall_hanging_sign'
  | 'bamboo_wall_hanging_sign'
  | 'lever'
  | 'stone_pressure_plate'
  | 'iron_door'
  | 'oak_pressure_plate'
  | 'spruce_pressure_plate'
  | 'birch_pressure_plate'
  | 'jungle_pressure_plate'
  | 'acacia_pressure_plate'
  | 'cherry_pressure_plate'
  | 'dark_oak_pressure_plate'
  | 'mangrove_pressure_plate'
  | 'bamboo_pressure_plate'
  | 'redstone_ore'
  | 'deepslate_redstone_ore'
  | 'redstone_torch'
  | 'redstone_wall_torch'
  | 'stone_button'
  | 'snow'
  | 'ice'
  | 'snow_block'
  | 'cactus'
  | 'clay'
  | 'sugar_cane'
  | 'jukebox'
  | 'oak_fence'
  | 'pumpkin'
  | 'netherrack'
  | 'soul_sand'
  | 'soul_soil'
  | 'basalt'
  | 'polished_basalt'
  | 'soul_torch'
  | 'soul_wall_torch'
  | 'glowstone'
  | 'nether_portal'
  | 'carved_pumpkin'
  | 'jack_o_lantern'
  | 'cake'
  | 'repeater'
  | 'white_stained_glass'
  | 'orange_stained_glass'
  | 'magenta_stained_glass'
  | 'light_blue_stained_glass'
  | 'yellow_stained_glass'
  | 'lime_stained_glass'
  | 'pink_stained_glass'
  | 'gray_stained_glass'
  | 'light_gray_stained_glass'
  | 'cyan_stained_glass'
  | 'purple_stained_glass'
  | 'blue_stained_glass'
  | 'brown_stained_glass'
  | 'green_stained_glass'
  | 'red_stained_glass'
  | 'black_stained_glass'
  | 'oak_trapdoor'
  | 'spruce_trapdoor'
  | 'birch_trapdoor'
  | 'jungle_trapdoor'
  | 'acacia_trapdoor'
  | 'cherry_trapdoor'
  | 'dark_oak_trapdoor'
  | 'mangrove_trapdoor'
  | 'bamboo_trapdoor'
  | 'stone_bricks'
  | 'mossy_stone_bricks'
  | 'cracked_stone_bricks'
  | 'chiseled_stone_bricks'
  | 'packed_mud'
  | 'mud_bricks'
  | 'infested_stone'
  | 'infested_cobblestone'
  | 'infested_stone_bricks'
  | 'infested_mossy_stone_bricks'
  | 'infested_cracked_stone_bricks'
  | 'infested_chiseled_stone_bricks'
  | 'brown_mushroom_block'
  | 'red_mushroom_block'
  | 'mushroom_stem'
  | 'iron_bars'
  | 'chain'
  | 'glass_pane'
  | 'melon'
  | 'attached_pumpkin_stem'
  | 'attached_melon_stem'
  | 'pumpkin_stem'
  | 'melon_stem'
  | 'vine'
  | 'glow_lichen'
  | 'oak_fence_gate'
  | 'brick_stairs'
  | 'stone_brick_stairs'
  | 'mud_brick_stairs'
  | 'mycelium'
  | 'lily_pad'
  | 'nether_bricks'
  | 'nether_brick_fence'
  | 'nether_brick_stairs'
  | 'nether_wart'
  | 'enchanting_table'
  | 'brewing_stand'
  | 'cauldron'
  | 'water_cauldron'
  | 'lava_cauldron'
  | 'powder_snow_cauldron'
  | 'end_portal'
  | 'end_portal_frame'
  | 'end_stone'
  | 'dragon_egg'
  | 'redstone_lamp'
  | 'cocoa'
  | 'sandstone_stairs'
  | 'emerald_ore'
  | 'deepslate_emerald_ore'
  | 'ender_chest'
  | 'tripwire_hook'
  | 'tripwire'
  | 'emerald_block'
  | 'spruce_stairs'
  | 'birch_stairs'
  | 'jungle_stairs'
  | 'command_block'
  | 'beacon'
  | 'cobblestone_wall'
  | 'mossy_cobblestone_wall'
  | 'flower_pot'
  | 'potted_torchflower'
  | 'potted_oak_sapling'
  | 'potted_spruce_sapling'
  | 'potted_birch_sapling'
  | 'potted_jungle_sapling'
  | 'potted_acacia_sapling'
  | 'potted_cherry_sapling'
  | 'potted_dark_oak_sapling'
  | 'potted_mangrove_propagule'
  | 'potted_fern'
  | 'potted_dandelion'
  | 'potted_poppy'
  | 'potted_blue_orchid'
  | 'potted_allium'
  | 'potted_azure_bluet'
  | 'potted_red_tulip'
  | 'potted_orange_tulip'
  | 'potted_white_tulip'
  | 'potted_pink_tulip'
  | 'potted_oxeye_daisy'
  | 'potted_cornflower'
  | 'potted_lily_of_the_valley'
  | 'potted_wither_rose'
  | 'potted_red_mushroom'
  | 'potted_brown_mushroom'
  | 'potted_dead_bush'
  | 'potted_cactus'
  | 'carrots'
  | 'potatoes'
  | 'oak_button'
  | 'spruce_button'
  | 'birch_button'
  | 'jungle_button'
  | 'acacia_button'
  | 'cherry_button'
  | 'dark_oak_button'
  | 'mangrove_button'
  | 'bamboo_button'
  | 'skeleton_skull'
  | 'skeleton_wall_skull'
  | 'wither_skeleton_skull'
  | 'wither_skeleton_wall_skull'
  | 'zombie_head'
  | 'zombie_wall_head'
  | 'player_head'
  | 'player_wall_head'
  | 'creeper_head'
  | 'creeper_wall_head'
  | 'dragon_head'
  | 'dragon_wall_head'
  | 'piglin_head'
  | 'piglin_wall_head'
  | 'anvil'
  | 'chipped_anvil'
  | 'damaged_anvil'
  | 'trapped_chest'
  | 'light_weighted_pressure_plate'
  | 'heavy_weighted_pressure_plate'
  | 'comparator'
  | 'daylight_detector'
  | 'redstone_block'
  | 'nether_quartz_ore'
  | 'hopper'
  | 'quartz_block'
  | 'chiseled_quartz_block'
  | 'quartz_pillar'
  | 'quartz_stairs'
  | 'activator_rail'
  | 'dropper'
  | 'white_terracotta'
  | 'orange_terracotta'
  | 'magenta_terracotta'
  | 'light_blue_terracotta'
  | 'yellow_terracotta'
  | 'lime_terracotta'
  | 'pink_terracotta'
  | 'gray_terracotta'
  | 'light_gray_terracotta'
  | 'cyan_terracotta'
  | 'purple_terracotta'
  | 'blue_terracotta'
  | 'brown_terracotta'
  | 'green_terracotta'
  | 'red_terracotta'
  | 'black_terracotta'
  | 'white_stained_glass_pane'
  | 'orange_stained_glass_pane'
  | 'magenta_stained_glass_pane'
  | 'light_blue_stained_glass_pane'
  | 'yellow_stained_glass_pane'
  | 'lime_stained_glass_pane'
  | 'pink_stained_glass_pane'
  | 'gray_stained_glass_pane'
  | 'light_gray_stained_glass_pane'
  | 'cyan_stained_glass_pane'
  | 'purple_stained_glass_pane'
  | 'blue_stained_glass_pane'
  | 'brown_stained_glass_pane'
  | 'green_stained_glass_pane'
  | 'red_stained_glass_pane'
  | 'black_stained_glass_pane'
  | 'acacia_stairs'
  | 'cherry_stairs'
  | 'dark_oak_stairs'
  | 'mangrove_stairs'
  | 'bamboo_stairs'
  | 'bamboo_mosaic_stairs'
  | 'slime_block'
  | 'barrier'
  | 'light'
  | 'iron_trapdoor'
  | 'prismarine'
  | 'prismarine_bricks'
  | 'dark_prismarine'
  | 'prismarine_stairs'
  | 'prismarine_brick_stairs'
  | 'dark_prismarine_stairs'
  | 'prismarine_slab'
  | 'prismarine_brick_slab'
  | 'dark_prismarine_slab'
  | 'sea_lantern'
  | 'hay_block'
  | 'white_carpet'
  | 'orange_carpet'
  | 'magenta_carpet'
  | 'light_blue_carpet'
  | 'yellow_carpet'
  | 'lime_carpet'
  | 'pink_carpet'
  | 'gray_carpet'
  | 'light_gray_carpet'
  | 'cyan_carpet'
  | 'purple_carpet'
  | 'blue_carpet'
  | 'brown_carpet'
  | 'green_carpet'
  | 'red_carpet'
  | 'black_carpet'
  | 'terracotta'
  | 'coal_block'
  | 'packed_ice'
  | 'sunflower'
  | 'lilac'
  | 'rose_bush'
  | 'peony'
  | 'tall_grass'
  | 'large_fern'
  | 'white_banner'
  | 'orange_banner'
  | 'magenta_banner'
  | 'light_blue_banner'
  | 'yellow_banner'
  | 'lime_banner'
  | 'pink_banner'
  | 'gray_banner'
  | 'light_gray_banner'
  | 'cyan_banner'
  | 'purple_banner'
  | 'blue_banner'
  | 'brown_banner'
  | 'green_banner'
  | 'red_banner'
  | 'black_banner'
  | 'white_wall_banner'
  | 'orange_wall_banner'
  | 'magenta_wall_banner'
  | 'light_blue_wall_banner'
  | 'yellow_wall_banner'
  | 'lime_wall_banner'
  | 'pink_wall_banner'
  | 'gray_wall_banner'
  | 'light_gray_wall_banner'
  | 'cyan_wall_banner'
  | 'purple_wall_banner'
  | 'blue_wall_banner'
  | 'brown_wall_banner'
  | 'green_wall_banner'
  | 'red_wall_banner'
  | 'black_wall_banner'
  | 'red_sandstone'
  | 'chiseled_red_sandstone'
  | 'cut_red_sandstone'
  | 'red_sandstone_stairs'
  | 'oak_slab'
  | 'spruce_slab'
  | 'birch_slab'
  | 'jungle_slab'
  | 'acacia_slab'
  | 'cherry_slab'
  | 'dark_oak_slab'
  | 'mangrove_slab'
  | 'bamboo_slab'
  | 'bamboo_mosaic_slab'
  | 'stone_slab'
  | 'smooth_stone_slab'
  | 'sandstone_slab'
  | 'cut_sandstone_slab'
  | 'petrified_oak_slab'
  | 'cobblestone_slab'
  | 'brick_slab'
  | 'stone_brick_slab'
  | 'mud_brick_slab'
  | 'nether_brick_slab'
  | 'quartz_slab'
  | 'red_sandstone_slab'
  | 'cut_red_sandstone_slab'
  | 'purpur_slab'
  | 'smooth_stone'
  | 'smooth_sandstone'
  | 'smooth_quartz'
  | 'smooth_red_sandstone'
  | 'spruce_fence_gate'
  | 'birch_fence_gate'
  | 'jungle_fence_gate'
  | 'acacia_fence_gate'
  | 'cherry_fence_gate'
  | 'dark_oak_fence_gate'
  | 'mangrove_fence_gate'
  | 'bamboo_fence_gate'
  | 'spruce_fence'
  | 'birch_fence'
  | 'jungle_fence'
  | 'acacia_fence'
  | 'cherry_fence'
  | 'dark_oak_fence'
  | 'mangrove_fence'
  | 'bamboo_fence'
  | 'spruce_door'
  | 'birch_door'
  | 'jungle_door'
  | 'acacia_door'
  | 'cherry_door'
  | 'dark_oak_door'
  | 'mangrove_door'
  | 'bamboo_door'
  | 'end_rod'
  | 'chorus_plant'
  | 'chorus_flower'
  | 'purpur_block'
  | 'purpur_pillar'
  | 'purpur_stairs'
  | 'end_stone_bricks'
  | 'torchflower_crop'
  | 'pitcher_crop'
  | 'pitcher_plant'
  | 'beetroots'
  | 'dirt_path'
  | 'end_gateway'
  | 'repeating_command_block'
  | 'chain_command_block'
  | 'frosted_ice'
  | 'magma_block'
  | 'nether_wart_block'
  | 'red_nether_bricks'
  | 'bone_block'
  | 'structure_void'
  | 'observer'
  | 'shulker_box'
  | 'white_shulker_box'
  | 'orange_shulker_box'
  | 'magenta_shulker_box'
  | 'light_blue_shulker_box'
  | 'yellow_shulker_box'
  | 'lime_shulker_box'
  | 'pink_shulker_box'
  | 'gray_shulker_box'
  | 'light_gray_shulker_box'
  | 'cyan_shulker_box'
  | 'purple_shulker_box'
  | 'blue_shulker_box'
  | 'brown_shulker_box'
  | 'green_shulker_box'
  | 'red_shulker_box'
  | 'black_shulker_box'
  | 'white_glazed_terracotta'
  | 'orange_glazed_terracotta'
  | 'magenta_glazed_terracotta'
  | 'light_blue_glazed_terracotta'
  | 'yellow_glazed_terracotta'
  | 'lime_glazed_terracotta'
  | 'pink_glazed_terracotta'
  | 'gray_glazed_terracotta'
  | 'light_gray_glazed_terracotta'
  | 'cyan_glazed_terracotta'
  | 'purple_glazed_terracotta'
  | 'blue_glazed_terracotta'
  | 'brown_glazed_terracotta'
  | 'green_glazed_terracotta'
  | 'red_glazed_terracotta'
  | 'black_glazed_terracotta'
  | 'white_concrete'
  | 'orange_concrete'
  | 'magenta_concrete'
  | 'light_blue_concrete'
  | 'yellow_concrete'
  | 'lime_concrete'
  | 'pink_concrete'
  | 'gray_concrete'
  | 'light_gray_concrete'
  | 'cyan_concrete'
  | 'purple_concrete'
  | 'blue_concrete'
  | 'brown_concrete'
  | 'green_concrete'
  | 'red_concrete'
  | 'black_concrete'
  | 'white_concrete_powder'
  | 'orange_concrete_powder'
  | 'magenta_concrete_powder'
  | 'light_blue_concrete_powder'
  | 'yellow_concrete_powder'
  | 'lime_concrete_powder'
  | 'pink_concrete_powder'
  | 'gray_concrete_powder'
  | 'light_gray_concrete_powder'
  | 'cyan_concrete_powder'
  | 'purple_concrete_powder'
  | 'blue_concrete_powder'
  | 'brown_concrete_powder'
  | 'green_concrete_powder'
  | 'red_concrete_powder'
  | 'black_concrete_powder'
  | 'kelp'
  | 'kelp_plant'
  | 'dried_kelp_block'
  | 'turtle_egg'
  | 'sniffer_egg'
  | 'dead_tube_coral_block'
  | 'dead_brain_coral_block'
  | 'dead_bubble_coral_block'
  | 'dead_fire_coral_block'
  | 'dead_horn_coral_block'
  | 'tube_coral_block'
  | 'brain_coral_block'
  | 'bubble_coral_block'
  | 'fire_coral_block'
  | 'horn_coral_block'
  | 'dead_tube_coral'
  | 'dead_brain_coral'
  | 'dead_bubble_coral'
  | 'dead_fire_coral'
  | 'dead_horn_coral'
  | 'tube_coral'
  | 'brain_coral'
  | 'bubble_coral'
  | 'fire_coral'
  | 'horn_coral'
  | 'dead_tube_coral_fan'
  | 'dead_brain_coral_fan'
  | 'dead_bubble_coral_fan'
  | 'dead_fire_coral_fan'
  | 'dead_horn_coral_fan'
  | 'tube_coral_fan'
  | 'brain_coral_fan'
  | 'bubble_coral_fan'
  | 'fire_coral_fan'
  | 'horn_coral_fan'
  | 'dead_tube_coral_wall_fan'
  | 'dead_brain_coral_wall_fan'
  | 'dead_bubble_coral_wall_fan'
  | 'dead_fire_coral_wall_fan'
  | 'dead_horn_coral_wall_fan'
  | 'tube_coral_wall_fan'
  | 'brain_coral_wall_fan'
  | 'bubble_coral_wall_fan'
  | 'fire_coral_wall_fan'
  | 'horn_coral_wall_fan'
  | 'sea_pickle'
  | 'blue_ice'
  | 'conduit'
  | 'bamboo_sapling'
  | 'bamboo'
  | 'potted_bamboo'
  | 'void_air'
  | 'cave_air'
  | 'bubble_column'
  | 'polished_granite_stairs'
  | 'smooth_red_sandstone_stairs'
  | 'mossy_stone_brick_stairs'
  | 'polished_diorite_stairs'
  | 'mossy_cobblestone_stairs'
  | 'end_stone_brick_stairs'
  | 'stone_stairs'
  | 'smooth_sandstone_stairs'
  | 'smooth_quartz_stairs'
  | 'granite_stairs'
  | 'andesite_stairs'
  | 'red_nether_brick_stairs'
  | 'polished_andesite_stairs'
  | 'diorite_stairs'
  | 'polished_granite_slab'
  | 'smooth_red_sandstone_slab'
  | 'mossy_stone_brick_slab'
  | 'polished_diorite_slab'
  | 'mossy_cobblestone_slab'
  | 'end_stone_brick_slab'
  | 'smooth_sandstone_slab'
  | 'smooth_quartz_slab'
  | 'granite_slab'
  | 'andesite_slab'
  | 'red_nether_brick_slab'
  | 'polished_andesite_slab'
  | 'diorite_slab'
  | 'brick_wall'
  | 'prismarine_wall'
  | 'red_sandstone_wall'
  | 'mossy_stone_brick_wall'
  | 'granite_wall'
  | 'stone_brick_wall'
  | 'mud_brick_wall'
  | 'nether_brick_wall'
  | 'andesite_wall'
  | 'red_nether_brick_wall'
  | 'sandstone_wall'
  | 'end_stone_brick_wall'
  | 'diorite_wall'
  | 'scaffolding'
  | 'loom'
  | 'barrel'
  | 'smoker'
  | 'blast_furnace'
  | 'cartography_table'
  | 'fletching_table'
  | 'grindstone'
  | 'lectern'
  | 'smithing_table'
  | 'stonecutter'
  | 'bell'
  | 'lantern'
  | 'soul_lantern'
  | 'campfire'
  | 'soul_campfire'
  | 'sweet_berry_bush'
  | 'warped_stem'
  | 'stripped_warped_stem'
  | 'warped_hyphae'
  | 'stripped_warped_hyphae'
  | 'warped_nylium'
  | 'warped_fungus'
  | 'warped_wart_block'
  | 'warped_roots'
  | 'nether_sprouts'
  | 'crimson_stem'
  | 'stripped_crimson_stem'
  | 'crimson_hyphae'
  | 'stripped_crimson_hyphae'
  | 'crimson_nylium'
  | 'crimson_fungus'
  | 'shroomlight'
  | 'weeping_vines'
  | 'weeping_vines_plant'
  | 'twisting_vines'
  | 'twisting_vines_plant'
  | 'crimson_roots'
  | 'crimson_planks'
  | 'warped_planks'
  | 'crimson_slab'
  | 'warped_slab'
  | 'crimson_pressure_plate'
  | 'warped_pressure_plate'
  | 'crimson_fence'
  | 'warped_fence'
  | 'crimson_trapdoor'
  | 'warped_trapdoor'
  | 'crimson_fence_gate'
  | 'warped_fence_gate'
  | 'crimson_stairs'
  | 'warped_stairs'
  | 'crimson_button'
  | 'warped_button'
  | 'crimson_door'
  | 'warped_door'
  | 'crimson_sign'
  | 'warped_sign'
  | 'crimson_wall_sign'
  | 'warped_wall_sign'
  | 'structure_block'
  | 'jigsaw'
  | 'composter'
  | 'target'
  | 'bee_nest'
  | 'beehive'
  | 'honey_block'
  | 'honeycomb_block'
  | 'netherite_block'
  | 'ancient_debris'
  | 'crying_obsidian'
  | 'respawn_anchor'
  | 'potted_crimson_fungus'
  | 'potted_warped_fungus'
  | 'potted_crimson_roots'
  | 'potted_warped_roots'
  | 'lodestone'
  | 'blackstone'
  | 'blackstone_stairs'
  | 'blackstone_wall'
  | 'blackstone_slab'
  | 'polished_blackstone'
  | 'polished_blackstone_bricks'
  | 'cracked_polished_blackstone_bricks'
  | 'chiseled_polished_blackstone'
  | 'polished_blackstone_brick_slab'
  | 'polished_blackstone_brick_stairs'
  | 'polished_blackstone_brick_wall'
  | 'gilded_blackstone'
  | 'polished_blackstone_stairs'
  | 'polished_blackstone_slab'
  | 'polished_blackstone_pressure_plate'
  | 'polished_blackstone_button'
  | 'polished_blackstone_wall'
  | 'chiseled_nether_bricks'
  | 'cracked_nether_bricks'
  | 'quartz_bricks'
  | 'candle'
  | 'white_candle'
  | 'orange_candle'
  | 'magenta_candle'
  | 'light_blue_candle'
  | 'yellow_candle'
  | 'lime_candle'
  | 'pink_candle'
  | 'gray_candle'
  | 'light_gray_candle'
  | 'cyan_candle'
  | 'purple_candle'
  | 'blue_candle'
  | 'brown_candle'
  | 'green_candle'
  | 'red_candle'
  | 'black_candle'
  | 'candle_cake'
  | 'white_candle_cake'
  | 'orange_candle_cake'
  | 'magenta_candle_cake'
  | 'light_blue_candle_cake'
  | 'yellow_candle_cake'
  | 'lime_candle_cake'
  | 'pink_candle_cake'
  | 'gray_candle_cake'
  | 'light_gray_candle_cake'
  | 'cyan_candle_cake'
  | 'purple_candle_cake'
  | 'blue_candle_cake'
  | 'brown_candle_cake'
  | 'green_candle_cake'
  | 'red_candle_cake'
  | 'black_candle_cake'
  | 'amethyst_block'
  | 'budding_amethyst'
  | 'amethyst_cluster'
  | 'large_amethyst_bud'
  | 'medium_amethyst_bud'
  | 'small_amethyst_bud'
  | 'tuff'
  | 'calcite'
  | 'tinted_glass'
  | 'powder_snow'
  | 'sculk_sensor'
  | 'calibrated_sculk_sensor'
  | 'sculk'
  | 'sculk_vein'
  | 'sculk_catalyst'
  | 'sculk_shrieker'
  | 'oxidized_copper'
  | 'weathered_copper'
  | 'exposed_copper'
  | 'copper_block'
  | 'copper_ore'
  | 'deepslate_copper_ore'
  | 'oxidized_cut_copper'
  | 'weathered_cut_copper'
  | 'exposed_cut_copper'
  | 'cut_copper'
  | 'oxidized_cut_copper_stairs'
  | 'weathered_cut_copper_stairs'
  | 'exposed_cut_copper_stairs'
  | 'cut_copper_stairs'
  | 'oxidized_cut_copper_slab'
  | 'weathered_cut_copper_slab'
  | 'exposed_cut_copper_slab'
  | 'cut_copper_slab'
  | 'waxed_copper_block'
  | 'waxed_weathered_copper'
  | 'waxed_exposed_copper'
  | 'waxed_oxidized_copper'
  | 'waxed_oxidized_cut_copper'
  | 'waxed_weathered_cut_copper'
  | 'waxed_exposed_cut_copper'
  | 'waxed_cut_copper'
  | 'waxed_oxidized_cut_copper_stairs'
  | 'waxed_weathered_cut_copper_stairs'
  | 'waxed_exposed_cut_copper_stairs'
  | 'waxed_cut_copper_stairs'
  | 'waxed_oxidized_cut_copper_slab'
  | 'waxed_weathered_cut_copper_slab'
  | 'waxed_exposed_cut_copper_slab'
  | 'waxed_cut_copper_slab'
  | 'lightning_rod'
  | 'pointed_dripstone'
  | 'dripstone_block'
  | 'cave_vines'
  | 'cave_vines_plant'
  | 'spore_blossom'
  | 'azalea'
  | 'flowering_azalea'
  | 'moss_carpet'
  | 'pink_petals'
  | 'moss_block'
  | 'big_dripleaf'
  | 'big_dripleaf_stem'
  | 'small_dripleaf'
  | 'hanging_roots'
  | 'rooted_dirt'
  | 'mud'
  | 'deepslate'
  | 'cobbled_deepslate'
  | 'cobbled_deepslate_stairs'
  | 'cobbled_deepslate_slab'
  | 'cobbled_deepslate_wall'
  | 'polished_deepslate'
  | 'polished_deepslate_stairs'
  | 'polished_deepslate_slab'
  | 'polished_deepslate_wall'
  | 'deepslate_tiles'
  | 'deepslate_tile_stairs'
  | 'deepslate_tile_slab'
  | 'deepslate_tile_wall'
  | 'deepslate_bricks'
  | 'deepslate_brick_stairs'
  | 'deepslate_brick_slab'
  | 'deepslate_brick_wall'
  | 'chiseled_deepslate'
  | 'cracked_deepslate_bricks'
  | 'cracked_deepslate_tiles'
  | 'infested_deepslate'
  | 'smooth_basalt'
  | 'raw_iron_block'
  | 'raw_copper_block'
  | 'raw_gold_block'
  | 'potted_azalea_bush'
  | 'potted_flowering_azalea_bush'
  | 'ochre_froglight'
  | 'verdant_froglight'
  | 'pearlescent_froglight'
  | 'frogspawn'
  | 'reinforced_deepslate'
  | 'decorated_pot'
export type ItemNames =
  | 'air'
  | 'stone'
  | 'granite'
  | 'polished_granite'
  | 'diorite'
  | 'polished_diorite'
  | 'andesite'
  | 'polished_andesite'
  | 'deepslate'
  | 'cobbled_deepslate'
  | 'polished_deepslate'
  | 'calcite'
  | 'tuff'
  | 'dripstone_block'
  | 'grass_block'
  | 'dirt'
  | 'coarse_dirt'
  | 'podzol'
  | 'rooted_dirt'
  | 'mud'
  | 'crimson_nylium'
  | 'warped_nylium'
  | 'cobblestone'
  | 'oak_planks'
  | 'spruce_planks'
  | 'birch_planks'
  | 'jungle_planks'
  | 'acacia_planks'
  | 'cherry_planks'
  | 'dark_oak_planks'
  | 'mangrove_planks'
  | 'bamboo_planks'
  | 'crimson_planks'
  | 'warped_planks'
  | 'bamboo_mosaic'
  | 'oak_sapling'
  | 'spruce_sapling'
  | 'birch_sapling'
  | 'jungle_sapling'
  | 'acacia_sapling'
  | 'cherry_sapling'
  | 'dark_oak_sapling'
  | 'mangrove_propagule'
  | 'bedrock'
  | 'sand'
  | 'suspicious_sand'
  | 'suspicious_gravel'
  | 'red_sand'
  | 'gravel'
  | 'coal_ore'
  | 'deepslate_coal_ore'
  | 'iron_ore'
  | 'deepslate_iron_ore'
  | 'copper_ore'
  | 'deepslate_copper_ore'
  | 'gold_ore'
  | 'deepslate_gold_ore'
  | 'redstone_ore'
  | 'deepslate_redstone_ore'
  | 'emerald_ore'
  | 'deepslate_emerald_ore'
  | 'lapis_ore'
  | 'deepslate_lapis_ore'
  | 'diamond_ore'
  | 'deepslate_diamond_ore'
  | 'nether_gold_ore'
  | 'nether_quartz_ore'
  | 'ancient_debris'
  | 'coal_block'
  | 'raw_iron_block'
  | 'raw_copper_block'
  | 'raw_gold_block'
  | 'amethyst_block'
  | 'budding_amethyst'
  | 'iron_block'
  | 'copper_block'
  | 'gold_block'
  | 'diamond_block'
  | 'netherite_block'
  | 'exposed_copper'
  | 'weathered_copper'
  | 'oxidized_copper'
  | 'cut_copper'
  | 'exposed_cut_copper'
  | 'weathered_cut_copper'
  | 'oxidized_cut_copper'
  | 'cut_copper_stairs'
  | 'exposed_cut_copper_stairs'
  | 'weathered_cut_copper_stairs'
  | 'oxidized_cut_copper_stairs'
  | 'cut_copper_slab'
  | 'exposed_cut_copper_slab'
  | 'weathered_cut_copper_slab'
  | 'oxidized_cut_copper_slab'
  | 'waxed_copper_block'
  | 'waxed_exposed_copper'
  | 'waxed_weathered_copper'
  | 'waxed_oxidized_copper'
  | 'waxed_cut_copper'
  | 'waxed_exposed_cut_copper'
  | 'waxed_weathered_cut_copper'
  | 'waxed_oxidized_cut_copper'
  | 'waxed_cut_copper_stairs'
  | 'waxed_exposed_cut_copper_stairs'
  | 'waxed_weathered_cut_copper_stairs'
  | 'waxed_oxidized_cut_copper_stairs'
  | 'waxed_cut_copper_slab'
  | 'waxed_exposed_cut_copper_slab'
  | 'waxed_weathered_cut_copper_slab'
  | 'waxed_oxidized_cut_copper_slab'
  | 'oak_log'
  | 'spruce_log'
  | 'birch_log'
  | 'jungle_log'
  | 'acacia_log'
  | 'cherry_log'
  | 'dark_oak_log'
  | 'mangrove_log'
  | 'mangrove_roots'
  | 'muddy_mangrove_roots'
  | 'crimson_stem'
  | 'warped_stem'
  | 'bamboo_block'
  | 'stripped_oak_log'
  | 'stripped_spruce_log'
  | 'stripped_birch_log'
  | 'stripped_jungle_log'
  | 'stripped_acacia_log'
  | 'stripped_cherry_log'
  | 'stripped_dark_oak_log'
  | 'stripped_mangrove_log'
  | 'stripped_crimson_stem'
  | 'stripped_warped_stem'
  | 'stripped_oak_wood'
  | 'stripped_spruce_wood'
  | 'stripped_birch_wood'
  | 'stripped_jungle_wood'
  | 'stripped_acacia_wood'
  | 'stripped_cherry_wood'
  | 'stripped_dark_oak_wood'
  | 'stripped_mangrove_wood'
  | 'stripped_crimson_hyphae'
  | 'stripped_warped_hyphae'
  | 'stripped_bamboo_block'
  | 'oak_wood'
  | 'spruce_wood'
  | 'birch_wood'
  | 'jungle_wood'
  | 'acacia_wood'
  | 'cherry_wood'
  | 'dark_oak_wood'
  | 'mangrove_wood'
  | 'crimson_hyphae'
  | 'warped_hyphae'
  | 'oak_leaves'
  | 'spruce_leaves'
  | 'birch_leaves'
  | 'jungle_leaves'
  | 'acacia_leaves'
  | 'cherry_leaves'
  | 'dark_oak_leaves'
  | 'mangrove_leaves'
  | 'azalea_leaves'
  | 'flowering_azalea_leaves'
  | 'sponge'
  | 'wet_sponge'
  | 'glass'
  | 'tinted_glass'
  | 'lapis_block'
  | 'sandstone'
  | 'chiseled_sandstone'
  | 'cut_sandstone'
  | 'cobweb'
  | 'grass'
  | 'fern'
  | 'azalea'
  | 'flowering_azalea'
  | 'dead_bush'
  | 'seagrass'
  | 'sea_pickle'
  | 'white_wool'
  | 'orange_wool'
  | 'magenta_wool'
  | 'light_blue_wool'
  | 'yellow_wool'
  | 'lime_wool'
  | 'pink_wool'
  | 'gray_wool'
  | 'light_gray_wool'
  | 'cyan_wool'
  | 'purple_wool'
  | 'blue_wool'
  | 'brown_wool'
  | 'green_wool'
  | 'red_wool'
  | 'black_wool'
  | 'dandelion'
  | 'poppy'
  | 'blue_orchid'
  | 'allium'
  | 'azure_bluet'
  | 'red_tulip'
  | 'orange_tulip'
  | 'white_tulip'
  | 'pink_tulip'
  | 'oxeye_daisy'
  | 'cornflower'
  | 'lily_of_the_valley'
  | 'wither_rose'
  | 'torchflower'
  | 'pitcher_plant'
  | 'spore_blossom'
  | 'brown_mushroom'
  | 'red_mushroom'
  | 'crimson_fungus'
  | 'warped_fungus'
  | 'crimson_roots'
  | 'warped_roots'
  | 'nether_sprouts'
  | 'weeping_vines'
  | 'twisting_vines'
  | 'sugar_cane'
  | 'kelp'
  | 'moss_carpet'
  | 'pink_petals'
  | 'moss_block'
  | 'hanging_roots'
  | 'big_dripleaf'
  | 'small_dripleaf'
  | 'bamboo'
  | 'oak_slab'
  | 'spruce_slab'
  | 'birch_slab'
  | 'jungle_slab'
  | 'acacia_slab'
  | 'cherry_slab'
  | 'dark_oak_slab'
  | 'mangrove_slab'
  | 'bamboo_slab'
  | 'bamboo_mosaic_slab'
  | 'crimson_slab'
  | 'warped_slab'
  | 'stone_slab'
  | 'smooth_stone_slab'
  | 'sandstone_slab'
  | 'cut_sandstone_slab'
  | 'petrified_oak_slab'
  | 'cobblestone_slab'
  | 'brick_slab'
  | 'stone_brick_slab'
  | 'mud_brick_slab'
  | 'nether_brick_slab'
  | 'quartz_slab'
  | 'red_sandstone_slab'
  | 'cut_red_sandstone_slab'
  | 'purpur_slab'
  | 'prismarine_slab'
  | 'prismarine_brick_slab'
  | 'dark_prismarine_slab'
  | 'smooth_quartz'
  | 'smooth_red_sandstone'
  | 'smooth_sandstone'
  | 'smooth_stone'
  | 'bricks'
  | 'bookshelf'
  | 'chiseled_bookshelf'
  | 'decorated_pot'
  | 'mossy_cobblestone'
  | 'obsidian'
  | 'torch'
  | 'end_rod'
  | 'chorus_plant'
  | 'chorus_flower'
  | 'purpur_block'
  | 'purpur_pillar'
  | 'purpur_stairs'
  | 'spawner'
  | 'chest'
  | 'crafting_table'
  | 'farmland'
  | 'furnace'
  | 'ladder'
  | 'cobblestone_stairs'
  | 'snow'
  | 'ice'
  | 'snow_block'
  | 'cactus'
  | 'clay'
  | 'jukebox'
  | 'oak_fence'
  | 'spruce_fence'
  | 'birch_fence'
  | 'jungle_fence'
  | 'acacia_fence'
  | 'cherry_fence'
  | 'dark_oak_fence'
  | 'mangrove_fence'
  | 'bamboo_fence'
  | 'crimson_fence'
  | 'warped_fence'
  | 'pumpkin'
  | 'carved_pumpkin'
  | 'jack_o_lantern'
  | 'netherrack'
  | 'soul_sand'
  | 'soul_soil'
  | 'basalt'
  | 'polished_basalt'
  | 'smooth_basalt'
  | 'soul_torch'
  | 'glowstone'
  | 'infested_stone'
  | 'infested_cobblestone'
  | 'infested_stone_bricks'
  | 'infested_mossy_stone_bricks'
  | 'infested_cracked_stone_bricks'
  | 'infested_chiseled_stone_bricks'
  | 'infested_deepslate'
  | 'stone_bricks'
  | 'mossy_stone_bricks'
  | 'cracked_stone_bricks'
  | 'chiseled_stone_bricks'
  | 'packed_mud'
  | 'mud_bricks'
  | 'deepslate_bricks'
  | 'cracked_deepslate_bricks'
  | 'deepslate_tiles'
  | 'cracked_deepslate_tiles'
  | 'chiseled_deepslate'
  | 'reinforced_deepslate'
  | 'brown_mushroom_block'
  | 'red_mushroom_block'
  | 'mushroom_stem'
  | 'iron_bars'
  | 'chain'
  | 'glass_pane'
  | 'melon'
  | 'vine'
  | 'glow_lichen'
  | 'brick_stairs'
  | 'stone_brick_stairs'
  | 'mud_brick_stairs'
  | 'mycelium'
  | 'lily_pad'
  | 'nether_bricks'
  | 'cracked_nether_bricks'
  | 'chiseled_nether_bricks'
  | 'nether_brick_fence'
  | 'nether_brick_stairs'
  | 'sculk'
  | 'sculk_vein'
  | 'sculk_catalyst'
  | 'sculk_shrieker'
  | 'enchanting_table'
  | 'end_portal_frame'
  | 'end_stone'
  | 'end_stone_bricks'
  | 'dragon_egg'
  | 'sandstone_stairs'
  | 'ender_chest'
  | 'emerald_block'
  | 'oak_stairs'
  | 'spruce_stairs'
  | 'birch_stairs'
  | 'jungle_stairs'
  | 'acacia_stairs'
  | 'cherry_stairs'
  | 'dark_oak_stairs'
  | 'mangrove_stairs'
  | 'bamboo_stairs'
  | 'bamboo_mosaic_stairs'
  | 'crimson_stairs'
  | 'warped_stairs'
  | 'command_block'
  | 'beacon'
  | 'cobblestone_wall'
  | 'mossy_cobblestone_wall'
  | 'brick_wall'
  | 'prismarine_wall'
  | 'red_sandstone_wall'
  | 'mossy_stone_brick_wall'
  | 'granite_wall'
  | 'stone_brick_wall'
  | 'mud_brick_wall'
  | 'nether_brick_wall'
  | 'andesite_wall'
  | 'red_nether_brick_wall'
  | 'sandstone_wall'
  | 'end_stone_brick_wall'
  | 'diorite_wall'
  | 'blackstone_wall'
  | 'polished_blackstone_wall'
  | 'polished_blackstone_brick_wall'
  | 'cobbled_deepslate_wall'
  | 'polished_deepslate_wall'
  | 'deepslate_brick_wall'
  | 'deepslate_tile_wall'
  | 'anvil'
  | 'chipped_anvil'
  | 'damaged_anvil'
  | 'chiseled_quartz_block'
  | 'quartz_block'
  | 'quartz_bricks'
  | 'quartz_pillar'
  | 'quartz_stairs'
  | 'white_terracotta'
  | 'orange_terracotta'
  | 'magenta_terracotta'
  | 'light_blue_terracotta'
  | 'yellow_terracotta'
  | 'lime_terracotta'
  | 'pink_terracotta'
  | 'gray_terracotta'
  | 'light_gray_terracotta'
  | 'cyan_terracotta'
  | 'purple_terracotta'
  | 'blue_terracotta'
  | 'brown_terracotta'
  | 'green_terracotta'
  | 'red_terracotta'
  | 'black_terracotta'
  | 'barrier'
  | 'light'
  | 'hay_block'
  | 'white_carpet'
  | 'orange_carpet'
  | 'magenta_carpet'
  | 'light_blue_carpet'
  | 'yellow_carpet'
  | 'lime_carpet'
  | 'pink_carpet'
  | 'gray_carpet'
  | 'light_gray_carpet'
  | 'cyan_carpet'
  | 'purple_carpet'
  | 'blue_carpet'
  | 'brown_carpet'
  | 'green_carpet'
  | 'red_carpet'
  | 'black_carpet'
  | 'terracotta'
  | 'packed_ice'
  | 'dirt_path'
  | 'sunflower'
  | 'lilac'
  | 'rose_bush'
  | 'peony'
  | 'tall_grass'
  | 'large_fern'
  | 'white_stained_glass'
  | 'orange_stained_glass'
  | 'magenta_stained_glass'
  | 'light_blue_stained_glass'
  | 'yellow_stained_glass'
  | 'lime_stained_glass'
  | 'pink_stained_glass'
  | 'gray_stained_glass'
  | 'light_gray_stained_glass'
  | 'cyan_stained_glass'
  | 'purple_stained_glass'
  | 'blue_stained_glass'
  | 'brown_stained_glass'
  | 'green_stained_glass'
  | 'red_stained_glass'
  | 'black_stained_glass'
  | 'white_stained_glass_pane'
  | 'orange_stained_glass_pane'
  | 'magenta_stained_glass_pane'
  | 'light_blue_stained_glass_pane'
  | 'yellow_stained_glass_pane'
  | 'lime_stained_glass_pane'
  | 'pink_stained_glass_pane'
  | 'gray_stained_glass_pane'
  | 'light_gray_stained_glass_pane'
  | 'cyan_stained_glass_pane'
  | 'purple_stained_glass_pane'
  | 'blue_stained_glass_pane'
  | 'brown_stained_glass_pane'
  | 'green_stained_glass_pane'
  | 'red_stained_glass_pane'
  | 'black_stained_glass_pane'
  | 'prismarine'
  | 'prismarine_bricks'
  | 'dark_prismarine'
  | 'prismarine_stairs'
  | 'prismarine_brick_stairs'
  | 'dark_prismarine_stairs'
  | 'sea_lantern'
  | 'red_sandstone'
  | 'chiseled_red_sandstone'
  | 'cut_red_sandstone'
  | 'red_sandstone_stairs'
  | 'repeating_command_block'
  | 'chain_command_block'
  | 'magma_block'
  | 'nether_wart_block'
  | 'warped_wart_block'
  | 'red_nether_bricks'
  | 'bone_block'
  | 'structure_void'
  | 'shulker_box'
  | 'white_shulker_box'
  | 'orange_shulker_box'
  | 'magenta_shulker_box'
  | 'light_blue_shulker_box'
  | 'yellow_shulker_box'
  | 'lime_shulker_box'
  | 'pink_shulker_box'
  | 'gray_shulker_box'
  | 'light_gray_shulker_box'
  | 'cyan_shulker_box'
  | 'purple_shulker_box'
  | 'blue_shulker_box'
  | 'brown_shulker_box'
  | 'green_shulker_box'
  | 'red_shulker_box'
  | 'black_shulker_box'
  | 'white_glazed_terracotta'
  | 'orange_glazed_terracotta'
  | 'magenta_glazed_terracotta'
  | 'light_blue_glazed_terracotta'
  | 'yellow_glazed_terracotta'
  | 'lime_glazed_terracotta'
  | 'pink_glazed_terracotta'
  | 'gray_glazed_terracotta'
  | 'light_gray_glazed_terracotta'
  | 'cyan_glazed_terracotta'
  | 'purple_glazed_terracotta'
  | 'blue_glazed_terracotta'
  | 'brown_glazed_terracotta'
  | 'green_glazed_terracotta'
  | 'red_glazed_terracotta'
  | 'black_glazed_terracotta'
  | 'white_concrete'
  | 'orange_concrete'
  | 'magenta_concrete'
  | 'light_blue_concrete'
  | 'yellow_concrete'
  | 'lime_concrete'
  | 'pink_concrete'
  | 'gray_concrete'
  | 'light_gray_concrete'
  | 'cyan_concrete'
  | 'purple_concrete'
  | 'blue_concrete'
  | 'brown_concrete'
  | 'green_concrete'
  | 'red_concrete'
  | 'black_concrete'
  | 'white_concrete_powder'
  | 'orange_concrete_powder'
  | 'magenta_concrete_powder'
  | 'light_blue_concrete_powder'
  | 'yellow_concrete_powder'
  | 'lime_concrete_powder'
  | 'pink_concrete_powder'
  | 'gray_concrete_powder'
  | 'light_gray_concrete_powder'
  | 'cyan_concrete_powder'
  | 'purple_concrete_powder'
  | 'blue_concrete_powder'
  | 'brown_concrete_powder'
  | 'green_concrete_powder'
  | 'red_concrete_powder'
  | 'black_concrete_powder'
  | 'turtle_egg'
  | 'sniffer_egg'
  | 'dead_tube_coral_block'
  | 'dead_brain_coral_block'
  | 'dead_bubble_coral_block'
  | 'dead_fire_coral_block'
  | 'dead_horn_coral_block'
  | 'tube_coral_block'
  | 'brain_coral_block'
  | 'bubble_coral_block'
  | 'fire_coral_block'
  | 'horn_coral_block'
  | 'tube_coral'
  | 'brain_coral'
  | 'bubble_coral'
  | 'fire_coral'
  | 'horn_coral'
  | 'dead_brain_coral'
  | 'dead_bubble_coral'
  | 'dead_fire_coral'
  | 'dead_horn_coral'
  | 'dead_tube_coral'
  | 'tube_coral_fan'
  | 'brain_coral_fan'
  | 'bubble_coral_fan'
  | 'fire_coral_fan'
  | 'horn_coral_fan'
  | 'dead_tube_coral_fan'
  | 'dead_brain_coral_fan'
  | 'dead_bubble_coral_fan'
  | 'dead_fire_coral_fan'
  | 'dead_horn_coral_fan'
  | 'blue_ice'
  | 'conduit'
  | 'polished_granite_stairs'
  | 'smooth_red_sandstone_stairs'
  | 'mossy_stone_brick_stairs'
  | 'polished_diorite_stairs'
  | 'mossy_cobblestone_stairs'
  | 'end_stone_brick_stairs'
  | 'stone_stairs'
  | 'smooth_sandstone_stairs'
  | 'smooth_quartz_stairs'
  | 'granite_stairs'
  | 'andesite_stairs'
  | 'red_nether_brick_stairs'
  | 'polished_andesite_stairs'
  | 'diorite_stairs'
  | 'cobbled_deepslate_stairs'
  | 'polished_deepslate_stairs'
  | 'deepslate_brick_stairs'
  | 'deepslate_tile_stairs'
  | 'polished_granite_slab'
  | 'smooth_red_sandstone_slab'
  | 'mossy_stone_brick_slab'
  | 'polished_diorite_slab'
  | 'mossy_cobblestone_slab'
  | 'end_stone_brick_slab'
  | 'smooth_sandstone_slab'
  | 'smooth_quartz_slab'
  | 'granite_slab'
  | 'andesite_slab'
  | 'red_nether_brick_slab'
  | 'polished_andesite_slab'
  | 'diorite_slab'
  | 'cobbled_deepslate_slab'
  | 'polished_deepslate_slab'
  | 'deepslate_brick_slab'
  | 'deepslate_tile_slab'
  | 'scaffolding'
  | 'redstone'
  | 'redstone_torch'
  | 'redstone_block'
  | 'repeater'
  | 'comparator'
  | 'piston'
  | 'sticky_piston'
  | 'slime_block'
  | 'honey_block'
  | 'observer'
  | 'hopper'
  | 'dispenser'
  | 'dropper'
  | 'lectern'
  | 'target'
  | 'lever'
  | 'lightning_rod'
  | 'daylight_detector'
  | 'sculk_sensor'
  | 'calibrated_sculk_sensor'
  | 'tripwire_hook'
  | 'trapped_chest'
  | 'tnt'
  | 'redstone_lamp'
  | 'note_block'
  | 'stone_button'
  | 'polished_blackstone_button'
  | 'oak_button'
  | 'spruce_button'
  | 'birch_button'
  | 'jungle_button'
  | 'acacia_button'
  | 'cherry_button'
  | 'dark_oak_button'
  | 'mangrove_button'
  | 'bamboo_button'
  | 'crimson_button'
  | 'warped_button'
  | 'stone_pressure_plate'
  | 'polished_blackstone_pressure_plate'
  | 'light_weighted_pressure_plate'
  | 'heavy_weighted_pressure_plate'
  | 'oak_pressure_plate'
  | 'spruce_pressure_plate'
  | 'birch_pressure_plate'
  | 'jungle_pressure_plate'
  | 'acacia_pressure_plate'
  | 'cherry_pressure_plate'
  | 'dark_oak_pressure_plate'
  | 'mangrove_pressure_plate'
  | 'bamboo_pressure_plate'
  | 'crimson_pressure_plate'
  | 'warped_pressure_plate'
  | 'iron_door'
  | 'oak_door'
  | 'spruce_door'
  | 'birch_door'
  | 'jungle_door'
  | 'acacia_door'
  | 'cherry_door'
  | 'dark_oak_door'
  | 'mangrove_door'
  | 'bamboo_door'
  | 'crimson_door'
  | 'warped_door'
  | 'iron_trapdoor'
  | 'oak_trapdoor'
  | 'spruce_trapdoor'
  | 'birch_trapdoor'
  | 'jungle_trapdoor'
  | 'acacia_trapdoor'
  | 'cherry_trapdoor'
  | 'dark_oak_trapdoor'
  | 'mangrove_trapdoor'
  | 'bamboo_trapdoor'
  | 'crimson_trapdoor'
  | 'warped_trapdoor'
  | 'oak_fence_gate'
  | 'spruce_fence_gate'
  | 'birch_fence_gate'
  | 'jungle_fence_gate'
  | 'acacia_fence_gate'
  | 'cherry_fence_gate'
  | 'dark_oak_fence_gate'
  | 'mangrove_fence_gate'
  | 'bamboo_fence_gate'
  | 'crimson_fence_gate'
  | 'warped_fence_gate'
  | 'powered_rail'
  | 'detector_rail'
  | 'rail'
  | 'activator_rail'
  | 'saddle'
  | 'minecart'
  | 'chest_minecart'
  | 'furnace_minecart'
  | 'tnt_minecart'
  | 'hopper_minecart'
  | 'carrot_on_a_stick'
  | 'warped_fungus_on_a_stick'
  | 'elytra'
  | 'oak_boat'
  | 'oak_chest_boat'
  | 'spruce_boat'
  | 'spruce_chest_boat'
  | 'birch_boat'
  | 'birch_chest_boat'
  | 'jungle_boat'
  | 'jungle_chest_boat'
  | 'acacia_boat'
  | 'acacia_chest_boat'
  | 'cherry_boat'
  | 'cherry_chest_boat'
  | 'dark_oak_boat'
  | 'dark_oak_chest_boat'
  | 'mangrove_boat'
  | 'mangrove_chest_boat'
  | 'bamboo_raft'
  | 'bamboo_chest_raft'
  | 'structure_block'
  | 'jigsaw'
  | 'turtle_helmet'
  | 'scute'
  | 'flint_and_steel'
  | 'apple'
  | 'bow'
  | 'arrow'
  | 'coal'
  | 'charcoal'
  | 'diamond'
  | 'emerald'
  | 'lapis_lazuli'
  | 'quartz'
  | 'amethyst_shard'
  | 'raw_iron'
  | 'iron_ingot'
  | 'raw_copper'
  | 'copper_ingot'
  | 'raw_gold'
  | 'gold_ingot'
  | 'netherite_ingot'
  | 'netherite_scrap'
  | 'wooden_sword'
  | 'wooden_shovel'
  | 'wooden_pickaxe'
  | 'wooden_axe'
  | 'wooden_hoe'
  | 'stone_sword'
  | 'stone_shovel'
  | 'stone_pickaxe'
  | 'stone_axe'
  | 'stone_hoe'
  | 'golden_sword'
  | 'golden_shovel'
  | 'golden_pickaxe'
  | 'golden_axe'
  | 'golden_hoe'
  | 'iron_sword'
  | 'iron_shovel'
  | 'iron_pickaxe'
  | 'iron_axe'
  | 'iron_hoe'
  | 'diamond_sword'
  | 'diamond_shovel'
  | 'diamond_pickaxe'
  | 'diamond_axe'
  | 'diamond_hoe'
  | 'netherite_sword'
  | 'netherite_shovel'
  | 'netherite_pickaxe'
  | 'netherite_axe'
  | 'netherite_hoe'
  | 'stick'
  | 'bowl'
  | 'mushroom_stew'
  | 'string'
  | 'feather'
  | 'gunpowder'
  | 'wheat_seeds'
  | 'wheat'
  | 'bread'
  | 'leather_helmet'
  | 'leather_chestplate'
  | 'leather_leggings'
  | 'leather_boots'
  | 'chainmail_helmet'
  | 'chainmail_chestplate'
  | 'chainmail_leggings'
  | 'chainmail_boots'
  | 'iron_helmet'
  | 'iron_chestplate'
  | 'iron_leggings'
  | 'iron_boots'
  | 'diamond_helmet'
  | 'diamond_chestplate'
  | 'diamond_leggings'
  | 'diamond_boots'
  | 'golden_helmet'
  | 'golden_chestplate'
  | 'golden_leggings'
  | 'golden_boots'
  | 'netherite_helmet'
  | 'netherite_chestplate'
  | 'netherite_leggings'
  | 'netherite_boots'
  | 'flint'
  | 'porkchop'
  | 'cooked_porkchop'
  | 'painting'
  | 'golden_apple'
  | 'enchanted_golden_apple'
  | 'oak_sign'
  | 'spruce_sign'
  | 'birch_sign'
  | 'jungle_sign'
  | 'acacia_sign'
  | 'cherry_sign'
  | 'dark_oak_sign'
  | 'mangrove_sign'
  | 'bamboo_sign'
  | 'crimson_sign'
  | 'warped_sign'
  | 'oak_hanging_sign'
  | 'spruce_hanging_sign'
  | 'birch_hanging_sign'
  | 'jungle_hanging_sign'
  | 'acacia_hanging_sign'
  | 'cherry_hanging_sign'
  | 'dark_oak_hanging_sign'
  | 'mangrove_hanging_sign'
  | 'bamboo_hanging_sign'
  | 'crimson_hanging_sign'
  | 'warped_hanging_sign'
  | 'bucket'
  | 'water_bucket'
  | 'lava_bucket'
  | 'powder_snow_bucket'
  | 'snowball'
  | 'leather'
  | 'milk_bucket'
  | 'pufferfish_bucket'
  | 'salmon_bucket'
  | 'cod_bucket'
  | 'tropical_fish_bucket'
  | 'axolotl_bucket'
  | 'tadpole_bucket'
  | 'brick'
  | 'clay_ball'
  | 'dried_kelp_block'
  | 'paper'
  | 'book'
  | 'slime_ball'
  | 'egg'
  | 'compass'
  | 'recovery_compass'
  | 'bundle'
  | 'fishing_rod'
  | 'clock'
  | 'spyglass'
  | 'glowstone_dust'
  | 'cod'
  | 'salmon'
  | 'tropical_fish'
  | 'pufferfish'
  | 'cooked_cod'
  | 'cooked_salmon'
  | 'ink_sac'
  | 'glow_ink_sac'
  | 'cocoa_beans'
  | 'white_dye'
  | 'orange_dye'
  | 'magenta_dye'
  | 'light_blue_dye'
  | 'yellow_dye'
  | 'lime_dye'
  | 'pink_dye'
  | 'gray_dye'
  | 'light_gray_dye'
  | 'cyan_dye'
  | 'purple_dye'
  | 'blue_dye'
  | 'brown_dye'
  | 'green_dye'
  | 'red_dye'
  | 'black_dye'
  | 'bone_meal'
  | 'bone'
  | 'sugar'
  | 'cake'
  | 'white_bed'
  | 'orange_bed'
  | 'magenta_bed'
  | 'light_blue_bed'
  | 'yellow_bed'
  | 'lime_bed'
  | 'pink_bed'
  | 'gray_bed'
  | 'light_gray_bed'
  | 'cyan_bed'
  | 'purple_bed'
  | 'blue_bed'
  | 'brown_bed'
  | 'green_bed'
  | 'red_bed'
  | 'black_bed'
  | 'cookie'
  | 'filled_map'
  | 'shears'
  | 'melon_slice'
  | 'dried_kelp'
  | 'pumpkin_seeds'
  | 'melon_seeds'
  | 'beef'
  | 'cooked_beef'
  | 'chicken'
  | 'cooked_chicken'
  | 'rotten_flesh'
  | 'ender_pearl'
  | 'blaze_rod'
  | 'ghast_tear'
  | 'gold_nugget'
  | 'nether_wart'
  | 'potion'
  | 'glass_bottle'
  | 'spider_eye'
  | 'fermented_spider_eye'
  | 'blaze_powder'
  | 'magma_cream'
  | 'brewing_stand'
  | 'cauldron'
  | 'ender_eye'
  | 'glistering_melon_slice'
  | 'allay_spawn_egg'
  | 'axolotl_spawn_egg'
  | 'bat_spawn_egg'
  | 'bee_spawn_egg'
  | 'blaze_spawn_egg'
  | 'cat_spawn_egg'
  | 'camel_spawn_egg'
  | 'cave_spider_spawn_egg'
  | 'chicken_spawn_egg'
  | 'cod_spawn_egg'
  | 'cow_spawn_egg'
  | 'creeper_spawn_egg'
  | 'dolphin_spawn_egg'
  | 'donkey_spawn_egg'
  | 'drowned_spawn_egg'
  | 'elder_guardian_spawn_egg'
  | 'ender_dragon_spawn_egg'
  | 'enderman_spawn_egg'
  | 'endermite_spawn_egg'
  | 'evoker_spawn_egg'
  | 'fox_spawn_egg'
  | 'frog_spawn_egg'
  | 'ghast_spawn_egg'
  | 'glow_squid_spawn_egg'
  | 'goat_spawn_egg'
  | 'guardian_spawn_egg'
  | 'hoglin_spawn_egg'
  | 'horse_spawn_egg'
  | 'husk_spawn_egg'
  | 'iron_golem_spawn_egg'
  | 'llama_spawn_egg'
  | 'magma_cube_spawn_egg'
  | 'mooshroom_spawn_egg'
  | 'mule_spawn_egg'
  | 'ocelot_spawn_egg'
  | 'panda_spawn_egg'
  | 'parrot_spawn_egg'
  | 'phantom_spawn_egg'
  | 'pig_spawn_egg'
  | 'piglin_spawn_egg'
  | 'piglin_brute_spawn_egg'
  | 'pillager_spawn_egg'
  | 'polar_bear_spawn_egg'
  | 'pufferfish_spawn_egg'
  | 'rabbit_spawn_egg'
  | 'ravager_spawn_egg'
  | 'salmon_spawn_egg'
  | 'sheep_spawn_egg'
  | 'shulker_spawn_egg'
  | 'silverfish_spawn_egg'
  | 'skeleton_spawn_egg'
  | 'skeleton_horse_spawn_egg'
  | 'slime_spawn_egg'
  | 'sniffer_spawn_egg'
  | 'snow_golem_spawn_egg'
  | 'spider_spawn_egg'
  | 'squid_spawn_egg'
  | 'stray_spawn_egg'
  | 'strider_spawn_egg'
  | 'tadpole_spawn_egg'
  | 'trader_llama_spawn_egg'
  | 'tropical_fish_spawn_egg'
  | 'turtle_spawn_egg'
  | 'vex_spawn_egg'
  | 'villager_spawn_egg'
  | 'vindicator_spawn_egg'
  | 'wandering_trader_spawn_egg'
  | 'warden_spawn_egg'
  | 'witch_spawn_egg'
  | 'wither_spawn_egg'
  | 'wither_skeleton_spawn_egg'
  | 'wolf_spawn_egg'
  | 'zoglin_spawn_egg'
  | 'zombie_spawn_egg'
  | 'zombie_horse_spawn_egg'
  | 'zombie_villager_spawn_egg'
  | 'zombified_piglin_spawn_egg'
  | 'experience_bottle'
  | 'fire_charge'
  | 'writable_book'
  | 'written_book'
  | 'item_frame'
  | 'glow_item_frame'
  | 'flower_pot'
  | 'carrot'
  | 'potato'
  | 'baked_potato'
  | 'poisonous_potato'
  | 'map'
  | 'golden_carrot'
  | 'skeleton_skull'
  | 'wither_skeleton_skull'
  | 'player_head'
  | 'zombie_head'
  | 'creeper_head'
  | 'dragon_head'
  | 'piglin_head'
  | 'nether_star'
  | 'pumpkin_pie'
  | 'firework_rocket'
  | 'firework_star'
  | 'enchanted_book'
  | 'nether_brick'
  | 'prismarine_shard'
  | 'prismarine_crystals'
  | 'rabbit'
  | 'cooked_rabbit'
  | 'rabbit_stew'
  | 'rabbit_foot'
  | 'rabbit_hide'
  | 'armor_stand'
  | 'iron_horse_armor'
  | 'golden_horse_armor'
  | 'diamond_horse_armor'
  | 'leather_horse_armor'
  | 'lead'
  | 'name_tag'
  | 'command_block_minecart'
  | 'mutton'
  | 'cooked_mutton'
  | 'white_banner'
  | 'orange_banner'
  | 'magenta_banner'
  | 'light_blue_banner'
  | 'yellow_banner'
  | 'lime_banner'
  | 'pink_banner'
  | 'gray_banner'
  | 'light_gray_banner'
  | 'cyan_banner'
  | 'purple_banner'
  | 'blue_banner'
  | 'brown_banner'
  | 'green_banner'
  | 'red_banner'
  | 'black_banner'
  | 'end_crystal'
  | 'chorus_fruit'
  | 'popped_chorus_fruit'
  | 'torchflower_seeds'
  | 'pitcher_pod'
  | 'beetroot'
  | 'beetroot_seeds'
  | 'beetroot_soup'
  | 'dragon_breath'
  | 'splash_potion'
  | 'spectral_arrow'
  | 'tipped_arrow'
  | 'lingering_potion'
  | 'shield'
  | 'totem_of_undying'
  | 'shulker_shell'
  | 'iron_nugget'
  | 'knowledge_book'
  | 'debug_stick'
  | 'music_disc_13'
  | 'music_disc_cat'
  | 'music_disc_blocks'
  | 'music_disc_chirp'
  | 'music_disc_far'
  | 'music_disc_mall'
  | 'music_disc_mellohi'
  | 'music_disc_stal'
  | 'music_disc_strad'
  | 'music_disc_ward'
  | 'music_disc_11'
  | 'music_disc_wait'
  | 'music_disc_otherside'
  | 'music_disc_relic'
  | 'music_disc_5'
  | 'music_disc_pigstep'
  | 'disc_fragment_5'
  | 'trident'
  | 'phantom_membrane'
  | 'nautilus_shell'
  | 'heart_of_the_sea'
  | 'crossbow'
  | 'suspicious_stew'
  | 'loom'
  | 'flower_banner_pattern'
  | 'creeper_banner_pattern'
  | 'skull_banner_pattern'
  | 'mojang_banner_pattern'
  | 'globe_banner_pattern'
  | 'piglin_banner_pattern'
  | 'goat_horn'
  | 'composter'
  | 'barrel'
  | 'smoker'
  | 'blast_furnace'
  | 'cartography_table'
  | 'fletching_table'
  | 'grindstone'
  | 'smithing_table'
  | 'stonecutter'
  | 'bell'
  | 'lantern'
  | 'soul_lantern'
  | 'sweet_berries'
  | 'glow_berries'
  | 'campfire'
  | 'soul_campfire'
  | 'shroomlight'
  | 'honeycomb'
  | 'bee_nest'
  | 'beehive'
  | 'honey_bottle'
  | 'honeycomb_block'
  | 'lodestone'
  | 'crying_obsidian'
  | 'blackstone'
  | 'blackstone_slab'
  | 'blackstone_stairs'
  | 'gilded_blackstone'
  | 'polished_blackstone'
  | 'polished_blackstone_slab'
  | 'polished_blackstone_stairs'
  | 'chiseled_polished_blackstone'
  | 'polished_blackstone_bricks'
  | 'polished_blackstone_brick_slab'
  | 'polished_blackstone_brick_stairs'
  | 'cracked_polished_blackstone_bricks'
  | 'respawn_anchor'
  | 'candle'
  | 'white_candle'
  | 'orange_candle'
  | 'magenta_candle'
  | 'light_blue_candle'
  | 'yellow_candle'
  | 'lime_candle'
  | 'pink_candle'
  | 'gray_candle'
  | 'light_gray_candle'
  | 'cyan_candle'
  | 'purple_candle'
  | 'blue_candle'
  | 'brown_candle'
  | 'green_candle'
  | 'red_candle'
  | 'black_candle'
  | 'small_amethyst_bud'
  | 'medium_amethyst_bud'
  | 'large_amethyst_bud'
  | 'amethyst_cluster'
  | 'pointed_dripstone'
  | 'ochre_froglight'
  | 'verdant_froglight'
  | 'pearlescent_froglight'
  | 'frogspawn'
  | 'echo_shard'
  | 'brush'
  | 'netherite_upgrade_smithing_template'
  | 'sentry_armor_trim_smithing_template'
  | 'dune_armor_trim_smithing_template'
  | 'coast_armor_trim_smithing_template'
  | 'wild_armor_trim_smithing_template'
  | 'ward_armor_trim_smithing_template'
  | 'eye_armor_trim_smithing_template'
  | 'vex_armor_trim_smithing_template'
  | 'tide_armor_trim_smithing_template'
  | 'snout_armor_trim_smithing_template'
  | 'rib_armor_trim_smithing_template'
  | 'spire_armor_trim_smithing_template'
  | 'wayfinder_armor_trim_smithing_template'
  | 'shaper_armor_trim_smithing_template'
  | 'silence_armor_trim_smithing_template'
  | 'raiser_armor_trim_smithing_template'
  | 'host_armor_trim_smithing_template'
  | 'angler_pottery_sherd'
  | 'archer_pottery_sherd'
  | 'arms_up_pottery_sherd'
  | 'blade_pottery_sherd'
  | 'brewer_pottery_sherd'
  | 'burn_pottery_sherd'
  | 'danger_pottery_sherd'
  | 'explorer_pottery_sherd'
  | 'friend_pottery_sherd'
  | 'heart_pottery_sherd'
  | 'heartbreak_pottery_sherd'
  | 'howl_pottery_sherd'
  | 'miner_pottery_sherd'
  | 'mourner_pottery_sherd'
  | 'plenty_pottery_sherd'
  | 'prize_pottery_sherd'
  | 'sheaf_pottery_sherd'
  | 'shelter_pottery_sherd'
  | 'skull_pottery_sherd'
  | 'snort_pottery_sherd'
export type EntityNames =
  | 'allay'
  | 'area_effect_cloud'
  | 'armor_stand'
  | 'arrow'
  | 'axolotl'
  | 'bat'
  | 'bee'
  | 'blaze'
  | 'block_display'
  | 'boat'
  | 'camel'
  | 'cat'
  | 'cave_spider'
  | 'chest_boat'
  | 'chest_minecart'
  | 'chicken'
  | 'cod'
  | 'command_block_minecart'
  | 'cow'
  | 'creeper'
  | 'dolphin'
  | 'donkey'
  | 'dragon_fireball'
  | 'drowned'
  | 'egg'
  | 'elder_guardian'
  | 'end_crystal'
  | 'ender_dragon'
  | 'ender_pearl'
  | 'enderman'
  | 'endermite'
  | 'evoker'
  | 'evoker_fangs'
  | 'experience_bottle'
  | 'experience_orb'
  | 'eye_of_ender'
  | 'falling_block'
  | 'firework_rocket'
  | 'fox'
  | 'frog'
  | 'furnace_minecart'
  | 'ghast'
  | 'giant'
  | 'glow_item_frame'
  | 'glow_squid'
  | 'goat'
  | 'guardian'
  | 'hoglin'
  | 'hopper_minecart'
  | 'horse'
  | 'husk'
  | 'illusioner'
  | 'interaction'
  | 'iron_golem'
  | 'item'
  | 'item_display'
  | 'item_frame'
  | 'fireball'
  | 'leash_knot'
  | 'lightning_bolt'
  | 'llama'
  | 'llama_spit'
  | 'magma_cube'
  | 'marker'
  | 'minecart'
  | 'mooshroom'
  | 'mule'
  | 'ocelot'
  | 'painting'
  | 'panda'
  | 'parrot'
  | 'phantom'
  | 'pig'
  | 'piglin'
  | 'piglin_brute'
  | 'pillager'
  | 'polar_bear'
  | 'potion'
  | 'pufferfish'
  | 'rabbit'
  | 'ravager'
  | 'salmon'
  | 'sheep'
  | 'shulker'
  | 'shulker_bullet'
  | 'silverfish'
  | 'skeleton'
  | 'skeleton_horse'
  | 'slime'
  | 'small_fireball'
  | 'sniffer'
  | 'snow_golem'
  | 'snowball'
  | 'spawner_minecart'
  | 'spectral_arrow'
  | 'spider'
  | 'squid'
  | 'stray'
  | 'strider'
  | 'tadpole'
  | 'text_display'
  | 'tnt'
  | 'tnt_minecart'
  | 'trader_llama'
  | 'trident'
  | 'tropical_fish'
  | 'turtle'
  | 'vex'
  | 'villager'
  | 'vindicator'
  | 'wandering_trader'
  | 'warden'
  | 'witch'
  | 'wither'
  | 'wither_skeleton'
  | 'wither_skull'
  | 'wolf'
  | 'zoglin'
  | 'zombie'
  | 'zombie_horse'
  | 'zombie_villager'
  | 'zombified_piglin'
  | 'player'
  | 'fishing_bobber'
export type BiomesNames =
  | 'badlands'
  | 'bamboo_jungle'
  | 'basalt_deltas'
  | 'beach'
  | 'birch_forest'
  | 'cherry_grove'
  | 'cold_ocean'
  | 'crimson_forest'
  | 'dark_forest'
  | 'deep_cold_ocean'
  | 'deep_dark'
  | 'deep_frozen_ocean'
  | 'deep_lukewarm_ocean'
  | 'deep_ocean'
  | 'desert'
  | 'dripstone_caves'
  | 'end_barrens'
  | 'end_highlands'
  | 'end_midlands'
  | 'eroded_badlands'
  | 'flower_forest'
  | 'forest'
  | 'frozen_ocean'
  | 'frozen_peaks'
  | 'frozen_river'
  | 'grove'
  | 'ice_spikes'
  | 'jagged_peaks'
  | 'jungle'
  | 'lukewarm_ocean'
  | 'lush_caves'
  | 'mangrove_swamp'
  | 'meadow'
  | 'mushroom_fields'
  | 'nether_wastes'
  | 'ocean'
  | 'old_growth_birch_forest'
  | 'old_growth_pine_taiga'
  | 'old_growth_spruce_taiga'
  | 'plains'
  | 'river'
  | 'savanna'
  | 'savanna_plateau'
  | 'small_end_islands'
  | 'snowy_beach'
  | 'snowy_plains'
  | 'snowy_slopes'
  | 'snowy_taiga'
  | 'soul_sand_valley'
  | 'sparse_jungle'
  | 'stony_peaks'
  | 'stony_shore'
  | 'sunflower_plains'
  | 'swamp'
  | 'taiga'
  | 'the_end'
  | 'the_void'
  | 'warm_ocean'
  | 'warped_forest'
  | 'windswept_forest'
  | 'windswept_gravelly_hills'
  | 'windswept_hills'
  | 'windswept_savanna'
  | 'wooded_badlands'
export type EnchantmentNames =
  | 'protection'
  | 'fire_protection'
  | 'feather_falling'
  | 'blast_protection'
  | 'projectile_protection'
  | 'respiration'
  | 'aqua_affinity'
  | 'thorns'
  | 'depth_strider'
  | 'frost_walker'
  | 'binding_curse'
  | 'soul_speed'
  | 'swift_sneak'
  | 'sharpness'
  | 'smite'
  | 'bane_of_arthropods'
  | 'knockback'
  | 'fire_aspect'
  | 'looting'
  | 'sweeping'
  | 'efficiency'
  | 'silk_touch'
  | 'unbreaking'
  | 'fortune'
  | 'power'
  | 'punch'
  | 'flame'
  | 'infinity'
  | 'luck_of_the_sea'
  | 'lure'
  | 'loyalty'
  | 'impaling'
  | 'riptide'
  | 'channeling'
  | 'multishot'
  | 'quick_charge'
  | 'piercing'
  | 'mending'
  | 'vanishing_curse'

export type EntityMetadataVersions = {
  Mob: {}
  Monster: {}
  Creeper: {}
  Skeleton: {}
  Spider: {}
  Giant: {}
  Zombie: {}
  Slime: {}
  Ghast: {}
  PigZombie: {}
  Enderman: {}
  CaveSpider: {}
  Silverfish: {}
  Blaze: {}
  LavaSlime: {}
  EnderDragon: {}
  WitherBoss: {}
  Bat: {}
  Witch: {}
  Endermite: {}
  Guardian: {}
  Pig: {}
  Sheep: {}
  Cow: {}
  Chicken: {}
  Squid: {}
  Wolf: {}
  MushroomCow: {}
  SnowMan: {}
  Ozelot: {}
  VillagerGolem: {}
  EntityHorse: {}
  Rabbit: {}
  Villager: {}
  Boat: {}
  Item: {}
  MinecartRideable: {}
  PrimedTnt: {}
  EnderCrystal: {}
  Arrow: {}
  Snowball: {}
  ThrownEgg: {}
  Fireball: {}
  SmallFireball: {}
  ThrownEnderpearl: {}
  WitherSkull: {}
  FallingSand: {}
  ItemFrame: {}
  EyeOfEnderSignal: {}
  ThrownPotion: {}
  ThrownExpBottle: {}
  FireworksRocketEntity: {}
  LeashKnot: {}
  ArmorStand: {}
  'Fishing Float': {}
  Shulker: {}
  XPOrb: {}
  'Dragon Fireball': {}
  item: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    item: string
  }
  xp_orb: {}
  area_effect_cloud: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    radius: string
    /** 1.19.4+ (9) */
    color: string
    /** 1.19.4+ (10) */
    waiting: string
    /** 1.19.4+ (11) */
    particle: string
  }
  elder_guardian: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    moving: string
    /** 1.19.4+ (17) */
    attack_target: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  wither_skeleton: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  stray: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  egg: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    item_stack: string
  }
  leash_knot: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
  }
  painting: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    painting_variant: string
  }
  arrow: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    flags: string
    /** 1.19.4+ (9) */
    pierce_level: string
    /** 1.19.4+ (10) */
    effect_color: string
  }
  snowball: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    item_stack: string
  }
  fireball: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    item_stack: string
  }
  small_fireball: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    item_stack: string
  }
  ender_pearl: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    item_stack: string
  }
  eye_of_ender_signal: {}
  potion: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    item_stack: string
  }
  xp_bottle: {}
  item_frame: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    item: string
    /** 1.19.4+ (9) */
    rotation: string
  }
  wither_skull: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    dangerous: string
  }
  tnt: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    fuse: string
    /** 1.20.3+ (9) */
    block_state: string
  }
  falling_block: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    start_pos: string
  }
  fireworks_rocket: {}
  husk: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.19.4+ (17) */
    special_type: string
    /** 1.19.4+ (18) */
    drowned_conversion: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  spectral_arrow: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    flags: string
    /** 1.19.4+ (9) */
    pierce_level: string
  }
  shulker_bullet: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
  }
  dragon_fireball: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
  }
  zombie_villager: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.19.4+ (17) */
    special_type: string
    /** 1.19.4+ (18) */
    drowned_conversion: string
    /** 1.19.4+ (19) */
    converting: string
    /** 1.19.4+ (20) */
    villager_data: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  skeleton_horse: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.19.4+ (17) */
    flags: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  zombie_horse: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.19.4+ (17) */
    flags: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  armor_stand: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    client_flags: string
    /** 1.19.4+ (16) */
    head_pose: string
    /** 1.19.4+ (17) */
    body_pose: string
    /** 1.19.4+ (18) */
    left_arm_pose: string
    /** 1.19.4+ (19) */
    right_arm_pose: string
    /** 1.19.4+ (20) */
    left_leg_pose: string
    /** 1.19.4+ (21) */
    right_leg_pose: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  donkey: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.19.4+ (17) */
    flags: string
    /** 1.19.4+ (18) */
    chest: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  mule: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.19.4+ (17) */
    flags: string
    /** 1.19.4+ (18) */
    chest: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  evocation_fangs: {}
  evocation_illager: {}
  vex: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    flags: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  vindication_illager: {}
  commandblock_minecart: {}
  boat: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    hurt: string
    /** 1.19.4+ (9) */
    hurtdir: string
    /** 1.19.4+ (10) */
    damage: string
    /** 1.19.4+ (11) */
    type: string
    /** 1.19.4+ (12) */
    paddle_left: string
    /** 1.19.4+ (13) */
    paddle_right: string
    /** 1.19.4+ (14) */
    bubble_time: string
  }
  minecart: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    hurt: string
    /** 1.19.4+ (9) */
    hurtdir: string
    /** 1.19.4+ (10) */
    damage: string
    /** 1.19.4+ (11) */
    display_block: string
    /** 1.19.4+ (12) */
    display_offset: string
    /** 1.19.4+ (13) */
    custom_display: string
  }
  chest_minecart: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    hurt: string
    /** 1.19.4+ (9) */
    hurtdir: string
    /** 1.19.4+ (10) */
    damage: string
    /** 1.19.4+ (11) */
    display_block: string
    /** 1.19.4+ (12) */
    display_offset: string
    /** 1.19.4+ (13) */
    custom_display: string
  }
  furnace_minecart: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    hurt: string
    /** 1.19.4+ (9) */
    hurtdir: string
    /** 1.19.4+ (10) */
    damage: string
    /** 1.19.4+ (11) */
    display_block: string
    /** 1.19.4+ (12) */
    display_offset: string
    /** 1.19.4+ (13) */
    custom_display: string
    /** 1.19.4+ (14) */
    fuel: string
  }
  tnt_minecart: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    hurt: string
    /** 1.19.4+ (9) */
    hurtdir: string
    /** 1.19.4+ (10) */
    damage: string
    /** 1.19.4+ (11) */
    display_block: string
    /** 1.19.4+ (12) */
    display_offset: string
    /** 1.19.4+ (13) */
    custom_display: string
  }
  hopper_minecart: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    hurt: string
    /** 1.19.4+ (9) */
    hurtdir: string
    /** 1.19.4+ (10) */
    damage: string
    /** 1.19.4+ (11) */
    display_block: string
    /** 1.19.4+ (12) */
    display_offset: string
    /** 1.19.4+ (13) */
    custom_display: string
  }
  spawner_minecart: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    hurt: string
    /** 1.19.4+ (9) */
    hurtdir: string
    /** 1.19.4+ (10) */
    damage: string
    /** 1.19.4+ (11) */
    display_block: string
    /** 1.19.4+ (12) */
    display_offset: string
    /** 1.19.4+ (13) */
    custom_display: string
  }
  creeper: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    swell_dir: string
    /** 1.19.4+ (17) */
    is_powered: string
    /** 1.19.4+ (18) */
    is_ignited: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  skeleton: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    stray_conversion: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  spider: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    flags: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  giant: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  zombie: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.19.4+ (17) */
    special_type: string
    /** 1.19.4+ (18) */
    drowned_conversion: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  slime: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    size: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  ghast: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    is_charging: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  zombie_pigman: {}
  enderman: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    carry_state: string
    /** 1.19.4+ (17) */
    creepy: string
    /** 1.19.4+ (18) */
    stared_at: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  cave_spider: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    flags: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  silverfish: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  blaze: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    flags: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  magma_cube: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    size: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  ender_dragon: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    phase: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  wither: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    target_a: string
    /** 1.19.4+ (17) */
    target_b: string
    /** 1.19.4+ (18) */
    target_c: string
    /** 1.19.4+ (19) */
    inv: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  bat: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    flags: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  witch: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    is_celebrating: string
    /** 1.19.4+ (17) */
    using_item: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  endermite: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  guardian: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    moving: string
    /** 1.19.4+ (17) */
    attack_target: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  shulker: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    attach_face: string
    /** 1.19.4+ (17) */
    peek: string
    /** 1.19.4+ (18) */
    color: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  pig: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.19.4+ (17) */
    saddle: string
    /** 1.19.4+ (18) */
    boost_time: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  sheep: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.19.4+ (17) */
    wool: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  cow: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  chicken: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  squid: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  wolf: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.19.4+ (17) */
    flags: string
    /** 1.19.4+ (18) */
    owneruuid: string
    /** 1.19.4+ (19) */
    interested: string
    /** 1.19.4+ (20) */
    collar_color: string
    /** 1.19.4+ (21) */
    remaining_anger_time: string
    /** 1.20.5+ (10) */
    effect_particles: string
    /** 1.20.5+ (22) */
    variant: string
  }
  mooshroom: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.19.4+ (17) */
    type: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  snowman: {}
  ocelot: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.19.4+ (17) */
    trusting: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  villager_golem: {}
  horse: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.19.4+ (17) */
    flags: string
    /** 1.19.4+ (18) */
    type_variant: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  rabbit: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.19.4+ (17) */
    type: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  polar_bear: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.19.4+ (17) */
    standing: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  llama: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.19.4+ (17) */
    flags: string
    /** 1.19.4+ (18) */
    chest: string
    /** 1.19.4+ (19) */
    strength: string
    /** 1.19.4+ (20) */
    swag: string
    /** 1.19.4+ (21) */
    variant: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  llama_spit: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
  }
  villager: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.19.4+ (17) */
    unhappy_counter: string
    /** 1.19.4+ (18) */
    villager_data: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  ender_crystal: {}
  'Fishing Hook': {}
  illusion_illager: {}
  parrot: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.19.4+ (17) */
    flags: string
    /** 1.19.4+ (18) */
    owneruuid: string
    /** 1.19.4+ (19) */
    variant: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  cod: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    from_bucket: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  dolphin: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    treasure_pos: string
    /** 1.19.4+ (17) */
    got_fish: string
    /** 1.19.4+ (18) */
    moistness_level: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  drowned: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.19.4+ (17) */
    special_type: string
    /** 1.19.4+ (18) */
    drowned_conversion: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  end_crystal: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    beam_target: string
    /** 1.19.4+ (9) */
    show_bottom: string
  }
  evoker_fangs: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
  }
  evoker: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    is_celebrating: string
    /** 1.19.4+ (17) */
    spell_casting: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  experience_orb: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
  }
  eye_of_ender: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    item_stack: string
  }
  illusioner: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    is_celebrating: string
    /** 1.19.4+ (17) */
    spell_casting: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  pufferfish: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    from_bucket: string
    /** 1.19.4+ (17) */
    puff_state: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  salmon: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    from_bucket: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  snow_golem: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    pumpkin: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  tropical_fish: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    from_bucket: string
    /** 1.19.4+ (17) */
    type_variant: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  turtle: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.19.4+ (17) */
    home_pos: string
    /** 1.19.4+ (18) */
    has_egg: string
    /** 1.19.4+ (19) */
    laying_egg: string
    /** 1.19.4+ (20) */
    travel_pos: string
    /** 1.19.4+ (21) */
    going_home: string
    /** 1.19.4+ (22) */
    travelling: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  experience_bottle: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    item_stack: string
  }
  'iron_golem}': {}
  vindicator: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    is_celebrating: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  phantom: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    size: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  lightning_bolt: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
  }
  player: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    player_absorption: string
    /** 1.19.4+ (16) */
    score: string
    /** 1.19.4+ (17) */
    player_mode_customisation: string
    /** 1.19.4+ (18) */
    player_main_hand: string
    /** 1.19.4+ (19) */
    shoulder_left: string
    /** 1.19.4+ (20) */
    shoulder_right: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  fishing_bobber: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    hooked_entity: string
    /** 1.19.4+ (9) */
    biting: string
  }
  trident: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    flags: string
    /** 1.19.4+ (9) */
    pierce_level: string
    /** 1.19.4+ (10) */
    loyalty: string
    /** 1.19.4+ (11) */
    foil: string
  }
  item_stack: {}
  'area_effect cloud': {}
  activated_tnt: {}
  endercrystal: {}
  tipped_arrow: {}
  firecharge: {}
  thrown_enderpearl: {}
  falling_objects: {}
  item_frames: {}
  'eye_of ender': {}
  thrown_potion: {}
  'thrown_exp bottle': {}
  firework_rocket: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    fireworks_item: string
    /** 1.19.4+ (9) */
    attached_to_target: string
    /** 1.19.4+ (10) */
    shot_at_angle: string
  }
  armorstand: {}
  fishing_hook: {}
  cat: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.19.4+ (17) */
    flags: string
    /** 1.19.4+ (18) */
    owneruuid: string
    /** 1.19.4+ (19) */
    variant: string
    /** 1.19.4+ (20) */
    is_lying: string
    /** 1.19.4+ (21) */
    relax_state_one: string
    /** 1.19.4+ (22) */
    collar_color: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  fox: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.19.4+ (17) */
    type: string
    /** 1.19.4+ (18) */
    flags: string
    /** 1.19.4+ (19) */
    trusted_0: string
    /** 1.19.4+ (20) */
    trusted_1: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  command_block_minecart: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    hurt: string
    /** 1.19.4+ (9) */
    hurtdir: string
    /** 1.19.4+ (10) */
    damage: string
    /** 1.19.4+ (11) */
    display_block: string
    /** 1.19.4+ (12) */
    display_offset: string
    /** 1.19.4+ (13) */
    custom_display: string
    /** 1.19.4+ (14) */
    command_name: string
    /** 1.19.4+ (15) */
    last_output: string
  }
  panda: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.19.4+ (17) */
    unhappy_counter: string
    /** 1.19.4+ (18) */
    sneeze_counter: string
    /** 1.19.4+ (19) */
    eat_counter: string
    /** 1.19.4+ (20) */
    main_gene: string
    /** 1.19.4+ (21) */
    hidden_gene: string
    /** 1.19.4+ (22) */
    flags: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  trader_llama: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.19.4+ (17) */
    flags: string
    /** 1.19.4+ (18) */
    chest: string
    /** 1.19.4+ (19) */
    strength: string
    /** 1.19.4+ (20) */
    swag: string
    /** 1.19.4+ (21) */
    variant: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  iron_golem: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    flags: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  pillager: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    is_celebrating: string
    /** 1.19.4+ (17) */
    is_charging_crossbow: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  wandering_trader: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.19.4+ (17) */
    unhappy_counter: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  ravager: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    is_celebrating: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  bee: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.19.4+ (17) */
    flags: string
    /** 1.19.4+ (18) */
    remaining_anger_time: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  hoglin: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.19.4+ (17) */
    immune_to_zombification: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  piglin: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    immune_to_zombification: string
    /** 1.19.4+ (17) */
    baby: string
    /** 1.19.4+ (18) */
    is_charging_crossbow: string
    /** 1.19.4+ (19) */
    is_dancing: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  strider: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.19.4+ (17) */
    boost_time: string
    /** 1.19.4+ (18) */
    suffocating: string
    /** 1.19.4+ (19) */
    saddle: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  zoglin: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  zombified_piglin: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.19.4+ (17) */
    special_type: string
    /** 1.19.4+ (18) */
    drowned_conversion: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  piglin_brute: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    immune_to_zombification: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  axolotl: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.19.4+ (17) */
    variant: string
    /** 1.19.4+ (18) */
    playing_dead: string
    /** 1.19.4+ (19) */
    from_bucket: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  glow_item_frame: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    item: string
    /** 1.19.4+ (9) */
    rotation: string
  }
  glow_squid: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    dark_ticks_remaining: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  goat: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.19.4+ (17) */
    is_screaming_goat: string
    /** 1.19.4+ (18) */
    has_left_horn: string
    /** 1.19.4+ (19) */
    has_right_horn: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  marker: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
  }
  allay: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    dancing: string
    /** 1.19.4+ (17) */
    can_duplicate: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  chest_boat: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    hurt: string
    /** 1.19.4+ (9) */
    hurtdir: string
    /** 1.19.4+ (10) */
    damage: string
    /** 1.19.4+ (11) */
    type: string
    /** 1.19.4+ (12) */
    paddle_left: string
    /** 1.19.4+ (13) */
    paddle_right: string
    /** 1.19.4+ (14) */
    bubble_time: string
  }
  frog: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.19.4+ (17) */
    variant: string
    /** 1.19.4+ (18) */
    tongue_target: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  tadpole: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    from_bucket: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  warden: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    client_anger_level: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  camel: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.19.4+ (17) */
    flags: string
    /** 1.19.4+ (18) */
    dash: string
    /** 1.19.4+ (19) */
    last_pose_change_tick: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  block_display: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    interpolation_start_delta_ticks: string
    /** 1.19.4+ (9) */
    interpolation_duration: string
    /** 1.19.4+ (10) */
    translation: string
    /** 1.19.4+ (11) */
    scale: string
    /** 1.19.4+ (12) */
    left_rotation: string
    /** 1.19.4+ (13) */
    right_rotation: string
    /** 1.19.4+ (14) */
    billboard_render_constraints: string
    /** 1.19.4+ (15) */
    brightness_override: string
    /** 1.19.4+ (16) */
    view_range: string
    /** 1.19.4+ (17) */
    shadow_radius: string
    /** 1.19.4+ (18) */
    shadow_strength: string
    /** 1.19.4+ (19) */
    width: string
    /** 1.19.4+ (20) */
    height: string
    /** 1.19.4+ (21) */
    glow_color_override: string
    /** 1.19.4+ (22) */
    block_state: string
    /** 1.20.2+ (8) */
    transformation_interpolation_start_delta_ticks: string
    /** 1.20.2+ (9) */
    transformation_interpolation_duration: string
    /** 1.20.2+ (10) */
    pos_rot_interpolation_duration: string
  }
  interaction: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    width: string
    /** 1.19.4+ (9) */
    height: string
    /** 1.19.4+ (10) */
    response: string
  }
  item_display: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    interpolation_start_delta_ticks: string
    /** 1.19.4+ (9) */
    interpolation_duration: string
    /** 1.19.4+ (10) */
    translation: string
    /** 1.19.4+ (11) */
    scale: string
    /** 1.19.4+ (12) */
    left_rotation: string
    /** 1.19.4+ (13) */
    right_rotation: string
    /** 1.19.4+ (14) */
    billboard_render_constraints: string
    /** 1.19.4+ (15) */
    brightness_override: string
    /** 1.19.4+ (16) */
    view_range: string
    /** 1.19.4+ (17) */
    shadow_radius: string
    /** 1.19.4+ (18) */
    shadow_strength: string
    /** 1.19.4+ (19) */
    width: string
    /** 1.19.4+ (20) */
    height: string
    /** 1.19.4+ (21) */
    glow_color_override: string
    /** 1.19.4+ (22) */
    item_stack: string
    /** 1.19.4+ (23) */
    item_display: string
    /** 1.20.2+ (8) */
    transformation_interpolation_start_delta_ticks: string
    /** 1.20.2+ (9) */
    transformation_interpolation_duration: string
    /** 1.20.2+ (10) */
    pos_rot_interpolation_duration: string
  }
  sniffer: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    living_entity_flags: string
    /** 1.19.4+ (9) */
    health: string
    /** 1.19.4+ (10) */
    effect_color: string
    /** 1.19.4+ (11) */
    effect_ambience: string
    /** 1.19.4+ (12) */
    arrow_count: string
    /** 1.19.4+ (13) */
    stinger_count: string
    /** 1.19.4+ (14) */
    sleeping_pos: string
    /** 1.19.4+ (15) */
    mob_flags: string
    /** 1.19.4+ (16) */
    baby: string
    /** 1.19.4+ (17) */
    state: string
    /** 1.19.4+ (18) */
    drop_seed_at_tick: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  text_display: {
    /** 1.19.4+ (0) */
    shared_flags: string
    /** 1.19.4+ (1) */
    air_supply: string
    /** 1.19.4+ (2) */
    custom_name: string
    /** 1.19.4+ (3) */
    custom_name_visible: string
    /** 1.19.4+ (4) */
    silent: string
    /** 1.19.4+ (5) */
    no_gravity: string
    /** 1.19.4+ (6) */
    pose: string
    /** 1.19.4+ (7) */
    ticks_frozen: string
    /** 1.19.4+ (8) */
    interpolation_start_delta_ticks: string
    /** 1.19.4+ (9) */
    interpolation_duration: string
    /** 1.19.4+ (10) */
    translation: string
    /** 1.19.4+ (11) */
    scale: string
    /** 1.19.4+ (12) */
    left_rotation: string
    /** 1.19.4+ (13) */
    right_rotation: string
    /** 1.19.4+ (14) */
    billboard_render_constraints: string
    /** 1.19.4+ (15) */
    brightness_override: string
    /** 1.19.4+ (16) */
    view_range: string
    /** 1.19.4+ (17) */
    shadow_radius: string
    /** 1.19.4+ (18) */
    shadow_strength: string
    /** 1.19.4+ (19) */
    width: string
    /** 1.19.4+ (20) */
    height: string
    /** 1.19.4+ (21) */
    glow_color_override: string
    /** 1.19.4+ (22) */
    text: string
    /** 1.19.4+ (23) */
    line_width: string
    /** 1.19.4+ (24) */
    background_color: string
    /** 1.19.4+ (25) */
    text_opacity: string
    /** 1.19.4+ (26) */
    style_flags: string
    /** 1.20.2+ (8) */
    transformation_interpolation_start_delta_ticks: string
    /** 1.20.2+ (9) */
    transformation_interpolation_duration: string
    /** 1.20.2+ (10) */
    pos_rot_interpolation_duration: string
  }
  breeze: {
    /** 1.20.3+ (0) */
    shared_flags: string
    /** 1.20.3+ (1) */
    air_supply: string
    /** 1.20.3+ (2) */
    custom_name: string
    /** 1.20.3+ (3) */
    custom_name_visible: string
    /** 1.20.3+ (4) */
    silent: string
    /** 1.20.3+ (5) */
    no_gravity: string
    /** 1.20.3+ (6) */
    pose: string
    /** 1.20.3+ (7) */
    ticks_frozen: string
    /** 1.20.3+ (8) */
    living_entity_flags: string
    /** 1.20.3+ (9) */
    health: string
    /** 1.20.3+ (10) */
    effect_color: string
    /** 1.20.3+ (11) */
    effect_ambience: string
    /** 1.20.3+ (12) */
    arrow_count: string
    /** 1.20.3+ (13) */
    stinger_count: string
    /** 1.20.3+ (14) */
    sleeping_pos: string
    /** 1.20.3+ (15) */
    mob_flags: string
    /** 1.20.5+ (10) */
    effect_particles: string
  }
  wind_charge: {
    /** 1.20.3+ (0) */
    shared_flags: string
    /** 1.20.3+ (1) */
    air_supply: string
    /** 1.20.3+ (2) */
    custom_name: string
    /** 1.20.3+ (3) */
    custom_name_visible: string
    /** 1.20.3+ (4) */
    silent: string
    /** 1.20.3+ (5) */
    no_gravity: string
    /** 1.20.3+ (6) */
    pose: string
    /** 1.20.3+ (7) */
    ticks_frozen: string
  }
  armadillo: {
    /** 1.20.5+ (0) */
    shared_flags: string
    /** 1.20.5+ (1) */
    air_supply: string
    /** 1.20.5+ (2) */
    custom_name: string
    /** 1.20.5+ (3) */
    custom_name_visible: string
    /** 1.20.5+ (4) */
    silent: string
    /** 1.20.5+ (5) */
    no_gravity: string
    /** 1.20.5+ (6) */
    pose: string
    /** 1.20.5+ (7) */
    ticks_frozen: string
    /** 1.20.5+ (8) */
    living_entity_flags: string
    /** 1.20.5+ (9) */
    health: string
    /** 1.20.5+ (10) */
    effect_particles: string
    /** 1.20.5+ (11) */
    effect_ambience: string
    /** 1.20.5+ (12) */
    arrow_count: string
    /** 1.20.5+ (13) */
    stinger_count: string
    /** 1.20.5+ (14) */
    sleeping_pos: string
    /** 1.20.5+ (15) */
    mob_flags: string
    /** 1.20.5+ (16) */
    baby: string
    /** 1.20.5+ (17) */
    armadillo_state: string
  }
  bogged: {
    /** 1.20.5+ (0) */
    shared_flags: string
    /** 1.20.5+ (1) */
    air_supply: string
    /** 1.20.5+ (2) */
    custom_name: string
    /** 1.20.5+ (3) */
    custom_name_visible: string
    /** 1.20.5+ (4) */
    silent: string
    /** 1.20.5+ (5) */
    no_gravity: string
    /** 1.20.5+ (6) */
    pose: string
    /** 1.20.5+ (7) */
    ticks_frozen: string
    /** 1.20.5+ (8) */
    living_entity_flags: string
    /** 1.20.5+ (9) */
    health: string
    /** 1.20.5+ (10) */
    effect_particles: string
    /** 1.20.5+ (11) */
    effect_ambience: string
    /** 1.20.5+ (12) */
    arrow_count: string
    /** 1.20.5+ (13) */
    stinger_count: string
    /** 1.20.5+ (14) */
    sleeping_pos: string
    /** 1.20.5+ (15) */
    mob_flags: string
    /** 1.20.5+ (16) */
    sheared: string
  }
  breeze_wind_charge: {
    /** 1.20.5+ (0) */
    shared_flags: string
    /** 1.20.5+ (1) */
    air_supply: string
    /** 1.20.5+ (2) */
    custom_name: string
    /** 1.20.5+ (3) */
    custom_name_visible: string
    /** 1.20.5+ (4) */
    silent: string
    /** 1.20.5+ (5) */
    no_gravity: string
    /** 1.20.5+ (6) */
    pose: string
    /** 1.20.5+ (7) */
    ticks_frozen: string
  }
  ominous_item_spawner: {
    /** 1.20.5+ (0) */
    shared_flags: string
    /** 1.20.5+ (1) */
    air_supply: string
    /** 1.20.5+ (2) */
    custom_name: string
    /** 1.20.5+ (3) */
    custom_name_visible: string
    /** 1.20.5+ (4) */
    silent: string
    /** 1.20.5+ (5) */
    no_gravity: string
    /** 1.20.5+ (6) */
    pose: string
    /** 1.20.5+ (7) */
    ticks_frozen: string
    /** 1.20.5+ (8) */
    item: string
  }
}
