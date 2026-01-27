export const appReplacableResources: Array<{
  path: string
  name?: string
  cssVar?: string
  cssVarRepeat?: number
}> = [
  // GUI
  {
    path: '../node_modules/mc-assets/dist/other-textures/latest/gui/title/minecraft.png',
    cssVar: '--title-gui',
  },
  {
    path: '../node_modules/mc-assets/dist/other-textures/1.19/gui/icons.png',
    cssVar: '--gui-icons',
    cssVarRepeat: 2,
  },
  {
    path: '../node_modules/mc-assets/dist/other-textures/latest/gui/widgets.png',
    cssVar: '--widgets-gui-atlas',
  },
  {
    path: '../node_modules/mc-assets/dist/other-textures/latest/gui/bars.png',
    cssVar: '--bars-gui-atlas',
  },
  // container
  {
    path: '../node_modules/mc-assets/dist/other-textures/latest/gui/container/inventory.png',
  },
  {
    path: '../node_modules/mc-assets/dist/other-textures/latest/gui/container/shulker_box.png',
  },
  {
    path: '../node_modules/mc-assets/dist/other-textures/latest/gui/container/generic_54.png',
  },
  {
    name: 'furnace_gui_texture',
    path: '../node_modules/mc-assets/dist/other-textures/1.20.2/gui/container/furnace.png',
  },
  {
    path: '../node_modules/mc-assets/dist/other-textures/latest/gui/container/crafting_table.png',
  },
  {
    path: '../node_modules/mc-assets/dist/other-textures/latest/gui/container/dispenser.png',
  },
  {
    path: '../node_modules/mc-assets/dist/other-textures/latest/gui/container/hopper.png',
  },
  {
    path: '../node_modules/mc-assets/dist/other-textures/latest/gui/container/horse.png',
  },
  {
    path: '../node_modules/mc-assets/dist/other-textures/latest/gui/container/villager2.png',
  },
  {
    path: '../node_modules/mc-assets/dist/other-textures/latest/gui/container/enchanting_table.png',
  },
  {
    path: '../node_modules/mc-assets/dist/other-textures/latest/gui/container/anvil.png',
  },
  {
    path: '../node_modules/mc-assets/dist/other-textures/latest/gui/container/beacon.png',
  },
  {
    path: '../node_modules/mc-assets/dist/other-textures/latest/gui/container/smithing.png',
  },
  {
    path: '../node_modules/mc-assets/dist/other-textures/1.19.4/gui/container/smithing.png',
  },
]
