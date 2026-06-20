import { CSSProperties } from 'react'
import { PixelartIconsGenerated } from './pixelartIcons.generated'

export default ({
  iconName,
  width = undefined as undefined | number,
  styles = {} as CSSProperties,
  className = undefined as undefined | string,
  onClick = () => {}
}) => {
  if (width !== undefined) styles = { width, height: width, fontSize: width, ...styles }
  iconName = iconName.replace('pixelarticons:', '')

  return (
    <div
      style={{
        ...styles
      }}
      onClick={onClick}
      className={`${`pixelart-icons-font-${iconName}`} ${className ?? ''}`}
    />
  )
}

export const pixelartIcons = new Proxy({} as PixelartIconsGenerated, {
  get(target, prop) {
    return prop as string
  }
})
