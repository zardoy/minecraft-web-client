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
]
